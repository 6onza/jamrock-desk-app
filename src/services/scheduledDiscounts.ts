import apiClient from './apiClient'
import type {
  ScheduledCategoryDiscount,
  ScheduledDiscountFormData,
} from '@/types/marketing'

export async function getScheduledDiscounts(): Promise<
  ScheduledCategoryDiscount[]
> {
  const { data } = await apiClient.get('/marketing/scheduled-discounts/')
  return Array.isArray(data) ? data : data.results ?? []
}

export async function createScheduledDiscount(
  payload: ScheduledDiscountFormData,
): Promise<ScheduledCategoryDiscount> {
  const { data } = await apiClient.post(
    '/marketing/scheduled-discounts/',
    payload,
  )
  return data
}

export async function updateScheduledDiscount(
  id: string,
  payload: ScheduledDiscountFormData,
): Promise<ScheduledCategoryDiscount> {
  const { data } = await apiClient.put(
    `/marketing/scheduled-discounts/${id}/`,
    payload,
  )
  return data
}

export async function deleteScheduledDiscount(id: string): Promise<void> {
  await apiClient.delete(`/marketing/scheduled-discounts/${id}/`)
}

export async function getTodayDiscounts(): Promise<{
  current_day: number
  current_day_name: string
  promotions: ScheduledCategoryDiscount[]
}> {
  const { data } = await apiClient.get(
    '/marketing/scheduled-discounts/today/',
  )
  return data
}

export async function getByDay(): Promise<
  Record<string, ScheduledCategoryDiscount[]>
> {
  const { data } = await apiClient.get(
    '/marketing/scheduled-discounts/by_day/',
  )
  return data
}

export async function applyNow(
  id: string,
): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post(
    `/marketing/scheduled-discounts/${id}/apply_now/`,
  )
  return data
}

export async function removeNow(
  id: string,
): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post(
    `/marketing/scheduled-discounts/${id}/remove_now/`,
  )
  return data
}
