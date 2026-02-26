import apiClient from './apiClient'
import type { BulkPromotion, BulkPromotionFormData } from '@/types/marketing'

export async function getBulkPromotions(): Promise<BulkPromotion[]> {
  const { data } = await apiClient.get('/marketing/bulk-promotions/')
  return Array.isArray(data) ? data : data.results ?? []
}

export async function getActiveBulkPromotions(): Promise<BulkPromotion[]> {
  const { data } = await apiClient.get('/marketing/bulk-promotions/', {
    params: { active: true },
  })
  return Array.isArray(data) ? data : data.results ?? []
}

export async function createBulkPromotion(
  payload: BulkPromotionFormData,
): Promise<BulkPromotion> {
  const { data } = await apiClient.post(
    '/marketing/bulk-promotions/',
    payload,
  )
  return data
}

export async function updateBulkPromotion(
  id: string,
  payload: BulkPromotionFormData,
): Promise<BulkPromotion> {
  const { data } = await apiClient.put(
    `/marketing/bulk-promotions/${id}/`,
    payload,
  )
  return data
}

export async function deleteBulkPromotion(id: string): Promise<void> {
  await apiClient.delete(`/marketing/bulk-promotions/${id}/`)
}

export async function checkProductEligibility(
  productId: number,
  quantity = 1,
): Promise<unknown> {
  const { data } = await apiClient.post(
    '/marketing/bulk-promotions/check_product/',
    { product_id: productId, quantity },
  )
  return data
}
