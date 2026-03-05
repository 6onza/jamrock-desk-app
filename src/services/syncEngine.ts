// ─── Sync Engine ───
// Orchestrates the push/pull synchronization cycle.
//
// FLOW:
// 1. Connection detector reports "online"
// 2. Engine grabs pending operations from the queue
// 3. Sends them as a batch to POST /api/orders/sync/push/
// 4. Updates each operation's status based on server response
// 5. Pulls updated server data (products, dollar rate, etc.)
// 6. Updates local cache
//
// The engine runs automatically when connection is restored,
// and can also be triggered manually.

import { ref, readonly } from 'vue'
import apiClient from './apiClient'
import {
  getDeviceId,
  getPendingOperations,
  updateOperation,
  updateProductCache,
  getLastSyncTimestamp,
  setLastSyncTimestamp,
  getQueueStats,
  pruneCompleted,
  getPendingRequests,
  updateRequest,
  pruneReplayedRequests,
  getRequestQueueStats,
} from './offlineDb'
import {
  connectionStatus,
  onConnectionChange,
  isOnline,
} from './connectionDetector'
import type {
  SyncPushResponse,
  SyncPullResponse,
  SyncState,
} from '@/types/offline'

// ─── Reactive sync state ───
const _syncState = ref<SyncState>({
  connectionStatus: 'online',
  isSyncing: false,
  pendingCount: 0,
  failedCount: 0,
  conflictCount: 0,
  lastSyncTimestamp: null,
  latency: null,
})

export const syncState = readonly(_syncState)

// ─── Sync lock ───
let _isSyncing = false

// ─── Notification callbacks ───
type SyncEventListener = (event: {
  type: 'sync_start' | 'sync_complete' | 'sync_error' | 'operation_synced' | 'operation_failed'
  data?: Record<string, unknown>
}) => void
const _eventListeners: SyncEventListener[] = []

export function onSyncEvent(fn: SyncEventListener): () => void {
  _eventListeners.push(fn)
  return () => {
    const idx = _eventListeners.indexOf(fn)
    if (idx >= 0) _eventListeners.splice(idx, 1)
  }
}

type SyncEventType = 'sync_start' | 'sync_complete' | 'sync_error' | 'operation_synced' | 'operation_failed'

function emit(type: SyncEventType, data?: Record<string, unknown>) {
  for (const fn of _eventListeners) {
    try { fn({ type, data }) } catch { /* noop */ }
  }
}

// ═══════════════════════════════════════
//  PUSH: Send local operations to server
// ═══════════════════════════════════════

async function pushOperations(): Promise<{ pushed: number; success: number }> {
  const pending = await getPendingOperations()
  if (pending.length === 0) return { pushed: 0, success: 0 }

  const deviceId = await getDeviceId()

  // Mark all as syncing
  for (const op of pending) {
    await updateOperation(op.clientOperationId, { status: 'syncing' })
  }

  // Build batch payload
  const batchPayload = {
    device_id: deviceId,
    operations: pending.map((op) => ({
      client_operation_id: op.clientOperationId,
      operation_type: op.operationType,
      client_timestamp: op.clientTimestamp,
      payload: op.payload,
    })),
    client_sync_timestamp: new Date().toISOString(),
  }

  console.log(`[Sync] Pushing ${pending.length} operations…`)

  const { data } = await apiClient.post<SyncPushResponse>(
    '/orders/sync/push/',
    batchPayload,
  )

  // Process results
  let successCount = 0
  for (const result of data.results) {
    const updates: Partial<typeof pending[0]> = {}

    switch (result.status) {
      case 'success':
      case 'duplicate':
        updates.status = 'synced'
        updates.serverId = result.serverId ?? null
        updates.lastError = ''
        successCount++
        emit('operation_synced', {
          clientOperationId: result.clientOperationId,
          serverId: result.serverId,
        })
        break

      case 'conflict':
        updates.status = 'conflict'
        updates.conflictDetails = result.conflictDetails ?? null
        updates.lastError = result.error
        emit('operation_failed', {
          clientOperationId: result.clientOperationId,
          error: result.error,
          isConflict: true,
        })
        break

      case 'failed':
        updates.status = 'failed'
        updates.lastError = result.error
        // Increment retry count
        const op = pending.find((o) => o.clientOperationId === result.clientOperationId)
        if (op) updates.retryCount = op.retryCount + 1
        emit('operation_failed', {
          clientOperationId: result.clientOperationId,
          error: result.error,
          isConflict: false,
        })
        break
    }

    await updateOperation(result.clientOperationId, updates)
  }

  console.log(
    `[Sync] Push complete: ${successCount}/${pending.length} succeeded`,
  )
  return { pushed: pending.length, success: successCount }
}

// ═══════════════════════════════════════
//  PULL: Get updated data from server
// ═══════════════════════════════════════

async function pullData(): Promise<void> {
  const deviceId = await getDeviceId()
  const lastSync = await getLastSyncTimestamp()

  console.log(`[Sync] Pulling data since ${lastSync ?? 'beginning'}…`)

  const { data } = await apiClient.post<SyncPullResponse>(
    '/orders/sync/pull/',
    {
      device_id: deviceId,
      last_sync_timestamp: lastSync,
      entity_types: ['products', 'categories', 'dollar_rate'],
    },
  )

  // Update local cache
  await updateProductCache(data)
  await setLastSyncTimestamp(data.server_timestamp)

  const productCount = data.products?.length ?? 0
  const categoryCount = data.categories?.length ?? 0
  console.log(
    `[Sync] Pull complete: ${productCount} products, ${categoryCount} categories`,
  )
}

