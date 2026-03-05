// ─── Connection Detector ───
// Monitors network connectivity with real API ping, not just navigator.onLine.
// In a POS/retail environment, navigator.onLine can lie (connected to LAN
// but no internet). We need to actually ping the API.

import { ref, readonly } from 'vue'
import type { ConnectionStatus } from '@/types/offline'
import { checkApiConnection } from './apiClient'

// ─── Reactive state ───
const _status = ref<ConnectionStatus>('online')
const _latency = ref<number | null>(null)
const _lastCheck = ref<string | null>(null)

/** Current connection status (reactive) */
export const connectionStatus = readonly(_status)

/** Latency to API in ms (reactive) */
export const connectionLatency = readonly(_latency)

/** ISO timestamp of last connectivity check (reactive) */
export const lastConnectionCheck = readonly(_lastCheck)

// ─── Internal state ───
let _intervalId: ReturnType<typeof setInterval> | null = null
let _isChecking = false

// Listeners that get called when status changes
type StatusListener = (status: ConnectionStatus) => void
const _listeners: StatusListener[] = []

/** Register a callback for status changes */
export function onConnectionChange(fn: StatusListener): () => void {
  _listeners.push(fn)
  return () => {
    const idx = _listeners.indexOf(fn)
    if (idx >= 0) _listeners.splice(idx, 1)
  }
}

/** Perform a single connectivity check */
export async function checkConnection(): Promise<ConnectionStatus> {
  if (_isChecking) return _status.value
  _isChecking = true

  try {
    const result = await checkApiConnection()
    const prev = _status.value

    if (result.connected) {
      _latency.value = result.latency
      // Degraded if latency > 5 seconds
      _status.value = (result.latency ?? 0) > 5000 ? 'degraded' : 'online'
    } else {
      _latency.value = null
      _status.value = 'offline'
    }

    _lastCheck.value = new Date().toISOString()

    // Notify listeners on change
    if (prev !== _status.value) {
      console.log(`[Connection] ${prev} → ${_status.value}`)
      for (const fn of _listeners) {
        try {
          fn(_status.value)
        } catch (e) {
          console.error('[Connection] Listener error:', e)
        }
      }
    }

    return _status.value
  } catch {
    _status.value = 'offline'
    _latency.value = null
    return 'offline'
  } finally {
    _isChecking = false
  }
}

/**
 * Start periodic connectivity monitoring.
 * - Online: check every 30s
 * - Offline: check every 10s (eager reconnection)
 */
export function startConnectionMonitor(): void {
  if (_intervalId) return

  // Initial check
  checkConnection()

  // Also listen to browser events as a fast hint
  window.addEventListener('online', () => {
    console.log('[Connection] Browser reports online — verifying…')
    checkConnection()
  })
  window.addEventListener('offline', () => {
    console.log('[Connection] Browser reports offline')
    _status.value = 'offline'
    _latency.value = null
    for (const fn of _listeners) {
      try { fn('offline') } catch { /* noop */ }
    }
  })

  // Periodic polling (adaptive interval)
  const tick = () => {
    checkConnection()
    // Reschedule with adaptive delay
    const delay = _status.value === 'offline' ? 10_000 : 30_000
    _intervalId = setTimeout(tick, delay) as unknown as ReturnType<typeof setInterval>
  }
  _intervalId = setTimeout(tick, 10_000) as unknown as ReturnType<typeof setInterval>
}

/** Stop the monitor */
export function stopConnectionMonitor(): void {
  if (_intervalId) {
    clearTimeout(_intervalId as unknown as number)
    _intervalId = null
  }
}

/** Force-set an offline status (for testing) */
export function forceOffline(): void {
  _status.value = 'offline'
  _latency.value = null
}

/** Is the app currently able to reach the API? */
export function isOnline(): boolean {
  return _status.value === 'online' || _status.value === 'degraded'
}
