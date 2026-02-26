<script setup lang="ts">
// ─── ProductListPage ───
// Full product catalogue with filters, pagination, quick-edit, bulk actions.

import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProductsStore } from '@/stores/products'
import { PageHeader, EmptyState, LoadingSpinner, ConfirmDialog } from '@/components/ui'
import {
  formatPrice,
  getStockLevel,
  STOCK_FILTER_OPTIONS,
  PRICE_FILTER_OPTIONS,
  AVAILABILITY_OPTIONS,
} from '@/types/products'
import type { ProductListItem } from '@/types/products'
import {
  Package,
  Plus,
  Search,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Filter,
  LayoutGrid,
  LayoutList,
  DollarSign,
  Boxes,
} from 'lucide-vue-next'

const router = useRouter()
const store = useProductsStore()

// ─── Local UI state ───
const viewMode = ref<'table' | 'grid'>('table')
const searchInput = ref('')
const searchTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const showFilters = ref(false)

// Confirm-delete state
const showDeleteDialog = ref(false)
const productToDelete = ref<ProductListItem | null>(null)

// Quick-edit state
const quickEditProduct = ref<ProductListItem | null>(null)
const quickEditField = ref<'price' | 'stock' | null>(null)
const quickEditValue = ref<number>(0)
const showQuickEdit = ref(false)
const isQuickSaving = ref(false)

// Selected items for bulk actions
const selectedIds = ref<Set<number>>(new Set())
const selectAll = ref(false)

// ─── Computed ───
const products = computed(() => store.products)
const isLoading = computed(() => store.isLoading)
const totalCount = computed(() => store.totalCount)
const totalPages = computed(() => store.totalPages)
const currentPage = computed(() => store.filters.page)
const hasFilters = computed(() => store.hasActiveFilters)

const displayedPages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const delta = 2
  const pages: number[] = []
  for (
    let i = Math.max(2, current - delta);
    i <= Math.min(total - 1, current + delta);
    i++
  ) {
    pages.push(i)
  }
  return pages
})

// ─── Search debounce ───
function onSearchInput() {
  if (searchTimer.value) clearTimeout(searchTimer.value)
  searchTimer.value = setTimeout(() => {
    store.setFilters({ search: searchInput.value })
    store.fetchProducts()
  }, 350)
}

// ─── Filter actions ───
function applyFilter(key: string, value: string | boolean) {
  store.setFilters({ [key]: value })
  store.fetchProducts()
}

function clearAllFilters() {
  searchInput.value = ''
  store.resetFilters()
  store.fetchProducts()
}

// ─── Pagination ───
function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  store.setPage(page)
  store.fetchProducts()
}

// ─── Navigation ───
function openProduct(id: number) {
  router.push(`/products/${id}/edit`)
}

function createProduct() {
  router.push('/products/new')
}

// ─── Delete ───
function confirmDelete(product: ProductListItem) {
  productToDelete.value = product
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!productToDelete.value) return
  const ok = await store.removeProduct(productToDelete.value.id)
  showDeleteDialog.value = false
  productToDelete.value = null
  if (ok) store.fetchProducts()
}

// ─── Quick edit ───
function openQuickEdit(product: ProductListItem, field: 'price' | 'stock') {
  quickEditProduct.value = product
  quickEditField.value = field
  quickEditValue.value = field === 'price' ? product.price : product.stock
  showQuickEdit.value = true
}

async function saveQuickEdit() {
  if (!quickEditProduct.value || !quickEditField.value) return
  isQuickSaving.value = true
  const ok = await store.quickUpdate(
    quickEditProduct.value.id,
    quickEditField.value,
    quickEditValue.value,
  )
  isQuickSaving.value = false
  showQuickEdit.value = false
  if (ok) store.fetchProducts()
}

// ─── Toggle visibility ───
async function toggleVisibility(product: ProductListItem) {
  await store.quickUpdate(product.id, 'is_available', !product.is_available)
}

// ─── Bulk selection ───
function toggleSelectAll() {
  if (selectAll.value) {
    selectedIds.value = new Set(products.value.map((p) => p.id))
  } else {
    selectedIds.value.clear()
  }
}

function toggleSelect(id: number) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
  selectAll.value = selectedIds.value.size === products.value.length
}

// ─── Stock badge class ───
function stockClass(stock: number): string {
  const level = getStockLevel(stock)
  if (level === 'in-stock') return 'bg-emerald-500/20 text-emerald-400'
  if (level === 'low-stock') return 'bg-amber-500/20 text-amber-400'
  return 'bg-red-500/20 text-red-400'
}

