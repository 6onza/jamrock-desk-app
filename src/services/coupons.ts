import apiClient from './apiClient'
import type { Coupon, CouponFormData, CouponUsage } from '@/types/marketing'

export async function getCoupons(): Promise<Coupon[]> {
  const { data } = await apiClient.get('/marketing/coupons/')
  return Array.isArray(data) ? data : data.results ?? []
}

export async function getCoupon(id: string): Promise<Coupon> {
  const { data } = await apiClient.get(`/marketing/coupons/${id}/`)
  return data
}

export async function createCoupon(payload: CouponFormData): Promise<Coupon> {
  const { data } = await apiClient.post('/marketing/coupons/', payload)
  return data
}

export async function updateCoupon(
  id: string,
  payload: CouponFormData,
): Promise<Coupon> {
  const { data } = await apiClient.put(`/marketing/coupons/${id}/`, payload)
  return data
}

export async function deleteCoupon(id: string): Promise<void> {
  await apiClient.delete(`/marketing/coupons/${id}/`)
}

export async function validateCoupon(
  code: string,
): Promise<{ valid: boolean; reason?: string; coupon?: Coupon }> {
  const { data } = await apiClient.post('/marketing/coupons/validate/', {
    code,
  })
  return data
}

export async function getCouponUsages(id: string): Promise<CouponUsage[]> {
  const { data } = await apiClient.get(`/marketing/coupons/${id}/usages/`)
  return Array.isArray(data) ? data : data.results ?? []
}
