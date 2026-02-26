import apiClient from './apiClient'
import type {
  Customer,
  CustomerFilters,
  CreateCustomerData,
  CustomerOrder,
} from '@/types/customers'
import type { ApiPaginatedResponse } from '@/types/api'

export async function getCustomers(
  filters: CustomerFilters = {},
): Promise<ApiPaginatedResponse<Customer>> {
  const params: Record<string, string | number | boolean> = {}
  if (filters.search) params.search = filters.search
  if (filters.is_active !== undefined) params.is_active = filters.is_active
  if (filters.page) params.page = filters.page

  const { data } = await apiClient.get('/auth/customers/', { params })
  return data
}

export async function getCustomer(id: number): Promise<Customer> {
  const { data } = await apiClient.get(`/auth/customers/${id}/`)
  return data
}

export async function createCustomer(
  payload: CreateCustomerData,
): Promise<Customer> {
  const { data } = await apiClient.post('/auth/customers/', payload)
  return data
}

export async function updateCustomer(
  id: number,
  payload: Partial<Customer>,
): Promise<Customer> {
  const { data } = await apiClient.patch(
    `/auth/customers/${id}/`,
    payload,
  )
  return data
}

export async function deleteCustomer(id: number): Promise<void> {
  await apiClient.delete(`/auth/customers/${id}/`)
}

export async function blockCustomer(
  id: number,
  adminNotes = '',
): Promise<Customer> {
  const { data } = await apiClient.post(
    `/auth/customers/${id}/block/`,
    { admin_notes: adminNotes },
  )
  return data
}

export async function unblockCustomer(
  id: number,
  adminNotes = '',
): Promise<Customer> {
  const { data } = await apiClient.post(
    `/auth/customers/${id}/unblock/`,
    { admin_notes: adminNotes },
  )
  return data
}

export async function getCustomerOrders(
  id: number,
): Promise<CustomerOrder[]> {
  const { data } = await apiClient.get(`/auth/customers/${id}/orders/`)
  return Array.isArray(data) ? data : data.results ?? []
}