// ─── Init ───
onMounted(async () => {
  await Promise.all([store.fetchProducts(), store.fetchCategories()])
})

watch(
  () => store.filters,
  () => {
    selectAll.value = false
    selectedIds.value.clear()
  },
  { deep: true },
)
</script>

<template>
  <div>
    <!-- Header -->
    <PageHeader title="Productos" subtitle="Gestión del catálogo de productos">
      <template #actions>
        <button
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
          @click="createProduct"
        >
          <Plus class="h-4 w-4" />
          Nuevo producto
        </button>
      </template>
    </PageHeader>

    <!-- Toolbar: search + view toggle + filter toggle -->
    <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <!-- Search -->
      <div class="relative flex-1 max-w-md">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <input
          v-model="searchInput"
          type="text"
          placeholder="Buscar por nombre o marca…"
          class="w-full rounded-lg border border-surface-600 bg-surface-800 py-2 pl-10 pr-8 text-sm text-white placeholder-surface-400 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          @input="onSearchInput"
        />
        <button
          v-if="searchInput"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white"
          @click="searchInput = ''; applyFilter('search', '')"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="flex items-center gap-2">
        <!-- View toggle -->
        <div class="inline-flex rounded-lg border border-surface-600 p-0.5">
          <button
            class="rounded-md p-1.5 transition"
            :class="viewMode === 'table' ? 'bg-surface-600 text-white' : 'text-surface-400 hover:text-white'"
            @click="viewMode = 'table'"
          >
            <LayoutList class="h-4 w-4" />
          </button>
          <button
            class="rounded-md p-1.5 transition"
            :class="viewMode === 'grid' ? 'bg-surface-600 text-white' : 'text-surface-400 hover:text-white'"
            @click="viewMode = 'grid'"
          >
            <LayoutGrid class="h-4 w-4" />
          </button>
        </div>

        <!-- Filter toggle -->
        <button
          class="inline-flex items-center gap-1.5 rounded-lg border border-surface-600 px-3 py-2 text-sm text-surface-300 transition hover:border-primary-500 hover:text-white"
          :class="{ 'border-primary-500 text-white': showFilters || hasFilters }"
          @click="showFilters = !showFilters"
        >
          <Filter class="h-4 w-4" />
          Filtros
          <span
            v-if="hasFilters"
            class="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-2xs font-bold text-white"
          >!</span>
        </button>

        <!-- Refresh -->
        <button
          class="rounded-lg border border-surface-600 p-2 text-surface-400 transition hover:border-surface-500 hover:text-white"
          :disabled="isLoading"
          @click="store.fetchProducts()"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
        </button>
      </div>
    </div>

    <!-- Filter panel -->
    <Transition name="slide">
      <div v-if="showFilters" class="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-surface-700 bg-surface-800/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Category -->
        <div>
          <label class="mb-1 block text-xs text-surface-400">Categoría</label>
          <select
            :value="store.filters.category_name"
            class="w-full rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
            @change="applyFilter('category_name', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">Todas</option>
            <option v-for="cat in store.categories" :key="cat.id" :value="cat.name">
              {{ cat.name }}
            </option>
          </select>
        </div>

        <!-- Stock -->
        <div>
          <label class="mb-1 block text-xs text-surface-400">Stock</label>
          <select
            :value="store.filters.stock_filter"
            class="w-full rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
            @change="applyFilter('stock_filter', ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="opt in STOCK_FILTER_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Price -->
        <div>
          <label class="mb-1 block text-xs text-surface-400">Precio</label>
          <select
            :value="store.filters.price_filter"
            class="w-full rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
            @change="applyFilter('price_filter', ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="opt in PRICE_FILTER_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Availability -->
        <div>
          <label class="mb-1 block text-xs text-surface-400">Visibilidad</label>
          <select
            :value="store.filters.is_available"
            class="w-full rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
            @change="applyFilter('is_available', ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="opt in AVAILABILITY_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Clear filters -->
        <div v-if="hasFilters" class="col-span-full flex justify-end">
          <button
            class="inline-flex items-center gap-1.5 text-sm text-surface-400 transition hover:text-white"
            @click="clearAllFilters"
          >
            <X class="h-3.5 w-3.5" />
            Limpiar filtros
          </button>
        </div>
      </div>
    </Transition>

    <!-- Results info -->
    <div class="mt-3 flex items-center justify-between text-xs text-surface-400">
      <span>
        Mostrando {{ products.length }} de {{ totalCount }} productos
        <span v-if="hasFilters" class="text-primary-400">(filtrados)</span>
      </span>
      <span v-if="selectedIds.size > 0" class="text-primary-400">
        {{ selectedIds.size }} seleccionados
      </span>
    </div>

    <!-- Loading -->
    <div v-if="isLoading && products.length === 0" class="mt-12">
      <LoadingSpinner label="Cargando productos…" />
    </div>

    <!-- Empty -->
    <div v-else-if="!isLoading && products.length === 0" class="mt-12">
      <EmptyState
        :icon="Package"
        :title="hasFilters ? 'Sin resultados' : 'Sin productos'"
        :message="hasFilters ? 'No se encontraron productos con los filtros aplicados.' : 'Aún no tenés productos cargados.'"
      >
        <template #action>
          <button
            v-if="hasFilters"
            class="mt-4 rounded-lg border border-surface-600 px-4 py-2 text-sm text-surface-300 transition hover:text-white"
            @click="clearAllFilters"
          >
            Limpiar filtros
          </button>
          <button
            v-else
            class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500"
            @click="createProduct"
          >
            <Plus class="h-4 w-4" />
            Agregar primer producto
          </button>
        </template>
      </EmptyState>
    </div>

    <!-- ════════════════════ TABLE VIEW ════════════════════ -->
    <div v-else-if="viewMode === 'table'" class="mt-4 overflow-x-auto rounded-xl border border-surface-700 bg-surface-800/50">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-surface-700 text-left text-xs uppercase text-surface-400">
            <th class="px-4 py-3 w-10">
              <input
                type="checkbox"
                v-model="selectAll"
                class="rounded border-surface-500 bg-surface-700 text-primary-500 focus:ring-primary-500"
                @change="toggleSelectAll"
              />
            </th>
            <th class="px-4 py-3">Producto</th>
            <th class="px-4 py-3 text-right">Precio</th>
            <th class="px-4 py-3 text-center">Stock</th>
            <th class="px-4 py-3 text-center">Estado</th>
            <th class="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-700/50">
          <tr
            v-for="product in products"
            :key="product.id"
            class="transition hover:bg-surface-700/30"
            :class="{ 'bg-primary-900/10': selectedIds.has(product.id) }"
          >
            <!-- Checkbox -->
            <td class="px-4 py-3">
              <input
                type="checkbox"
                :checked="selectedIds.has(product.id)"
                class="rounded border-surface-500 bg-surface-700 text-primary-500 focus:ring-primary-500"
                @change="toggleSelect(product.id)"
              />
            </td>

            <!-- Product info -->
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-surface-700">
                  <img
                    v-if="product.image"
                    :src="product.image"
                    :alt="product.name"
                    class="h-full w-full object-cover"
                  />
                  <div v-else class="flex h-full w-full items-center justify-center">
                    <Package class="h-5 w-5 text-surface-500" />
                  </div>
                </div>
                <div class="min-w-0">
                  <button
                    class="truncate text-sm font-medium text-white hover:text-primary-400 text-left max-w-[260px] block"
                    @click="openProduct(product.id)"
                  >
                    {{ product.name }}
                  </button>
                  <div class="flex items-center gap-2 text-xs text-surface-400">
                    <span>{{ product.brand || 'Sin marca' }}</span>
                    <span class="text-surface-600">·</span>
                    <span>{{ product.category_name }}</span>
                  </div>
                </div>
              </div>
            </td>

            <!-- Price -->
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <div v-if="product.total_discount > 0" class="flex flex-col items-end gap-0.5">
                <span class="font-semibold text-emerald-400">${{ formatPrice(product.final_price) }}</span>
                <span class="text-xs text-surface-500 line-through">${{ formatPrice(product.price) }}</span>
                <span class="inline-block rounded bg-emerald-500/20 px-1.5 py-0.5 text-2xs font-bold text-emerald-400">
                  -{{ Math.round(product.total_discount) }}%
                </span>
              </div>
              <span v-else class="font-semibold text-emerald-400">${{ formatPrice(product.price) }}</span>
            </td>

            <!-- Stock -->
            <td class="px-4 py-3 text-center">
              <span
                class="inline-flex min-w-[2.5rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium"
                :class="stockClass(product.stock)"
              >
                {{ product.stock }}
              </span>
            </td>

            <!-- Availability -->
            <td class="px-4 py-3 text-center">
              <button
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition"
                :class="product.is_available
                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'"
                @click="toggleVisibility(product)"
              >
                <Eye v-if="product.is_available" class="h-3 w-3" />
                <EyeOff v-else class="h-3 w-3" />
                {{ product.is_available ? 'Visible' : 'Oculto' }}
              </button>
            </td>

            <!-- Actions -->
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1">
                <button
                  class="rounded-lg p-1.5 text-surface-400 transition hover:bg-surface-700 hover:text-primary-400"
                  title="Editar precio"
                  @click="openQuickEdit(product, 'price')"
                >
                  <DollarSign class="h-4 w-4" />
                </button>
                <button
                  class="rounded-lg p-1.5 text-surface-400 transition hover:bg-surface-700 hover:text-primary-400"
                  title="Editar stock"
                  @click="openQuickEdit(product, 'stock')"
                >
                  <Boxes class="h-4 w-4" />
                </button>
                <button
                  class="rounded-lg p-1.5 text-surface-400 transition hover:bg-surface-700 hover:text-white"
                  title="Editar producto"
                  @click="openProduct(product.id)"
                >
                  <Pencil class="h-4 w-4" />
                </button>
                <button
                  class="rounded-lg p-1.5 text-surface-400 transition hover:bg-red-500/20 hover:text-red-400"
                  title="Eliminar"
                  @click="confirmDelete(product)"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ════════════════════ GRID VIEW ════════════════════ -->
    <div v-else class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div
        v-for="product in products"
        :key="product.id"
        class="group relative rounded-xl border border-surface-700 bg-surface-800/50 p-3 transition hover:border-surface-600"
      >
        <!-- Image -->
        <div
          class="relative mb-3 aspect-square overflow-hidden rounded-lg bg-surface-700 cursor-pointer"
          @click="openProduct(product.id)"
        >
          <img
            v-if="product.image"
            :src="product.image"
            :alt="product.name"
            class="h-full w-full object-cover transition group-hover:scale-105"
          />
          <div v-else class="flex h-full w-full items-center justify-center">
            <Package class="h-12 w-12 text-surface-500" />
          </div>

          <!-- Discount badge -->
          <span
            v-if="product.total_discount > 0"
            class="absolute right-2 top-2 rounded-lg bg-emerald-500 px-2 py-0.5 text-xs font-bold text-black"
          >
            -{{ Math.round(product.total_discount) }}%
          </span>

          <!-- Special promo badge -->
          <span
            v-if="product.has_special_promotion && product.special_promotion_name"
            class="absolute left-2 top-2 rounded-lg bg-amber-500 px-2 py-0.5 text-xs font-bold text-black"
          >
            {{ product.special_promotion_name }}
          </span>

          <!-- Visibility overlay -->
          <div
            v-if="!product.is_available"
            class="absolute inset-0 flex items-center justify-center bg-black/60"
          >
            <span class="rounded-lg bg-red-500/80 px-2 py-1 text-xs font-medium text-white">
              <EyeOff class="mr-1 inline h-3 w-3" />Oculto
            </span>
          </div>
        </div>

        <!-- Info -->
        <div class="space-y-1">
          <p class="text-xs text-surface-400">{{ product.category_name }}</p>
          <h3
            class="cursor-pointer truncate text-sm font-medium text-white hover:text-primary-400"
            @click="openProduct(product.id)"
          >
            {{ product.name }}
          </h3>
          <p class="text-xs text-surface-500">{{ product.brand || 'Sin marca' }}</p>
        </div>

        <!-- Price + stock -->
        <div class="mt-3 flex items-center justify-between">
          <div>
            <span v-if="product.total_discount > 0" class="block text-xs text-surface-500 line-through">
              ${{ formatPrice(product.price) }}
            </span>
            <span class="text-sm font-bold text-emerald-400">${{ formatPrice(product.final_price || product.price) }}</span>
          </div>
          <span
            class="rounded-full px-2 py-0.5 text-xs font-medium"
            :class="stockClass(product.stock)"
          >
            {{ product.stock }} uds
          </span>
        </div>

        <!-- Hover actions -->
        <div class="absolute right-2 top-2 flex flex-col gap-1 opacity-0 transition group-hover:opacity-100"
          :class="{ 'opacity-100': !product.image }"
        >
          <button
            class="rounded-lg bg-surface-800/80 p-1.5 text-surface-300 backdrop-blur transition hover:text-white"
            @click="openProduct(product.id)"
            title="Editar"
          >
            <Pencil class="h-3.5 w-3.5" />
          </button>
          <button
            class="rounded-lg bg-surface-800/80 p-1.5 text-surface-300 backdrop-blur transition hover:text-red-400"
            @click="confirmDelete(product)"
            title="Eliminar"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- ════════════════════ PAGINATION ════════════════════ -->
    <div v-if="totalPages > 1" class="mt-6 flex items-center justify-center gap-1">
      <button
        class="rounded-lg border border-surface-700 p-2 text-surface-400 transition hover:text-white disabled:opacity-40"
        :disabled="currentPage === 1"
        @click="goToPage(currentPage - 1)"
      >
        <ChevronLeft class="h-4 w-4" />
      </button>

      <button
        v-if="displayedPages.length > 0 && displayedPages[0] > 1"
        class="rounded-lg border border-surface-700 px-3 py-1.5 text-sm text-surface-400 hover:text-white"
        @click="goToPage(1)"
      >1</button>
      <span v-if="displayedPages.length > 0 && displayedPages[0] > 2" class="px-1 text-surface-600">…</span>

      <button
        v-for="page in displayedPages"
        :key="page"
        class="rounded-lg border px-3 py-1.5 text-sm transition"
        :class="page === currentPage
          ? 'border-primary-500 bg-primary-600 font-medium text-white'
          : 'border-surface-700 text-surface-400 hover:text-white'"
        @click="goToPage(page)"
      >
        {{ page }}
      </button>

      <span v-if="displayedPages.length > 0 && displayedPages[displayedPages.length - 1] < totalPages - 1" class="px-1 text-surface-600">…</span>
      <button
        v-if="displayedPages.length > 0 && displayedPages[displayedPages.length - 1] < totalPages"
        class="rounded-lg border border-surface-700 px-3 py-1.5 text-sm text-surface-400 hover:text-white"
        @click="goToPage(totalPages)"
      >{{ totalPages }}</button>

      <button
        class="rounded-lg border border-surface-700 p-2 text-surface-400 transition hover:text-white disabled:opacity-40"
        :disabled="currentPage === totalPages"
        @click="goToPage(currentPage + 1)"
      >
        <ChevronRight class="h-4 w-4" />
      </button>
    </div>

    <!-- ════════════════════ DELETE DIALOG ════════════════════ -->
    <ConfirmDialog
      :open="showDeleteDialog"
      variant="danger"
      title="Eliminar producto"
      :message="`¿Estás seguro que querés eliminar &quot;${productToDelete?.name}&quot;? Esta acción no se puede deshacer.`"
      confirm-label="Eliminar"
      @confirm="handleDelete"
      @cancel="showDeleteDialog = false"
    />

    <!-- ════════════════════ QUICK-EDIT MODAL ════════════════════ -->
    <Transition name="dialog">
      <div
        v-if="showQuickEdit"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        @click.self="showQuickEdit = false"
      >
        <div class="w-full max-w-sm rounded-xl border border-surface-700 bg-surface-800 p-6 shadow-2xl">
          <h3 class="mb-4 text-lg font-semibold text-white">
            {{ quickEditField === 'price' ? 'Editar precio' : 'Editar stock' }}
          </h3>
          <p class="mb-3 text-sm text-surface-400">{{ quickEditProduct?.name }}</p>
          <label class="mb-1 block text-xs text-surface-400">
            {{ quickEditField === 'price' ? 'Precio ($)' : 'Stock (unidades)' }}
          </label>
          <input
            v-model.number="quickEditValue"
            type="number"
            :step="quickEditField === 'price' ? '0.01' : '1'"
            :min="0"
            class="w-full rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
            @keyup.enter="saveQuickEdit"
          />
          <div class="mt-5 flex justify-end gap-2">
            <button
              class="rounded-lg border border-surface-600 px-4 py-2 text-sm text-surface-300 hover:text-white"
              @click="showQuickEdit = false"
            >
              Cancelar
            </button>
            <button
              class="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 disabled:opacity-50"
              :disabled="isQuickSaving"
              @click="saveQuickEdit"
            >
              <RefreshCw v-if="isQuickSaving" class="h-3.5 w-3.5 animate-spin" />
              {{ isQuickSaving ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
