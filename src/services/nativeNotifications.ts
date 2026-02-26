// ─── Native Notifications Service ───
// Uses @tauri-apps/plugin-notification for system-level notifications.
// Includes a polling mechanism to detect new orders from the backend.

import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification'

// ═══════════════════════════════════════
//  PERMISSION HANDLING
// ═══════════════════════════════════════

let _permissionGranted: boolean | null = null

/**
 * Ensure we have notification permissions. Requests on first call.
 * Returns `true` if notifications are allowed.
 */
export async function ensurePermission(): Promise<boolean> {
  if (_permissionGranted !== null) return _permissionGranted

  try {
    let granted = await isPermissionGranted()

    if (!granted) {
      const result = await requestPermission()
      granted = result === 'granted'
    }

    _permissionGranted = granted
    return granted
  } catch {
    _permissionGranted = false
    return false
  }
}

// ═══════════════════════════════════════
//  NOTIFICATION HELPERS
// ═══════════════════════════════════════

/**
 * Show a native Windows notification.
 * Silently returns false if permission denied.
 */
export async function showNotification(
  title: string,
  body: string,
): Promise<boolean> {
  const granted = await ensurePermission()
  if (!granted) return false

  try {
    sendNotification({ title, body })
    return true
  } catch {
    return false
  }
}

/**
 * Convenience: new order notification.
 */
export function notifyNewOrder(orderId: number, customerName: string): Promise<boolean> {
  return showNotification(
    '🛒 Nuevo pedido',
    `Pedido #${orderId} de ${customerName}`,
  )
}

/**
 * Convenience: order status change notification.
 */
export function notifyStatusChange(
  orderId: number,
  newStatus: string,
): Promise<boolean> {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    payment_pending: 'Pago pendiente',
    paid: 'Pagado',
    shipped: 'Enviado',
    cancelled: 'Cancelado',
    archived: 'Archivado',
  }
  return showNotification(
    '📦 Cambio de estado',
    `Pedido #${orderId} → ${labels[newStatus] || newStatus}`,
  )
}

/**
 * Convenience: system alert notification.
 */
export function notifyAlert(message: string): Promise<boolean> {
  return showNotification('⚠️ Alerta del sistema', message)
}

// ═══════════════════════════════════════
//  ORDER POLLING
// ═══════════════════════════════════════

let _pollingTimer: ReturnType<typeof setInterval> | null = null
let _lastKnownOrderId = 0

/**
 * Start polling the backend for new orders.
 * Calls `fetchLatestOrderId` every `intervalMs` and fires a notification
 * if a new order is detected.
 *
 * @param fetchLatestOrderId - async function returning the latest order ID (or 0)
 * @param intervalMs - polling interval in ms (default: 2 minutes)
 */
export function startOrderPolling(
  fetchLatestOrderId: () => Promise<number>,
  intervalMs = 120_000,
): void {
  stopOrderPolling()

  // Seed with the current latest so we don't notify on startup
  fetchLatestOrderId()
    .then(id => { _lastKnownOrderId = id })
    .catch(() => {})

  _pollingTimer = setInterval(async () => {
    try {
      const latestId = await fetchLatestOrderId()
      if (latestId > _lastKnownOrderId && _lastKnownOrderId > 0) {
        const count = latestId - _lastKnownOrderId
        await showNotification(
          '🛒 Nuevos pedidos',
          count === 1
            ? `Se recibió 1 nuevo pedido (#${latestId})`
            : `Se recibieron ${count} nuevos pedidos`,
        )
      }
      _lastKnownOrderId = latestId
    } catch {
      // Silently ignore polling errors
    }
  }, intervalMs)
}

/**
 * Stop order polling.
 */
export function stopOrderPolling(): void {
  if (_pollingTimer) {
    clearInterval(_pollingTimer)
    _pollingTimer = null
  }
}
