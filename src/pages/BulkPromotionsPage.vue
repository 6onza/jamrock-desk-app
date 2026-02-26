<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Plus, Pencil, Trash2, X, Save, Search, ToggleLeft, ToggleRight } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { getBulkPromotions, createBulkPromotion, updateBulkPromotion, deleteBulkPromotion } from '@/services/bulkPromotions'
import { getProducts, getCategories } from '@/services/products'
import type { BulkPromotion, BulkPromotionFormData, BulkPromotionType } from '@/types/marketing'
import { BULK_PROMO_TYPE_LABELS, BULK_PROMO_QUANTITIES } from '@/types/marketing'
import type { ProductListItem, Category } from '@/types/products'

const promotions = ref<BulkPromotion[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const showForm = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const formError = ref('')

// Product search
const productSearch = ref('')
const productResults = ref<ProductListItem[]>([])
const selectedProducts = ref<ProductListItem[]>([])
let searchTimer: ReturnType<typeof setTimeout>

// Delete
const confirmOpen = ref(false)
const deleteId = ref<string | null>(null)
const confirmLoading = ref(false)

const defaultForm = (): BulkPromotionFormData => ({
  name: '', description: '', promotion_type: '3x2',
  buy_quantity: 3, pay_quantity: 2, products: [], categories: [],
  start_date: '', end_date: '', active: true, priority: 0, max_applications: null,
})
const form = ref<BulkPromotionFormData>(defaultForm())

// Auto-fill quantities when type changes
watch(() => form.value.promotion_type, (t) => {
  if (t !== 'custom') {
    const q = BULK_PROMO_QUANTITIES[t]
    form.value.buy_quantity = q.buy
    form.value.pay_quantity = q.pay
  }
})

async function load() {
  loading.value = true
  try {
    ;[promotions.value, categories.value] = await Promise.all([getBulkPromotions(), getCategories()])
  } finally { loading.value = false }
}

function openCreate() {
  form.value = defaultForm(); editingId.value = null; selectedProducts.value = []
  formError.value = ''; showForm.value = true
}

function openEdit(p: BulkPromotion) {
  editingId.value = p.id
  form.value = {
    name: p.name, description: p.description || '', promotion_type: p.promotion_type,
    buy_quantity: p.buy_quantity, pay_quantity: p.pay_quantity,
    products: [...p.products], categories: [...p.categories],
    start_date: p.start_date?.slice(0, 16) || '', end_date: p.end_date?.slice(0, 16) || '',
    active: p.active, priority: p.priority, max_applications: p.max_applications,
  }
  selectedProducts.value = []
  formError.value = ''; showForm.value = true
}

async function saveForm() {
  saving.value = true; formError.value = ''
  try {
    const payload: BulkPromotionFormData = {
      ...form.value,
      start_date: form.value.start_date ? new Date(form.value.start_date).toISOString() : '',
      end_date: form.value.end_date ? new Date(form.value.end_date).toISOString() : '',
    }
    if (editingId.value) await updateBulkPromotion(editingId.value, payload)
    else await createBulkPromotion(payload)
    showForm.value = false; await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { detail?: string } }; message?: string }
    formError.value = err?.response?.data?.detail || err?.message || 'Error'
  } finally { saving.value = false }
}

// Product search
function searchProductsHandler() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    if (productSearch.value.length < 2) { productResults.value = []; return }
    try {
      const res = await getProducts({ search: productSearch.value })
      productResults.value = res.results.filter(p => !form.value.products.includes(p.id))
    } catch { productResults.value = [] }
  }, 400)
}
function addProduct(p: ProductListItem) {
  form.value.products.push(p.id); selectedProducts.value.push(p)
  productResults.value = []; productSearch.value = ''
}
function removeProduct(id: number) {
  form.value.products = form.value.products.filter(pid => pid !== id)
  selectedProducts.value = selectedProducts.value.filter(p => p.id !== id)
}

// Category toggle
function toggleCategory(catId: number) {
  const idx = form.value.categories.indexOf(catId)
  if (idx >= 0) form.value.categories.splice(idx, 1)
  else form.value.categories.push(catId)
}

