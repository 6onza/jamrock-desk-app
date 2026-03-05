// ─── Offline Database Service ───
// Persistent local storage using Tauri plugin-store for:
// - Offline operation queue (survives app restarts / power cuts)
// - Product catalog cache (for offline product search)
// - Sync metadata
//
// Architecture: Tauri plugin-store writes to a JSON file on disk,
// which is durable across crashes. No IndexedDB needed in Tauri.

import { load, type Store } from '@tauri-apps/plugin-store'
import type {
  OfflineOperation,
  OfflineProductCache,
  OfflineHttpRequest,
  SyncPullProduct,
  SyncPullCategory,
  SyncPullResponse,
} from '@/types/offline'

// ─── Store files (separate for safety: a corrupt queue won't kill the cache) ───
const QUEUE_STORE_FILE = 'offline-queue.json'
const CACHE_STORE_FILE = 'offline-cache.json'
const SYNC_META_FILE = 'sync-meta.json'
const REQUEST_QUEUE_FILE = 'offline-requests.json'

// ─── Store keys ───
const QUEUE_KEY = 'operations'
const CACHE_KEY = 'product_cache'
const DEVICE_ID_KEY = 'device_id'
const LAST_SYNC_KEY = 'last_sync_timestamp'
const REQUEST_QUEUE_KEY = 'requests'

// ─── Lazy singletons ───
let _queueStore: Store | null = null
let _cacheStore: Store | null = null
let _metaStore: Store | null = null
let _requestStore: Store | null = null

async function queueStore(): Promise<Store> {
  if (!_queueStore) _queueStore = await load(QUEUE_STORE_FILE)
  return _queueStore
}

async function cacheStore(): Promise<Store> {
  if (!_cacheStore) _cacheStore = await load(CACHE_STORE_FILE)
  return _cacheStore
}

async function metaStore(): Promise<Store> {
  if (!_metaStore) _metaStore = await load(SYNC_META_FILE)
  return _metaStore
}

async function requestStore(): Promise<Store> {
  if (!_requestStore) _requestStore = await load(REQUEST_QUEUE_FILE)
  return _requestStore
}

// ═══════════════════════════════════════
//  DEVICE ID (persistent across sessions)
// ═══════════════════════════════════════

/** Get or create a unique device ID for this installation */
export async function getDeviceId(): Promise<string> {
  const store = await metaStore()
  let id = await store.get<string>(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    await store.set(DEVICE_ID_KEY, id)
    await store.save()
  }
  return id
}

// ═══════════════════════════════════════
//  OPERATION QUEUE
// ═══════════════════════════════════════

/** Retrieve all operations from the queue */
export async function getQueue(): Promise<OfflineOperation[]> {
  const store = await queueStore()
  const raw = await store.get<OfflineOperation[]>(QUEUE_KEY)
  return raw ?? []
}

/** Write the full queue to disk (atomic save) */
async function saveQueue(queue: OfflineOperation[]): Promise<void> {
  const store = await queueStore()
  await store.set(QUEUE_KEY, queue)
  await store.save() // flush to disk immediately — power-safe
}

/** Append a new operation to the queue */
export async function enqueueOperation(op: OfflineOperation): Promise<void> {
  const queue = await getQueue()
  queue.push(op)
  await saveQueue(queue)
}

/** Get operations that need syncing (pending or failed with retries < max) */
export async function getPendingOperations(maxRetries = 5): Promise<OfflineOperation[]> {
  const queue = await getQueue()
  return queue.filter(
    (op) =>
      op.status === 'pending' ||
      (op.status === 'failed' && op.retryCount < maxRetries),
  )
}

/** Update an operation in the queue by clientOperationId */
export async function updateOperation(
  clientOperationId: string,
  updates: Partial<OfflineOperation>,
): Promise<void> {
  const queue = await getQueue()
  const idx = queue.findIndex((op) => op.clientOperationId === clientOperationId)
  if (idx >= 0) {
    queue[idx] = { ...queue[idx], ...updates }
    await saveQueue(queue)
  }
}

/** Remove successfully synced operations older than `hoursToKeep` */
export async function pruneCompleted(hoursToKeep = 24): Promise<number> {
  const queue = await getQueue()
  const cutoff = new Date(Date.now() - hoursToKeep * 60 * 60 * 1000).toISOString()
  const before = queue.length
  const filtered = queue.filter((op) => {
    if (op.status === 'synced' && op.clientTimestamp < cutoff) return false
    return true
  })
  await saveQueue(filtered)
  return before - filtered.length
}

/** Get counts by status */
export async function getQueueStats(): Promise<{
  pending: number
  syncing: number
  synced: number
  failed: number
  conflict: number
  total: number
}> {
  const queue = await getQueue()
  return {
    pending: queue.filter((o) => o.status === 'pending').length,
    syncing: queue.filter((o) => o.status === 'syncing').length,
    synced: queue.filter((o) => o.status === 'synced').length,
    failed: queue.filter((o) => o.status === 'failed').length,
    conflict: queue.filter((o) => o.status === 'conflict').length,
    total: queue.length,
  }
}

/** Clear entire queue (for testing / reset) */
export async function clearQueue(): Promise<void> {
  await saveQueue([])
}

