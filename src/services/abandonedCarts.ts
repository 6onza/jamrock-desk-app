// ─── Abandoned Carts Service ───
// API functions for abandoned cart management.
// Mirrors backend/orders/abandoned_carts/views.py endpoints.

import apiClient from './apiClient'
import type {
  AbandonedCart,
  AbandonedCartStatistics,
  AbandonedCartFilters,
} from '@/types/orders'
import type { ApiPaginatedResponse } from '@/types/api'

/**
 * GET /api/orders/abandoned-carts/
 */
export async function getAbandonedCarts(
  filters: AbandonedCartFilters = {},
): Promise<AbandonedCart[]> {
  const params: Record<string, unknown> = { ...filters }
  Object.keys(params).forEach((k) => {
    if (params[k] === '' || params[k] === undefined) delete params[k]
  })

  const { data } = await apiClient.get('/orders/abandoned-carts/', { params })

  if (Array.isArray(data)) return data
  return (data as ApiPaginatedResponse<AbandonedCart>).results ?? []
}

/**
 * GET /api/orders/abandoned-carts/statistics/
 */
export async function getAbandonedCartStatistics(
  period = 'month',
  startDate?: string,
  endDate?: string,
): Promise<AbandonedCartStatistics> {
  const params: Record<string, string> = { period }
  if (startDate) params.start_date = startDate
  if (endDate) params.end_date = endDate

  const { data } = await apiClient.get<AbandonedCartStatistics>(
    '/orders/abandoned-carts/statistics/',
    { params },
  )
  return data
}

/**
 * POST /api/orders/abandoned-carts/identify/
 */
export async function identifyAbandonedCarts(): Promise<{
  marked_count: number
  carts: AbandonedCart[]
  message: string
}> {
  const { data } = await apiClient.post('/orders/abandoned-carts/identify/')
  return data
}

/**
 * POST /api/orders/abandoned-carts/{id}/recover/
 */
export async function recoverAbandonedCart(
  id: number | string,
): Promise<{ cart: AbandonedCart; message: string }> {
  const { data } = await apiClient.post(
    `/orders/abandoned-carts/${id}/recover/`,
  )
  return data
}

/**
 * POST /api/orders/abandoned-carts/{id}/convert_to_order/
 */
export async function convertAbandonedCartToOrder(
  id: number | string,
): Promise<{ cart: AbandonedCart; order: Record<string, unknown>; message: string }> {
  const { data } = await apiClient.post(
    `/orders/abandoned-carts/${id}/convert_to_order/`,
  )
  return data
}

/**
 * POST /api/orders/abandoned-carts/migrate_from_orders/
 */
export async function migrateFromOrders(): Promise<{
  migrated_count: number
  message: string
}> {
  const { data } = await apiClient.post(
    '/orders/abandoned-carts/migrate_from_orders/',
  )
  return data
}
