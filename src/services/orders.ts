// ─── Orders Service ───
// API functions for order management.
// Mirrors backend/orders/views.py endpoints.

import apiClient from './apiClient'
import type {
  Order,
  OrderFilters,
  OrderStatsResponse,
  CreateOrderData,
  UpdateOrderItemData,
} from '@/types/orders'
import type { ApiPaginatedResponse } from '@/types/api'

/**
 * GET /api/orders/
 * Admin order list with filters. Returns paginated or plain array depending on backend config.
 */
export async function getAdminOrders(
  filters: OrderFilters = {},
): Promise<{ orders: Order[]; count: number }> {
  const params: Record<string, unknown> = {
    include_items: true,
    exclude_temporary: true,
    ...filters,
  }

  // Remove empty/undefined values
  Object.keys(params).forEach((k) => {
    if (params[k] === '' || params[k] === undefined) delete params[k]
  })

  const { data } = await apiClient.get('/orders/', { params })

  // Handle both paginated and non-paginated responses
  if (Array.isArray(data)) {
    return { orders: data, count: data.length }
  }

  const paginated = data as ApiPaginatedResponse<Order>
  return {
    orders: paginated.results ?? [],
    count: paginated.count ?? 0,
  }
}

/**
 * GET /api/orders/{id}/
 */
export async function getOrderDetail(id: number | string): Promise<Order> {
  const { data } = await apiClient.get<Order>(`/orders/${id}/`)
  return data
}

/**
 * GET /api/orders/?status=pending (convenience)
 */
export async function getPendingOrders(): Promise<Order[]> {
  const { orders } = await getAdminOrders({
    status: 'pending',
    exclude_temporary: true,
  })
  return orders
}

/**
 * GET /api/orders/stats/
 * Returns order count by status.
 */
export async function getOrderStatusStats(
  filters: Partial<OrderFilters> = {},
): Promise<OrderStatsResponse> {
  const params: Record<string, unknown> = {
    count_by_status: true,
    ...filters,
  }
  Object.keys(params).forEach((k) => {
    if (params[k] === '' || params[k] === undefined) delete params[k]
  })

  const { data } = await apiClient.get<OrderStatsResponse>('/orders/stats/', {
    params,
  })
  return data
}

/**
 * PATCH /api/orders/{id}/update_status/
 */
export async function updateOrderStatus(
  id: number | string,
  status: string,
): Promise<Order> {
  const { data } = await apiClient.patch<Order>(
    `/orders/${id}/update_status/`,
    { status },
  )
  return data
}

/**
 * POST /api/orders/
 */
export async function createOrder(payload: CreateOrderData): Promise<Order> {
  const { data } = await apiClient.post<Order>('/orders/', payload)
  return data
}

/**
 * PUT /api/orders/{id}/
 */
export async function updateOrder(
  id: number | string,
  payload: Partial<Order>,
): Promise<Order> {
  const { data } = await apiClient.put<Order>(`/orders/${id}/`, payload)
  return data
}

/**
 * DELETE /api/orders/{id}/
 */
export async function deleteOrder(id: number | string): Promise<void> {
  await apiClient.delete(`/orders/${id}/`)
}

/**
 * POST /api/orders/{id}/cancel/
 */
export async function cancelOrder(
  id: number | string,
): Promise<{ status: string }> {
  const { data } = await apiClient.post<{ status: string }>(
    `/orders/${id}/cancel/`,
  )
  return data
}

/**
 * POST /api/orders/{id}/archive/
 */
export async function archiveOrder(
  id: number | string,
): Promise<{ status: string }> {
  const { data } = await apiClient.post<{ status: string }>(
    `/orders/${id}/archive/`,
  )
  return data
}

/**
 * POST /api/orders/{id}/unarchive/
 */
export async function unarchiveOrder(
  id: number | string,
  status?: string,
): Promise<{ status: string }> {
  const { data } = await apiClient.post<{ status: string }>(
    `/orders/${id}/unarchive/`,
    status ? { status } : {},
  )
  return data
}

/**
 * PATCH /api/orders/{id}/items/
 */
export async function updateOrderItems(
  id: number | string,
  items: UpdateOrderItemData[],
): Promise<Order> {
  const { data } = await apiClient.patch<Order>(`/orders/${id}/items/`, {
    items,
  })
  return data
}

/**
 * POST /api/orders/{id}/notify_shipping/
 */
export async function notifyShipping(
  id: number | string,
): Promise<{ status: string }> {
  const { data } = await apiClient.post<{ status: string }>(
    `/orders/${id}/notify_shipping/`,
  )
  return data
}

/**
 * POST /api/orders/run_system_update/
 */
export async function runSystemUpdate(
  options: {
    skip_dollar?: boolean
    skip_carts?: boolean
    minutes?: number
    dry_run?: boolean
  } = {},
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post<Record<string, unknown>>(
    '/orders/run_system_update/',
    options,
  )
  return data
}
