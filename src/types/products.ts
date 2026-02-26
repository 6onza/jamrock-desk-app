// ─── Product-related types ───
// Mirrors backend Product / Category / ProductReview models

// ═══════════════════════════════════════
//  CATEGORY
// ═══════════════════════════════════════

export interface Category {
  id: number
  name: string
  slug: string
  parent: number | null
}

export interface HierarchicalCategory {
  id: number
  name: string
  slug: string
  product_count: number
  children: HierarchicalCategory[]
}

// ═══════════════════════════════════════
//  VARIANT
// ═══════════════════════════════════════

export interface VariantOption {
  name: string
  stock: number
  price_adjustment: number
  price?: number
  sku?: string
}

export interface ProductVariant {
  variant_name: string
  options: VariantOption[]
}

// ═══════════════════════════════════════
//  PRODUCT
// ═══════════════════════════════════════

export type CurrencyCode = 'ARS' | 'USD'

export interface Product {
  id: number
  name: string
  sku: string
  brand: string | null
  description: string | null
  category: number
  category_name: string
  price: number
  currency: CurrencyCode
  discount: number
  final_price: number
  total_discount: number
  stock: number
  total_stock?: number
  has_variants: boolean
  variants: ProductVariant[] | null
  volume: string | null
  dimensions: string | null
  image: string | null
  image_2: string | null
  is_available: boolean
  active_offers?: ProductOffer[]
  has_special_promotion: boolean
  special_promotion_name: string | null
  created_at: string
  updated_at: string
}

/** Lighter version returned by the list endpoint */
export interface ProductListItem {
  id: number
  name: string
  brand: string | null
  price: number
  currency: CurrencyCode
  stock: number
  image: string | null
  is_available: boolean
  discount: number
  category_name: string
  has_variants: boolean
  variants: ProductVariant[] | null
  final_price: number
  total_discount: number
  has_special_promotion: boolean
  special_promotion_name: string | null
}

export interface ProductOffer {
  id: number
  name: string
  discount: number
  start_date: string
  end_date: string
}

// ═══════════════════════════════════════
//  FORM DATA
// ═══════════════════════════════════════

/** Data shape for create / update operations */
export interface ProductFormData {
  name: string
  brand: string
  description: string
  category: number | null
  price: number
  discount: number
  currency: CurrencyCode
  stock: number
  volume: string
  dimensions: string
  image: string | null
  image_2: string | null
  is_available: boolean
  has_variants: boolean
  variants: ProductVariant[]
  has_special_promotion: boolean
  special_promotion_name: string
}

// ═══════════════════════════════════════
//  FILTERS & PAGINATION
// ═══════════════════════════════════════

export interface ProductFilters {
  search: string
  category_name: string
  is_available: string          // '' | 'true' | 'false'
  stock_filter: string          // '' | 'in_stock' | 'low_stock' | 'out_of_stock'
  price_filter: string          // '' | 'with_price' | 'without_price' | 'on_sale'
  on_sale: boolean
  page: number
  page_size: number
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// ═══════════════════════════════════════
//  REVIEW
// ═══════════════════════════════════════

export interface ProductReview {
  id: number
  product: number
  product_name: string
  user: number
  username: string
  rating: number
  comment: string
  created_at: string
  updated_at: string
  is_approved: boolean
}

// ═══════════════════════════════════════
//  CONSTANTS / HELPERS
// ═══════════════════════════════════════

export const CURRENCY_OPTIONS: { value: CurrencyCode; label: string }[] = [
  { value: 'ARS', label: 'Peso argentino (ARS)' },
  { value: 'USD', label: 'Dólar estadounidense (USD)' },
]

export const STOCK_FILTER_OPTIONS = [
  { value: '', label: 'Todo el stock' },
  { value: 'in_stock', label: 'Con stock' },
  { value: 'low_stock', label: 'Stock bajo (<10)' },
  { value: 'out_of_stock', label: 'Sin stock' },
] as const

export const PRICE_FILTER_OPTIONS = [
  { value: '', label: 'Todos los precios' },
  { value: 'with_price', label: 'Con precio' },
  { value: 'without_price', label: 'Sin precio' },
  { value: 'on_sale', label: 'En oferta' },
] as const

export const AVAILABILITY_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'true', label: 'Visible' },
  { value: 'false', label: 'No visible' },
] as const

export const DEFAULT_PRODUCT_FILTERS: ProductFilters = {
  search: '',
  category_name: '',
  is_available: '',
  stock_filter: '',
  price_filter: '',
  on_sale: false,
  page: 1,
  page_size: 24,
}

/** Empty form data for the "new product" state */
export const EMPTY_PRODUCT_FORM: ProductFormData = {
  name: '',
  brand: '',
  description: '',
  category: null,
  price: 0,
  discount: 0,
  currency: 'ARS',
  stock: 0,
  volume: '',
  dimensions: '',
  image: null,
  image_2: null,
  is_available: true,
  has_variants: false,
  variants: [],
  has_special_promotion: false,
  special_promotion_name: '',
}

/** Determine stock-level class for badges */
export function getStockLevel(stock: number): 'in-stock' | 'low-stock' | 'out-of-stock' {
  if (stock <= 0) return 'out-of-stock'
  if (stock < 10) return 'low-stock'
  return 'in-stock'
}

/** Format price to locale string */
export function formatPrice(price: number | null | undefined): string {
  if (price == null || isNaN(Number(price))) return '0'
  return Math.round(Number(price)).toLocaleString('es-AR')
}

/** Check if product is on sale */
export function isProductOnSale(product: ProductListItem | Product): boolean {
  if (product.discount && product.discount > 0) return true
  if (product.total_discount && product.total_discount > 0) return true
  if (product.final_price && product.price && product.final_price < product.price) return true
  if (product.has_special_promotion) return true
  return false
}
