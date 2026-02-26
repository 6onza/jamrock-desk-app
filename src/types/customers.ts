// ─── Customer domain types ───

export interface Customer {
  id: number
  username: string
  email: string
  dni: string | null
  name: string
  date_joined: string
  total_orders: number
  total_spent: number
  last_purchase: string | null
  is_active: boolean
  admin_notes: string | null
}

export interface CustomerFilters {
  search?: string
  is_active?: boolean
  page?: number
}

export interface CreateCustomerData {
  username: string
  email: string
  password: string
  password2: string
  dni?: string
}

export interface CustomerOrder {
  id: number
  created_at: string
  status: string
  total: number
  products: Array<{
    id: number
    quantity: number
    product_details?: { name: string }
  }>
}
