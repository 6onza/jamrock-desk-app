<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Pencil, Trash2, X, Save, Search } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { getOffers, createOffer, updateOffer, deleteOffer } from '@/services/offers'
import { getProducts, getProduct } from '@/services/products'
import type { Offer, OfferFormData } from '@/types/marketing'
import type { ProductListItem } from '@/types/products'

const offers = ref<Offer[]>([])
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

const defaultForm = (): OfferFormData => ({ name: '', discount: 0, start_date: '', end_date: '', products: [] })
const form = ref<OfferFormData>(defaultForm())

async function load() {
  loading.value = true
  try { offers.value = await getOffers() }
  finally { loading.value = false }
}

function openCreate() {
  form.value = defaultForm(); editingId.value = null; selectedProducts.value = []
  formError.value = ''; showForm.value = true
}

async function openEdit(o: Offer) {
  editingId.value = o.id
  form.value = {
    name: o.name, discount: o.discount,
    start_date: o.start_date.slice(0, 16), end_date: o.end_date.slice(0, 16),
    products: [...o.products],
  }
  selectedProducts.value = []
  formError.value = ''; showForm.value = true
  // Load full product details so names + images appear in the chip list
  if (o.products.length > 0) {
    try {
      selectedProducts.value = (await Promise.all(o.products.map(id => getProduct(id)))) as unknown as ProductListItem[]
    } catch { selectedProducts.value = [] }
  }
}

async function saveForm() {
  saving.value = true; formError.value = ''
  try {
    const payload: OfferFormData = {
      ...form.value,
      start_date: new Date(form.value.start_date).toISOString(),
      end_date: new Date(form.value.end_date).toISOString(),
    }
    if (editingId.value) await updateOffer(editingId.value, payload)
    else await createOffer(payload)
    showForm.value = false; await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { detail?: string } }; message?: string }
    formError.value = err?.response?.data?.detail || err?.message || 'Error'
  } finally { saving.value = false }
}

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

function confirmDeleteOffer(id: string) { deleteId.value = id; confirmOpen.value = true }
async function handleDelete() {
  confirmLoading.value = true
  try { if (deleteId.value) { await deleteOffer(deleteId.value); await load() } }
  finally { confirmLoading.value = false; confirmOpen.value = false }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

onMounted(() => load())
</script>

<template>
  <div>
    <PageHeader title="Ofertas" subtitle="Ofertas y campañas de descuento">
      <template #actions>
        <button v-if="!showForm" class="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600" @click="openCreate">
          <Plus :size="16" /> Nueva oferta
        </button>
      </template>
    </PageHeader>

    <!-- Form -->
    <div v-if="showForm" class="mb-6 rounded-xl border border-surface-700/50 bg-surface-800 p-5">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-gray-200">{{ editingId ? 'Editar oferta' : 'Nueva oferta' }}</h2>
        <button class="text-gray-500 hover:text-gray-300" @click="showForm = false"><X :size="18" /></button>
      </div>
      <form @submit.prevent="saveForm" class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div class="sm:col-span-2">
            <label class="mb-1 block text-2xs font-medium text-gray-400">Nombre</label>
            <input v-model="form.name" required class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
          </div>
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Descuento (%)</label>
            <input v-model.number="form.discount" type="number" min="0" max="100" required class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-1xs font-medium text-gray-400">Fecha inicio</label>
            <input v-model="form.start_date" type="datetime-local" required class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
          </div>
          <div>
            <label class="mb-1 block text-1xs font-medium text-gray-400">Fecha fin</label>
            <input v-model="form.end_date" type="datetime-local" required class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
          </div>
        </div>
        <!-- Product selector -->
        <div>
          <label class="mb-1 block text-2xs font-medium text-gray-400">Productos</label>
          <div v-if="selectedProducts.length || form.products.length" class="mb-2 flex flex-wrap gap-1">
            <span v-for="p in selectedProducts" :key="p.id" class="inline-flex items-center gap-1.5 rounded-full bg-primary-500/15 pl-0.5 pr-2 py-0.5 text-xs text-primary-400">
              <img v-if="p.image" :src="p.image" class="h-5 w-5 rounded-full object-cover flex-shrink-0" />
              <span v-else class="h-5 w-5 rounded-full bg-surface-600 flex-shrink-0" />
              {{ p.name }} <button type="button" @click="removeProduct(p.id)" class="hover:text-red-400 ml-0.5">×</button>
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
              <button v-for="p in productResults" :key="p.id" type="button" class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-300 hover:bg-surface-700" @click="addProduct(p)">
                <img v-if="p.image" :src="p.image" class="h-8 w-8 rounded object-cover flex-shrink-0" />
                <span v-else class="h-8 w-8 rounded bg-surface-600 flex-shrink-0" />
                <span class="flex-1 min-w-0">
                  <span class="block truncate">{{ p.name }}</span>
                  <span class="text-2xs text-gray-500">${{ Math.round(p.price) }}</span>
                </span>
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
      <div v-if="loading" class="flex justify-center py-20"><LoadingSpinner text="Cargando ofertas…" /></div>
      <div v-else-if="offers.length === 0" class="py-16"><EmptyState title="Sin ofertas" message="Creá tu primera oferta." /></div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-700/50 bg-surface-800">
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Nombre</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Descuento</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Inicio</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Fin</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Productos</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Estado</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in offers" :key="o.id" class="border-b border-surface-700/30 transition-colors hover:bg-surface-800/60">
              <td class="px-4 py-3 font-medium text-gray-200">{{ o.name }}</td>
              <td class="px-4 py-3 text-center font-medium text-green-400">{{ o.discount }}%</td>
              <td class="px-4 py-3 text-1xs text-gray-400">{{ fmtDate(o.start_date) }}</td>
              <td class="px-4 py-3 text-1xs text-gray-400">{{ fmtDate(o.end_date) }}</td>
              <td class="px-4 py-3 text-center text-gray-400">{{ o.products.length }}</td>
              <td class="px-4 py-3 text-center"><StatusBadge :status="o.status" size="xs" /></td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <button class="rounded p-1 text-gray-500 hover:bg-surface-700 hover:text-gray-200" @click="openEdit(o)"><Pencil :size="14" /></button>
                  <button class="rounded p-1 text-gray-500 hover:bg-surface-700 hover:text-red-400" @click="confirmDeleteOffer(o.id)"><Trash2 :size="14" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ConfirmDialog v-model:open="confirmOpen" title="Eliminar oferta" message="¿Eliminar esta oferta permanentemente?" variant="danger" :loading="confirmLoading" @confirm="handleDelete" />
  </div>
</template>
