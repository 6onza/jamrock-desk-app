// ─── Payments Service ───
// API functions for payments, dollar rates, and distribution centers.
// Mirrors backend/payments/views.py endpoints.

import apiClient from './apiClient'
import type { DollarRate, DistributionCenter } from '@/types/orders'

// ═══════════════════════════════════════
//  PAYMENT OPERATIONS
// ═══════════════════════════════════════

/**
 * POST /api/payments/create/
 */
export async function createPayment(
  orderId: number | string,
): Promise<{ init_point: string; payment_id: number }> {
  const { data } = await apiClient.post('/payments/create/', {
    order_id: orderId,
  })
  return data
}

/**
 * GET /api/payments/status/{orderId}/
 */
export async function getPaymentStatus(
  orderId: number | string,
): Promise<{ order_id: number; status: string; amount: string; created_at: string }> {
  const { data } = await apiClient.get(`/payments/status/${orderId}/`)
  return data
}

/**
 * POST /api/payments/check-status/
 */
export async function checkPaymentStatus(
  orderId: number | string,
): Promise<{ message: string; status: string; mp_status?: string; mp_status_detail?: string }> {
  const { data } = await apiClient.post('/payments/check-status/', {
    order_id: orderId,
  })
  return data
}

/**
 * POST /api/payments/refund/
 */
export async function refundPayment(
  orderId: number | string,
): Promise<{ message: string; refund_id: string; payment_id: number; status: string }> {
  const { data } = await apiClient.post('/payments/refund/', {
    order_id: orderId,
  })
  return data
}

// ═══════════════════════════════════════
//  DOLLAR RATE OPERATIONS
// ═══════════════════════════════════════

/**
 * GET /api/payments/dollar-rates/
 */
export async function getDollarRates(): Promise<DollarRate[]> {
  const { data } = await apiClient.get('/payments/dollar-rates/')
  if (Array.isArray(data)) return data
  return (data as { results?: DollarRate[] }).results ?? []
}

/**
 * Get the currently active dollar rate.
 */
export async function getCurrentDollarRate(): Promise<DollarRate | null> {
  const rates = await getDollarRates()
  return rates.find((r) => r.is_active) ?? rates[0] ?? null
}

/**
 * POST /api/payments/dollar-rates/
 */
export async function createDollarRate(
  rateData: Partial<DollarRate>,
): Promise<DollarRate> {
  const { data } = await apiClient.post<DollarRate>(
    '/payments/dollar-rates/',
    rateData,
  )
  return data
}

/**
 * PATCH /api/payments/dollar-rates/{id}/
 */
export async function updateDollarRate(
  id: number,
  rateData: Partial<DollarRate>,
): Promise<DollarRate> {
  const { data } = await apiClient.patch<DollarRate>(
    `/payments/dollar-rates/${id}/`,
    rateData,
  )
  return data
}

/**
 * GET /api/payments/update-dollar-rate/
 */
export async function updateDollarRateFromAPI(
  rateType = 'blue',
): Promise<{ message: string; rate: DollarRate }> {
  const { data } = await apiClient.get('/payments/update-dollar-rate/', {
    params: { rate_type: rateType },
  })
  return data
}

// ═══════════════════════════════════════
//  DISTRIBUTION CENTER OPERATIONS
// ═══════════════════════════════════════

/**
 * GET /api/payments/distribution-centers/
 */
export async function getDistributionCenters(): Promise<DistributionCenter[]> {
  const { data } = await apiClient.get('/payments/distribution-centers/')
  if (Array.isArray(data)) return data
  return (data as { results?: DistributionCenter[] }).results ?? []
}

/**
 * POST /api/payments/distribution-centers/
 */
export async function createDistributionCenter(
  centerData: Partial<DistributionCenter>,
): Promise<DistributionCenter> {
  const { data } = await apiClient.post<DistributionCenter>(
    '/payments/distribution-centers/',
    centerData,
  )
  return data
}

/**
 * PATCH /api/payments/distribution-centers/{id}/
 */
export async function updateDistributionCenter(
  id: number,
  centerData: Partial<DistributionCenter>,
): Promise<DistributionCenter> {
  const { data } = await apiClient.patch<DistributionCenter>(
    `/payments/distribution-centers/${id}/`,
    centerData,
  )
  return data
}

/**
 * DELETE /api/payments/distribution-centers/{id}/
 */
export async function deleteDistributionCenter(id: number): Promise<void> {
  await apiClient.delete(`/payments/distribution-centers/${id}/`)
}
