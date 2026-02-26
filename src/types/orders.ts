// ─── Order-related TypeScript types ───

/** Order status literals matching backend STATUS_CHOICES */
export type OrderStatus =
  | 'pending'
  | 'payment_pending'
  | 'paid'
  | 'shipped'
  | 'cancelled'
  | 'archived'
  | 'abandoned'

/** Delivery type */
export type DeliveryType = 'delivery' | 'pickup'

/** Payment method */
export type PaymentMethod = 'cash' | 'online'

/** Nested product info inside an OrderItem */
export interface OrderItemProduct {
  id: number
  name: string
  image: string | null
  volume: string | null
  dimensions: string | null
  currency: 'ARS' | 'USD'
  has_special_promotion: boolean
  special_promotion_name: string | null
}

/** Single line item in an Order */
export interface OrderItem {
  id: number
  product_details: OrderItemProduct | null
  quantity: number
  price_at_time: number
  variants: Record<string, string> | null
  variants_label: string
}

/** Coupon summary nested in Order */
export interface OrderCouponDetails {
  id: number
  code: string
  type: 'percentage' | 'fixed'
  value: number
  max_amount: number | null
}

/** Full Order as returned by the backend OrderSerializer */
export interface Order {
  id: number
  user: number | null
  recipient_name: string
  customer_dni_cuit: string
  shipping_address: string
  shipping_street: string
  shipping_number: string
  shipping_neighborhood: string
  shipping_city: string
  shipping_postal_code: string
  customer_email: string
  customer_phone: string
  delivery_type: DeliveryType
  payment_method?: PaymentMethod
  status: OrderStatus
  subtotal: number
  discount: number
  bulk_promotion_discount: number
  total: number
  created_at: string
  updated_at: string
  products: OrderItem[]
  shipping_notification_sent: boolean
  coupon: number | null
  coupon_details: OrderCouponDetails | null
  is_temporary: boolean
  anonymous_id: string | null
  last_activity: string
}

/** Compact order for lists (same shape, but we can slim it later) */
export type OrderListItem = Order

/** Filters accepted by GET /api/orders/ */
export interface OrderFilters {
  status?: OrderStatus | ''
  search?: string
  start_date?: string
  end_date?: string
  sort_by?: string
  order?: 'asc' | 'desc'
  page?: number
  include_items?: boolean
  exclude_temporary?: boolean
  customer_id?: number | string
}

/** Response from GET /api/orders/ (paginated) */
export interface OrderListResponse {
  count: number
  next: string | null
  previous: string | null
  results: Order[]
}

/** Response from GET /api/orders/stats/ */
export interface OrderStatusCounts {
  pending: number
  payment_pending: number
  paid: number
  shipped: number
  cancelled: number
  archived: number
  abandoned: number
}

export interface OrderStatsResponse {
  counts: OrderStatusCounts
}

/** Allowed transitions map matching backend ALLOWED_TRANSITIONS */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['payment_pending', 'cancelled', 'paid', 'shipped', 'archived', 'abandoned'],
  payment_pending: ['paid', 'cancelled', 'pending', 'shipped', 'archived', 'abandoned'],
  paid: ['shipped', 'cancelled', 'pending', 'payment_pending', 'archived'],
  shipped: ['cancelled', 'pending', 'payment_pending', 'paid', 'archived'],
  cancelled: ['pending', 'payment_pending', 'paid', 'shipped', 'archived'],
  archived: ['pending', 'payment_pending', 'paid', 'shipped', 'cancelled'],
  abandoned: ['pending', 'payment_pending', 'paid', 'archived'],
}

/** Human-readable labels for order statuses (Spanish) */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  payment_pending: 'Pago pendiente',
  paid: 'Pagado',
  shipped: 'Enviado',
  cancelled: 'Cancelado',
  archived: 'Archivado',
  abandoned: 'Abandonado',
}

// ─── Abandoned Cart Types ───

export type AbandonedCartStatus = 'active' | 'abandoned' | 'recovered' | 'converted' | 'expired'

export const ABANDONED_CART_STATUS_LABELS: Record<AbandonedCartStatus, string> = {
  active: 'Activo',
  abandoned: 'Abandonado',
  recovered: 'Recuperado',
  converted: 'Convertido',
  expired: 'Expirado',
}

export interface AbandonedCartItemProduct {
  id: number
  name: string
  image: string | null
  price: number
  currency: 'ARS' | 'USD'
}

export interface AbandonedCartItem {
  id: number
  product_details: AbandonedCartItemProduct | null
  quantity: number
  price_at_time: number
  variants: Record<string, string> | null
  variants_label: string
}

export interface AbandonedCartCustomer {
  name: string
  email: string
  phone: string
  dni_cuit: string
}

export interface AbandonedCart {
  id: number
  user: number | null
  anonymous_id: string | null
  status: AbandonedCartStatus
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  customer_dni_cuit: string | null
  shipping_address: string | null
  delivery_type: DeliveryType
  subtotal: number
  discount: number
  total: number
  created_at: string
  last_activity: string
  abandoned_at: string | null
  recovered_at: string | null
  reminder_emails_sent: number
  last_reminder_sent_at: string | null
  converted_order_id: number | null
  products: AbandonedCartItem[]
  coupon_details: { id: number; code: string; type: string; value: number } | null
  customer: AbandonedCartCustomer
  items_count: number
  time_abandoned: number | null
}

export interface AbandonedCartStatistics {
  total_count: number
  recovered_count: number
  converted_count: number
  abandoned_count: number
  active_count: number
  average_value: number
  abandonment_rate: number
  recovery_rate: number
  average_time_to_recovery: number
  most_abandoned_products: Array<Record<string, unknown>>
  period: string
}

export interface AbandonedCartFilters {
  status?: AbandonedCartStatus | ''
  days?: number
  user_id?: number | string
}

// ─── Payment Types ───

export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'refunded'

export interface Payment {
  id: number
  user: number
  order: number
  mercadopago_id: string
  status: PaymentStatus
  amount: number
  created_at: string
  updated_at: string
}

export type DollarRateType = 'manual' | 'blue' | 'official'

export interface DollarRate {
  id: number
  value: number
  rate_type: DollarRateType
  rate_type_display: string
  auto_update: boolean
  is_active: boolean
  update_date: string
  updated_by: number | null
  updated_by_name: string | null
  created_at: string
  updated_at: string
}

export interface DistributionCenter {
  id: number
  name: string
  address: string
  phone: string
  is_active: boolean
  created_by: number | null
  created_by_name: string | null
  created_at: string
  updated_at: string
}

// ─── Create / Update Data Types ───

export interface CreateOrderItemData {
  product_id: number
  quantity: number
  price?: number
  variants?: Record<string, string> | null
  variants_label?: string
}

export interface CreateOrderData {
  recipient_name: string
  customer_email: string
  customer_phone: string
  customer_dni_cuit?: string
  delivery_type: DeliveryType
  payment_method?: PaymentMethod
  shipping_address?: string
  shipping_street?: string
  shipping_number?: string
  shipping_neighborhood?: string
  shipping_city?: string
  shipping_postal_code?: string
  products_data: CreateOrderItemData[]
  coupon_code?: string
  anonymous_id?: string
}

export interface UpdateOrderItemData {
  id: number
  quantity: number
}
