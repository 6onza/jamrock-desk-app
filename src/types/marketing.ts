// ─── Coupon types ───

export type CouponType = 'percentage' | 'fixed'

export const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  percentage: 'Porcentaje',
  fixed: 'Monto fijo',
}

export interface CouponUsageUser {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
}

export interface CouponUsage {
  id: string
  user: CouponUsageUser
  used_at: string
  order_id: string | null
  amount: number | null
  purchase_amount: number | null
}

export interface Coupon {
  id: string
  code: string
  type: CouponType
  value: number
  max_amount: number | null
  min_purchase: number | null
  max_uses: number | null
  used: number
  expires_at: string
  active: boolean
  categories: number[]
  created_at: string
  updated_at: string
  is_expired: boolean
  is_valid: boolean
  usages: CouponUsage[]
}

export interface CouponFormData {
  code: string
  type: CouponType
  value: number
  max_amount?: number | null
  min_purchase?: number | null
  max_uses?: number | null
  expires_at: string
  active: boolean
  categories: number[]
}

// ─── Offer types ───

export type OfferStatus = 'pending' | 'active' | 'expired'

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  pending: 'Pendiente',
  active: 'Activa',
  expired: 'Expirada',
}

export interface Offer {
  id: string
  name: string
  discount: number
  start_date: string
  end_date: string
  products: number[]
  created_at: string
  updated_at: string
  status: OfferStatus
}

export interface OfferFormData {
  name: string
  discount: number
  start_date: string
  end_date: string
  products: number[]
}

// ─── Bulk Promotion types ───

export type BulkPromotionType = '3x2' | '2x1' | '4x3' | '5x4' | 'custom'

export const BULK_PROMO_TYPE_LABELS: Record<BulkPromotionType, string> = {
  '3x2': '3×2 — Llevá 3 pagá 2',
  '2x1': '2×1 — Llevá 2 pagá 1',
  '4x3': '4×3 — Llevá 4 pagá 3',
  '5x4': '5×4 — Llevá 5 pagá 4',
  custom: 'Personalizado',
}

export const BULK_PROMO_QUANTITIES: Record<
  Exclude<BulkPromotionType, 'custom'>,
  { buy: number; pay: number }
> = {
  '3x2': { buy: 3, pay: 2 },
  '2x1': { buy: 2, pay: 1 },
  '4x3': { buy: 4, pay: 3 },
  '5x4': { buy: 5, pay: 4 },
}

export type BulkPromotionStatus = 'active' | 'inactive' | 'pending' | 'expired'

export interface BulkPromotion {
  id: string
  name: string
  description: string
  promotion_type: BulkPromotionType
  buy_quantity: number
  pay_quantity: number
  products: number[]
  categories: number[]
  start_date: string
  end_date: string
  active: boolean
  priority: number
  max_applications: number | null
  created_at: string
  updated_at: string
  status: BulkPromotionStatus
  product_count: number
  category_count: number
}

export interface BulkPromotionFormData {
  name: string
  description?: string
  promotion_type: BulkPromotionType
  buy_quantity: number
  pay_quantity: number
  products: number[]
  categories: number[]
  start_date: string
  end_date: string
  active: boolean
  priority?: number
  max_applications?: number | null
}

// ─── Scheduled Category Discount types ───

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const DAY_LABELS: Record<DayOfWeek, string> = {
  0: 'Lunes',
  1: 'Martes',
  2: 'Miércoles',
  3: 'Jueves',
  4: 'Viernes',
  5: 'Sábado',
  6: 'Domingo',
}

export interface ScheduledCategoryDiscount {
  id: string
  name: string
  description: string
  category: number
  category_name: string | null
  day_of_week: DayOfWeek
  day_name: string
  discount: number
  start_time: string | null
  end_time: string | null
  active: boolean
  valid_from: string | null
  valid_until: string | null
  last_applied: string | null
  last_removed: string | null
  is_active_now: boolean
  affected_products_count: number
  created_at: string
  updated_at: string
}

export interface ScheduledDiscountFormData {
  name: string
  description?: string
  category: number | null
  day_of_week: DayOfWeek
  discount: number
  start_time?: string | null
  end_time?: string | null
  active: boolean
  valid_from?: string | null
  valid_until?: string | null
}