// Delete
function confirmDeletePromo(id: string) { deleteId.value = id; confirmOpen.value = true }
async function handleDelete() {
  confirmLoading.value = true
  try { if (deleteId.value) { await deleteBulkPromotion(deleteId.value); await load() } }
  finally { confirmLoading.value = false; confirmOpen.value = false }
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const typeOptions = Object.entries(BULK_PROMO_TYPE_LABELS) as [BulkPromotionType, string][]

onMounted(() => load())
</script>

<template>
  <div>
    <PageHeader title="Promociones bulk" subtitle="Promociones de tipo Llevá X Pagá Y">
      <template #actions>
        <button v-if="!showForm" class="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600" @click="openCreate">
          <Plus :size="16" /> Nueva promoción
        </button>
      </template>
    </PageHeader>

    <!-- Form -->
    <div v-if="showForm" class="mb-6 rounded-xl border border-surface-700/50 bg-surface-800 p-5">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-gray-200">{{ editingId ? 'Editar promoción' : 'Nueva promoción' }}</h2>
        <button class="text-gray-500 hover:text-gray-300" @click="showForm = false"><X :size="18" /></button>
      </div>
      <form @submit.prevent="saveForm" class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div class="sm:col-span-2">
            <label class="mb-1 block text-2xs font-medium text-gray-400">Nombre</label>
            <input v-model="form.name" required class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
          </div>
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Tipo</label>
            <select v-model="form.promotion_type" class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none">
              <option v-for="[val, label] in typeOptions" :key="val" :value="val">{{ label }}</option>
            </select>
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Llevá (cantidad)</label>
            <input v-model.number="form.buy_quantity" type="number" min="1" :disabled="form.promotion_type !== 'custom'" class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 disabled:opacity-50 focus:border-primary-500/50 focus:outline-none" />
          </div>
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Pagá (cantidad)</label>
            <input v-model.number="form.pay_quantity" type="number" min="1" :disabled="form.promotion_type !== 'custom'" class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 disabled:opacity-50 focus:border-primary-500/50 focus:outline-none" />
          </div>
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Fecha inicio</label>
            <input v-model="form.start_date" type="datetime-local" class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
          </div>
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Fecha fin</label>
            <input v-model="form.end_date" type="datetime-local" class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Prioridad</label>
            <input v-model.number="form.priority" type="number" min="0" class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
          </div>
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Máx. aplicaciones</label>
            <input v-model.number="form.max_applications" type="number" min="0" class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" placeholder="Ilimitadas" />
          </div>
          <div class="flex items-end">
            <label class="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
              <button type="button" @click="form.active = !form.active" class="text-gray-400 hover:text-gray-200">
                <component :is="form.active ? ToggleRight : ToggleLeft" :size="24" :class="form.active ? 'text-primary-400' : ''" />
              </button>
              {{ form.active ? 'Activa' : 'Inactiva' }}
            </label>
          </div>
        </div>
        <div>
          <label class="mb-1 block text-2xs font-medium text-gray-400">Descripción</label>
          <textarea v-model="form.description" rows="2" class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
        </div>
        <!-- Categories -->
        <div>
          <label class="mb-1 block text-2xs font-medium text-gray-400">Categorías</label>
          <div class="flex flex-wrap gap-2">
            <button v-for="cat in categories" :key="cat.id" type="button"
              class="rounded-full px-2.5 py-1 text-xs transition-colors"
              :class="form.categories.includes(cat.id) ? 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/30' : 'bg-surface-700/50 text-gray-400 hover:bg-surface-700'"
              @click="toggleCategory(cat.id)">{{ cat.name }}</button>
          </div>
        </div>
        <!-- Products -->
        <div>
          <label class="mb-1 block text-2xs font-medium text-gray-400">Productos</label>
          <div v-if="selectedProducts.length || form.products.length" class="mb-2 flex flex-wrap gap-1">
            <span v-for="p in selectedProducts" :key="p.id" class="inline-flex items-center gap-1 rounded-full bg-primary-500/15 px-2.5 py-0.5 text-xs text-primary-400">
              {{ p.name }} <button type="button" @click="removeProduct(p.id)" class="hover:text-red-400">×</button>
            </span>
            <span v-for="pid in form.products.filter(id => !selectedProducts.some(p => p.id === id))" :key="pid" class="inline-flex items-center gap-1 rounded-full bg-surface-700/50 px-2.5 py-0.5 text-xs text-gray-400">
              Producto #{{ pid }} <button type="button" @click="removeProduct(pid)" class="hover:text-red-400">×</button>
            </span>
          </div>
          <div class="relative">
            <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input v-model="productSearch" @input="searchProductsHandler" placeholder="Buscar productos…"
              class="w-full rounded-lg border border-surface-700/50 bg-surface-900 py-2 pl-8 pr-3 text-sm text-gray-200 placeholder-gray-600 focus:border-primary-500/50 focus:outline-none" />
            <div v-if="productResults.length" class="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-surface-700/50 bg-surface-800 shadow-xl">
              <button v-for="p in productResults" :key="p.id" type="button" class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-surface-700" @click="addProduct(p)">
                {{ p.name }} <span class="text-2xs text-gray-500">${{ Math.round(p.price) }}</span>
              </button>
            </div>
          </div>
        </div>
        <div v-if="formError" class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{{ formError }}</div>
        <div class="flex justify-end gap-3">
          <button type="button" class="rounded-lg border border-surface-700/50 px-4 py-2 text-sm text-gray-400 hover:bg-surface-700" @click="showForm = false">Cancelar</button>
          <button type="submit" :disabled="saving" class="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50">
            <Save :size="16" /> {{ saving ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Table -->
    <div class="overflow-hidden rounded-xl border border-surface-700/50">
      <div v-if="loading" class="flex justify-center py-20"><LoadingSpinner text="Cargando promociones…" /></div>
      <div v-else-if="promotions.length === 0" class="py-16"><EmptyState title="Sin promociones" message="Creá tu primera promoción bulk." /></div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-700/50 bg-surface-800">
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Nombre</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Tipo</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Llevá / Pagá</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Productos</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Categorías</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Periodo</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Estado</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in promotions" :key="p.id" class="border-b border-surface-700/30 transition-colors hover:bg-surface-800/60">
              <td class="px-4 py-3">
                <div>
                  <p class="font-medium text-gray-200">{{ p.name }}</p>
                  <p v-if="p.description" class="text-2xs text-gray-500 line-clamp-1">{{ p.description }}</p>
                </div>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="rounded-full bg-purple-500/15 px-2 py-0.5 text-xs font-medium text-purple-400">{{ p.promotion_type }}</span>
              </td>
              <td class="px-4 py-3 text-center font-medium text-gray-200">{{ p.buy_quantity }} → {{ p.pay_quantity }}</td>
              <td class="px-4 py-3 text-center text-gray-400">{{ p.product_count ?? p.products.length }}</td>
              <td class="px-4 py-3 text-center text-gray-400">{{ p.category_count ?? p.categories.length }}</td>
              <td class="px-4 py-3 text-2xs text-gray-400">{{ fmtDate(p.start_date) }} — {{ fmtDate(p.end_date) }}</td>
              <td class="px-4 py-3 text-center"><StatusBadge :status="p.active ? 'active' : 'inactive'" size="xs" /></td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <button class="rounded p-1 text-gray-500 hover:bg-surface-700 hover:text-gray-200" @click="openEdit(p)"><Pencil :size="14" /></button>
                  <button class="rounded p-1 text-gray-500 hover:bg-surface-700 hover:text-red-400" @click="confirmDeletePromo(p.id)"><Trash2 :size="14" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ConfirmDialog v-model:open="confirmOpen" title="Eliminar promoción" message="¿Eliminar esta promoción permanentemente?" variant="danger" :loading="confirmLoading" @confirm="handleDelete" />
  </div>
</template>
