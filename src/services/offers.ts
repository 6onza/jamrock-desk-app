import apiClient from './apiClient'
import type { Offer, OfferFormData } from '@/types/marketing'

export async function getOffers(): Promise<Offer[]> {
  const { data } = await apiClient.get('/marketing/offers/')
  return Array.isArray(data) ? data : data.results ?? []
}

export async function getOffer(id: string): Promise<Offer> {
  const { data } = await apiClient.get(`/marketing/offers/${id}/`)
  return data
}

export async function createOffer(payload: OfferFormData): Promise<Offer> {
  const { data } = await apiClient.post('/marketing/offers/', payload)
  return data
}

export async function updateOffer(
  id: string,
  payload: OfferFormData,
): Promise<Offer> {
  const { data } = await apiClient.put(`/marketing/offers/${id}/`, payload)
  return data
}

export async function deleteOffer(id: string): Promise<void> {
  await apiClient.delete(`/marketing/offers/${id}/`)
}