// ═══════════════════════════════════════
//  PRODUCT CACHE (for offline search)
// ═══════════════════════════════════════

const DEFAULT_CACHE: OfflineProductCache = {
  products: [],
  categories: [],
  dollarRate: null,
  lastPullTimestamp: null,
  version: 1,
}

/** Get the local product cache */
export async function getProductCache(): Promise<OfflineProductCache> {
  const store = await cacheStore()
  const raw = await store.get<OfflineProductCache>(CACHE_KEY)
  return raw ?? { ...DEFAULT_CACHE }
}

/** Save synced products into the local cache */
export async function updateProductCache(pullData: SyncPullResponse): Promise<void> {
  const store = await cacheStore()
  const existing = await getProductCache()

  // Merge products: update existing, add new
  if (pullData.products) {
    const productMap = new Map(existing.products.map((p) => [p.id, p]))
    for (const p of pullData.products) {
      productMap.set(p.id, p as SyncPullProduct)
    }
    existing.products = Array.from(productMap.values())
  }

  // Replace categories entirely (they're small)
  if (pullData.categories) {
    existing.categories = pullData.categories as SyncPullCategory[]
  }

  // Dollar rate
  if (pullData.dollar_rate !== undefined) {
    existing.dollarRate = pullData.dollar_rate
  }

  existing.lastPullTimestamp = pullData.server_timestamp
  existing.version++

  await store.set(CACHE_KEY, existing)
  await store.save()
}

/** Search products in the local cache (for offline NewSalePage) */
export async function searchCachedProducts(
  query: string,
  limit = 10,
): Promise<SyncPullProduct[]> {
  const cache = await getProductCache()
  if (!query || query.length < 2) return []

  const q = query.toLowerCase()
  return cache.products
    .filter(
      (p) =>
        p.is_available &&
        p.stock > 0 &&
        (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)),
    )
    .slice(0, limit)
}

/** Get a single cached product by ID */
export async function getCachedProduct(id: number): Promise<SyncPullProduct | null> {
  const cache = await getProductCache()
  return cache.products.find((p) => p.id === id) ?? null
}

/** Get all cached categories */
export async function getCachedCategories(): Promise<SyncPullCategory[]> {
  const cache = await getProductCache()
  return cache.categories
}

// ═══════════════════════════════════════
//  SYNC METADATA
// ═══════════════════════════════════════

/** Get the last successful sync timestamp */
export async function getLastSyncTimestamp(): Promise<string | null> {
  const store = await metaStore()
  return (await store.get<string>(LAST_SYNC_KEY)) ?? null
}

/** Set the last successful sync timestamp */
export async function setLastSyncTimestamp(ts: string): Promise<void> {
  const store = await metaStore()
  await store.set(LAST_SYNC_KEY, ts)
  await store.save()
}

// ═══════════════════════════════════════
//  GENERIC HTTP REQUEST QUEUE
// ═══════════════════════════════════════

/** Get all queued HTTP requests */
export async function getRequestQueue(): Promise<OfflineHttpRequest[]> {
  const store = await requestStore()
  const raw = await store.get<OfflineHttpRequest[]>(REQUEST_QUEUE_KEY)
  return raw ?? []
}

/** Save the full request queue to disk */
async function saveRequestQueue(queue: OfflineHttpRequest[]): Promise<void> {
  const store = await requestStore()
  await store.set(REQUEST_QUEUE_KEY, queue)
  await store.save()
}

/** Add a failed HTTP request to the queue */
export async function enqueueRequest(req: OfflineHttpRequest): Promise<void> {
  const queue = await getRequestQueue()
  queue.push(req)
  await saveRequestQueue(queue)
}

/** Get pending requests (pending or failed with retries left) */
export async function getPendingRequests(maxRetries = 5): Promise<OfflineHttpRequest[]> {
  const queue = await getRequestQueue()
  return queue.filter(
    (r) =>
      r.status === 'pending' ||
      (r.status === 'failed' && r.retryCount < maxRetries),
  )
}

/** Update a queued request by ID */
export async function updateRequest(
  id: string,
  updates: Partial<OfflineHttpRequest>,
): Promise<void> {
  const queue = await getRequestQueue()
  const idx = queue.findIndex((r) => r.id === id)
  if (idx >= 0) {
    queue[idx] = { ...queue[idx], ...updates }
    await saveRequestQueue(queue)
  }
}

/** Remove replayed requests older than cutoff */
export async function pruneReplayedRequests(hoursToKeep = 24): Promise<number> {
  const queue = await getRequestQueue()
  const cutoff = new Date(Date.now() - hoursToKeep * 60 * 60 * 1000).toISOString()
  const before = queue.length
  const filtered = queue.filter((r) => {
    if (r.status === 'replayed' && r.createdAt < cutoff) return false
    return true
  })
  await saveRequestQueue(filtered)
  return before - filtered.length
}

/** Get request queue stats */
export async function getRequestQueueStats(): Promise<{
  pending: number
  failed: number
  total: number
}> {
  const queue = await getRequestQueue()
  return {
    pending: queue.filter((r) => r.status === 'pending').length,
    failed: queue.filter((r) => r.status === 'failed').length,
    total: queue.length,
  }
}

/** Clear the entire request queue */
export async function clearRequestQueue(): Promise<void> {
  await saveRequestQueue([])
}
