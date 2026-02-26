// ─── Products Store ───
// Pinia store for product CRUD, category management, and filtering state.

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as productsService from '@/services/products'
import type {
  Product,
  ProductListItem,
  ProductFormData,
  ProductFilters,
  Category,
  PaginatedResponse,
} from '@/types/products'
import { DEFAULT_PRODUCT_FILTERS } from '@/types/products'

export const useProductsStore = defineStore('products', () => {
  // ═══════════════════════════════════════
  //  STATE
  // ═══════════════════════════════════════

  const products = ref<ProductListItem[]>([])
  const totalCount = ref(0)
  const currentProduct = ref<Product | null>(null)
  const categories = ref<Category[]>([])
  const filters = ref<ProductFilters>({ ...DEFAULT_PRODUCT_FILTERS })

  const isLoading = ref(false)
  const isLoadingProduct = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)

  // ═══════════════════════════════════════
  //  GETTERS
  // ═══════════════════════════════════════

  const totalPages = computed(() =>
    Math.ceil(totalCount.value / filters.value.page_size),
  )

  const hasActiveFilters = computed(() => {
    const f = filters.value
    return !!(
      f.search ||
      f.category_name ||
      f.is_available ||
      f.stock_filter ||
      f.price_filter ||
      f.on_sale
    )
  })

  const categoryOptions = computed(() =>
    categories.value.map((c) => ({ value: c.name, label: c.name })),
  )

  // ═══════════════════════════════════════
  //  ACTIONS — PRODUCTS
  // ═══════════════════════════════════════

  async function fetchProducts(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const response: PaginatedResponse<ProductListItem> =
        await productsService.getProducts(filters.value)
      products.value = response.results
      totalCount.value = response.count
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al cargar productos'
      error.value = msg
      console.error('[ProductsStore] fetchProducts:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchProduct(id: number): Promise<Product | null> {
    isLoadingProduct.value = true
    error.value = null
    try {
      const data = await productsService.getProduct(id)
      currentProduct.value = data
      return data
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al cargar producto'
      error.value = msg
      currentProduct.value = null
      return null
    } finally {
      isLoadingProduct.value = false
    }
  }

  async function saveProduct(
    payload: ProductFormData,
    id?: number,
  ): Promise<Product | null> {
    isSaving.value = true
    error.value = null
    try {
      const result = id
        ? await productsService.updateProduct(id, payload as ProductFormData & Record<string, unknown>)
        : await productsService.createProduct(payload)
      return result
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al guardar producto'
      error.value = msg
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function removeProduct(id: number): Promise<boolean> {
    try {
      await productsService.deleteProduct(id)
      products.value = products.value.filter((p) => p.id !== id)
      totalCount.value = Math.max(0, totalCount.value - 1)
      return true
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al eliminar producto'
      error.value = msg
      return false
    }
  }

  /** Quick-update a single field (price, stock, visibility). */
  async function quickUpdate(
    id: number,
    field: string,
    value: unknown,
  ): Promise<boolean> {
    try {
      await productsService.updateProduct(id, { [field]: value } as Record<string, unknown>)
      // Update local array
      const idx = products.value.findIndex((p) => p.id === id)
      if (idx !== -1) {
        ;(products.value[idx] as unknown as Record<string, unknown>)[field] = value
      }
      return true
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al actualizar'
      error.value = msg
      return false
    }
  }

  // ═══════════════════════════════════════
  //  ACTIONS — CATEGORIES
  // ═══════════════════════════════════════

  async function fetchCategories(): Promise<void> {
    try {
      categories.value = await productsService.getCategories()
    } catch (err: unknown) {
      console.error('[ProductsStore] fetchCategories:', err)
    }
  }

  async function addCategory(name: string, parent?: number | null): Promise<Category | null> {
    try {
      const cat = await productsService.createCategory({ name, parent })
      categories.value.push(cat)
      return cat
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al crear categoría'
      error.value = msg
      return null
    }
  }

  async function editCategory(
    id: number,
    name: string,
    parent?: number | null,
  ): Promise<Category | null> {
    try {
      const updated = await productsService.updateCategory(id, { name, parent })
      const idx = categories.value.findIndex((c) => c.id === id)
      if (idx !== -1) categories.value[idx] = updated
      return updated
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al actualizar categoría'
      error.value = msg
      return null
    }
  }

  async function removeCategory(id: number): Promise<boolean> {
    try {
      await productsService.deleteCategory(id)
      categories.value = categories.value.filter((c) => c.id !== id)
      return true
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al eliminar categoría'
      error.value = msg
      return false
    }
  }

  // ═══════════════════════════════════════
  //  ACTIONS — FILTERS
  // ═══════════════════════════════════════

  function setFilters(partial: Partial<ProductFilters>): void {
    filters.value = { ...filters.value, ...partial, page: 1 }
  }

  function resetFilters(): void {
    filters.value = { ...DEFAULT_PRODUCT_FILTERS }
  }

  function setPage(page: number): void {
    filters.value.page = page
  }

  function clearError(): void {
    error.value = null
  }

  // ═══════════════════════════════════════
  //  RETURN
  // ═══════════════════════════════════════

  return {
    // state
    products,
    totalCount,
    currentProduct,
    categories,
    filters,
    isLoading,
    isLoadingProduct,
    isSaving,
    error,
    // getters
    totalPages,
    hasActiveFilters,
    categoryOptions,
    // actions
    fetchProducts,
    fetchProduct,
    saveProduct,
    removeProduct,
    quickUpdate,
    fetchCategories,
    addCategory,
    editCategory,
    removeCategory,
    setFilters,
    resetFilters,
    setPage,
    clearError,
  }
})
