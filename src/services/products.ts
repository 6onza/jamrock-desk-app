// ─── Products Service ───
// API functions for products, categories, reviews, and Cloudinary uploads.
// Mirrors the web frontend's services/products.js adapted for Tauri + TypeScript.

import apiClient from './apiClient'
import type {
  Product,
  ProductListItem,
  ProductFormData,
  ProductFilters,
  PaginatedResponse,
  Category,
  HierarchicalCategory,
  ProductReview,
} from '@/types/products'

// ═══════════════════════════════════════
//  PRODUCTS — CRUD
// ═══════════════════════════════════════

/**
 * Fetch paginated products with server-side filtering.
 * Uses the optimised `/products/by-category/` endpoint when filtering by category.
 */
export async function getProducts(
  filters: Partial<ProductFilters> = {},
): Promise<PaginatedResponse<ProductListItem>> {
  const params = new URLSearchParams()

  if (filters.page) params.append('page', String(filters.page))
  if (filters.page_size) params.append('page_size', String(filters.page_size))
  if (filters.search) params.append('search', filters.search)
  if (filters.category_name) params.append('category_name', filters.category_name)
  if (filters.is_available) params.append('is_available', filters.is_available)
  if (filters.stock_filter) params.append('stock_filter', filters.stock_filter)
  if (filters.price_filter) params.append('price_filter', filters.price_filter)
  if (filters.on_sale) params.append('on_sale', 'true')

  // Use the optimised category endpoint when category_name is set (no on_sale)
  const useCategoryEndpoint = filters.category_name && !filters.on_sale
  const url = useCategoryEndpoint
    ? `/products/by-category/?${params.toString()}`
    : `/products/?${params.toString()}`

  const { data } = await apiClient.get<PaginatedResponse<ProductListItem>>(url)
  return {
    results: data.results ?? [],
    count: data.count ?? 0,
    next: data.next ?? null,
    previous: data.previous ?? null,
  }
}

/** Fetch a single product with full detail. */
export async function getProduct(id: number): Promise<Product> {
  const { data } = await apiClient.get<Product>(`/products/${id}/`)
  return data
}

/** Create a new product. */
export async function createProduct(payload: ProductFormData): Promise<Product> {
  const { data } = await apiClient.post<Product>('/products/', payload)
  return data
}

/** Partially update a product (PATCH). */
export async function updateProduct(
  id: number,
  payload: Partial<ProductFormData> & Record<string, unknown>,
): Promise<Product> {
  const { data } = await apiClient.patch<Product>(`/products/${id}/`, payload)
  return data
}

/** Delete a product. */
export async function deleteProduct(id: number): Promise<void> {
  await apiClient.delete(`/products/${id}/`)
}

/** Fetch products currently on sale. */
export async function getProductsOnSale(): Promise<PaginatedResponse<ProductListItem>> {
  const { data } = await apiClient.get<PaginatedResponse<ProductListItem>>(
    '/products/on-sale-fast/',
  )
  return {
    results: data.results ?? [],
    count: data.count ?? 0,
    next: data.next ?? null,
    previous: data.previous ?? null,
  }
}

// ═══════════════════════════════════════
//  CATEGORIES
// ═══════════════════════════════════════

/** Flat list of all categories. */
export async function getCategories(): Promise<Category[]> {
  const { data } = await apiClient.get<Category[]>('/categories/')
  return data
}

/** Hierarchical categories with product counts (cached server-side). */
export async function getHierarchicalCategories(): Promise<HierarchicalCategory[]> {
  const { data } = await apiClient.get<HierarchicalCategory[]>(
    '/categories/hierarchical/',
  )
  return data
}

/** Create a new category. */
export async function createCategory(
  payload: { name: string; parent?: number | null },
): Promise<Category> {
  const { data } = await apiClient.post<Category>('/categories/', payload)
  return data
}

/** Update an existing category. */
export async function updateCategory(
  id: number,
  payload: { name: string; parent?: number | null },
): Promise<Category> {
  const { data } = await apiClient.patch<Category>(`/categories/${id}/`, payload)
  return data
}

/** Delete a category (fails if it has products). */
export async function deleteCategory(id: number): Promise<void> {
  await apiClient.delete(`/categories/${id}/`)
}

// ═══════════════════════════════════════
//  REVIEWS
// ═══════════════════════════════════════

/** Get approved reviews for a specific product. */
export async function getProductReviews(productId: number): Promise<ProductReview[]> {
  const { data } = await apiClient.get<ProductReview[]>(
    `/reviews/for_product/?product_id=${productId}`,
  )
  return data
}

/** Get all reviews (admin). */
export async function getAllReviews(): Promise<ProductReview[]> {
  const { data } = await apiClient.get<ProductReview[]>('/reviews/')
  return data
}

/** Get reviews pending approval (admin). */
export async function getPendingReviews(): Promise<ProductReview[]> {
  const { data } = await apiClient.get<ProductReview[]>('/reviews/pending/')
  return data
}

/** Approve a review. */
export async function approveReview(
  reviewId: number,
): Promise<{ message: string; review: ProductReview }> {
  const { data } = await apiClient.patch<{ message: string; review: ProductReview }>(
    `/reviews/${reviewId}/approve/`,
  )
  return data
}

/** Reject a review. */
export async function rejectReview(
  reviewId: number,
): Promise<{ message: string; review: ProductReview }> {
  const { data } = await apiClient.patch<{ message: string; review: ProductReview }>(
    `/reviews/${reviewId}/reject/`,
  )
  return data
}

/** Delete a review. */
export async function deleteReview(reviewId: number): Promise<void> {
  await apiClient.delete(`/reviews/${reviewId}/`)
}

// ═══════════════════════════════════════
//  CLOUDINARY IMAGE UPLOAD
// ═══════════════════════════════════════

const CLOUDINARY_CLOUD_NAME = 'dwugxlsez'
const CLOUDINARY_UPLOAD_PRESET = 'productos'

/**
 * Upload an image file directly to Cloudinary.
 * Returns the secure URL of the uploaded image.
 */
export async function uploadImageToCloudinary(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  formData.append('cloud_name', CLOUDINARY_CLOUD_NAME)
  formData.append('file', file)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  )

  if (!response.ok) {
    throw new Error(`Error al subir imagen: HTTP ${response.status}`)
  }

  const data = await response.json()
  return data.secure_url as string
}
