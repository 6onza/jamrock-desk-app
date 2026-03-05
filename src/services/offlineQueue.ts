// ─── Offline Queue Manager ───
// Creates offline operations with proper UUIDs & timestamps,
// enqueues them, and provides a facade for the rest of the app.

import type {
  OfflineOperation,
} from '@/types/offline'
import type { CreateOrderData } from '@/types/orders'
import {
  enqueueOperation,
  getQueue,
  getQueueStats,
  getPendingOperations,
  pruneCompleted,
} from './offlineDb'

/**
 * Create & enqueue an offline order.
 * Returns the client operation ID so the UI can track it.
 */
export async function queueOfflineOrder(
  orderData: CreateOrderData & { offline_total?: number; offline_subtotal?: number },
): Promise<string> {
  const op: OfflineOperation = {
    clientOperationId: crypto.randomUUID(),
    operationType: 'create_order',
    clientTimestamp: new Date().toISOString(),
    payload: orderData as unknown as Record<string, unknown>,
    status: 'pending',
    retryCount: 0,
    lastError: '',
    serverId: null,
    conflictDetails: null,
  }

  await enqueueOperation(op)
  console.log(`[Queue] Orden offline encolada: ${op.clientOperationId}`)
  return op.clientOperationId
}

/**
 * Create & enqueue an offline order status update.
 */
export async function queueOfflineStatusUpdate(
  orderId: number,
  newStatus: string,
): Promise<string> {
  const op: OfflineOperation = {
    clientOperationId: crypto.randomUUID(),
    operationType: 'update_order',
    clientTimestamp: new Date().toISOString(),
    payload: { order_id: orderId, status: newStatus },
    status: 'pending',
    retryCount: 0,
    lastError: '',
    serverId: null,
    conflictDetails: null,
  }

  await enqueueOperation(op)
  console.log(`[Queue] Status update encolado: Order #${orderId} → ${newStatus}`)
  return op.clientOperationId
}

/**
 * Create & enqueue an offline stock update.
 */
export async function queueOfflineStockUpdate(
  productId: number,
  newStock: number,
  expectedVersion?: string,
): Promise<string> {
  const op: OfflineOperation = {
    clientOperationId: crypto.randomUUID(),
    operationType: 'update_stock',
    clientTimestamp: new Date().toISOString(),
    payload: {
      product_id: productId,
      stock: newStock,
      ...(expectedVersion ? { expected_version: expectedVersion } : {}),
    },
    status: 'pending',
    retryCount: 0,
    lastError: '',
    serverId: null,
    conflictDetails: null,
  }

  await enqueueOperation(op)
  console.log(`[Queue] Stock update encolado: Product #${productId} → ${newStock}`)
  return op.clientOperationId
}

/**
 * Create & enqueue an offline payment registration.
 */
export async function queueOfflinePayment(
  orderId: number,
  amount: number,
  paymentMethod = 'cash',
): Promise<string> {
  const op: OfflineOperation = {
    clientOperationId: crypto.randomUUID(),
    operationType: 'create_payment',
    clientTimestamp: new Date().toISOString(),
    payload: {
      order_id: orderId,
      amount,
      payment_method: paymentMethod,
    },
    status: 'pending',
    retryCount: 0,
    lastError: '',
    serverId: null,
    conflictDetails: null,
  }

  await enqueueOperation(op)
  console.log(`[Queue] Pago offline encolado: Order #${orderId}`)
  return op.clientOperationId
}

// Re-export useful functions from offlineDb
export { getQueue, getQueueStats, getPendingOperations, pruneCompleted }