// ═══════════════════════════════════════
//  REPLAY: Re-send queued HTTP requests
// ═══════════════════════════════════════

/**
 * Replay generic HTTP requests that were queued while offline.
 * These are raw API calls (PATCH /products/42/, POST /orders/, etc.)
 * that failed with Network Error and were saved for later.
 */
async function replayRequests(): Promise<{ replayed: number; success: number }> {
  const pending = await getPendingRequests()
  if (pending.length === 0) return { replayed: 0, success: 0 }

  console.log(`[Sync] Replaying ${pending.length} queued HTTP requests…`)
  let successCount = 0

  for (const req of pending) {
    await updateRequest(req.id, { status: 'replaying' })

    try {
      // Replay the exact same request
      await apiClient.request({
        method: req.method,
        url: req.url,
        data: req.data,
      })

      await updateRequest(req.id, { status: 'replayed', lastError: '' })
      successCount++

      emit('operation_synced', {
        requestId: req.id,
        label: req.label,
      })

      console.log(`[Sync] ✓ Replayed: ${req.label} (${req.id})`)
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      // Check if this was re-queued because we're offline again
      const isOfflineAgain =
        errMsg.includes('Network Error') ||
        (error as Record<string, unknown>)?.isOfflineQueued === true

      if (isOfflineAgain) {
        // Stop replaying — we lost connection again
        await updateRequest(req.id, { status: 'pending' })
        console.log('[Sync] Lost connection during replay, stopping…')
        break
      }

      // Actual server error — increment retry count
      await updateRequest(req.id, {
        status: 'failed',
        retryCount: req.retryCount + 1,
        lastError: errMsg,
      })

      emit('operation_failed', {
        requestId: req.id,
        label: req.label,
        error: errMsg,
        isConflict: false,
      })

      console.warn(`[Sync] ✗ Replay failed: ${req.label} — ${errMsg}`)
    }
  }

  console.log(`[Sync] Replay complete: ${successCount}/${pending.length} succeeded`)
  return { replayed: pending.length, success: successCount }
}

// ═══════════════════════════════════════
//  FULL SYNC CYCLE
// ═══════════════════════════════════════

/**
 * Run a complete sync cycle: push pending → pull updates.
 * Safe to call multiple times — uses a lock to prevent concurrent runs.
 */
export async function runSync(): Promise<void> {
  if (_isSyncing) {
    console.log('[Sync] Already syncing, skipping…')
    return
  }
  if (!isOnline()) {
    console.log('[Sync] Offline, skipping sync')
    return
  }

  _isSyncing = true
  _syncState.value = { ..._syncState.value, isSyncing: true }
  emit('sync_start')

  try {
    // 1. Push typed operations first (orders, stock, payments — idempotent via SyncLog)
    await pushOperations()

    // 2. Replay generic HTTP requests (product edits, category changes, etc.)
    await replayRequests()

    // 3. Pull updated catalog from server
    await pullData()

    // 4. Clean up old synced/replayed operations
    await pruneCompleted(24)
    await pruneReplayedRequests(24)

    // Update state
    const stats = await getQueueStats()
    const reqStats = await getRequestQueueStats()
    _syncState.value = {
      ..._syncState.value,
      isSyncing: false,
      pendingCount: stats.pending + reqStats.pending,
      failedCount: stats.failed + reqStats.failed,
      conflictCount: stats.conflict,
      lastSyncTimestamp: new Date().toISOString(),
      connectionStatus: connectionStatus.value,
    }

    emit('sync_complete', {
      pending: stats.pending,
      failed: stats.failed,
      conflict: stats.conflict,
    })

    console.log('[Sync] Full cycle complete')
  } catch (error) {
    console.error('[Sync] Cycle failed:', error)
    _syncState.value = { ..._syncState.value, isSyncing: false }
    emit('sync_error', { error: String(error) })
  } finally {
    _isSyncing = false
  }
}

/**
 * Refresh the sync state counts (without running a sync).
 */
export async function refreshSyncState(): Promise<void> {
  const stats = await getQueueStats()
  const reqStats = await getRequestQueueStats()
  const lastTs = await getLastSyncTimestamp()
  _syncState.value = {
    ..._syncState.value,
    pendingCount: stats.pending + reqStats.pending,
    failedCount: stats.failed + reqStats.failed,
    conflictCount: stats.conflict,
    lastSyncTimestamp: lastTs,
    connectionStatus: connectionStatus.value,
  }
}

// ═══════════════════════════════════════
//  AUTO-SYNC ON RECONNECTION
// ═══════════════════════════════════════

let _autoSyncEnabled = false

/**
 * Initialize the sync engine:
 * - Starts listening for connection changes
 * - Auto-syncs when connection is restored
 * - Runs initial sync/pull if online
 */
export async function initSyncEngine(): Promise<void> {
  if (_autoSyncEnabled) return
  _autoSyncEnabled = true

  // Listen for connection changes
  onConnectionChange(async (status) => {
    _syncState.value = { ..._syncState.value, connectionStatus: status }

    if (status === 'online') {
      console.log('[Sync] Connection restored — starting auto-sync…')
      // Small delay to let the connection stabilize
      setTimeout(() => runSync(), 2000)
    }
  })

  // Initial state refresh
  await refreshSyncState()

  // If we're online, run initial sync to push any pending ops
  // and pull fresh product data
  if (isOnline()) {
    // Defer to not block app startup
    setTimeout(() => runSync(), 5000)
  }

  console.log('[Sync] Engine initialized')
}
