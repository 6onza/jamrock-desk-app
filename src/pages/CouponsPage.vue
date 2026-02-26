<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Plus, Pencil, Trash2, Copy, History, X, Save,
  ToggleLeft, ToggleRight, Check,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import {
  getCoupons, createCoupon, updateCoupon, deleteCoupon, getCouponUsages,
} from '@/services/coupons'
import { getCategories } from '@/services/products'
import type { Coupon, CouponFormData, CouponUsage } from '@/types/marketing'
import type { Category } from '@/types/products'

// State
const coupons = ref<Coupon[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const showForm = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const formError = ref('')

// Usages
const usagesCouponId = ref<string | null>(null)
const usages = ref<CouponUsage[]>([])
const usagesLoading = ref(false)

// Delete
const confirmOpen = ref(false)
const deleteId = ref<string | null>(null)
const confirmLoading = ref(false)

// Clipboard
const copiedCode = ref('')

// Form
const defaultForm = (): CouponFormData => ({
  code: '', type: 'percentage', value: 0, max_amount: null,
  min_purchase: null, max_uses: null, expires_at: '', active: true, categories: [],
})
const form = ref<CouponFormData>(defaultForm())

async function load() {
  loading.value = true
  try {
    ;[coupons.value, categories.value] = await Promise.all([getCoupons(), getCategories()])
  } finally { loading.value = false }
}

function openCreate() {
  form.value = defaultForm(); editingId.value = null
  formError.value = ''; showForm.value = true
}

function openEdit(c: Coupon) {
  editingId.value = c.id
  form.value = {
    code: c.code, type: c.type, value: c.value, max_amount: c.max_amount,
    min_purchase: c.min_purchase, max_uses: c.max_uses,
    expires_at: c.expires_at ? c.expires_at.slice(0, 16) : '',
    active: c.active, categories: [...c.categories],
  }
  formError.value = ''; showForm.value = true
}

async function saveForm() {
  saving.value = true; formError.value = ''
  try {
    const payload = { ...form.value, expires_at: form.value.expires_at ? new Date(form.value.expires_at).toISOString() : '' }
    if (editingId.value) await updateCoupon(editingId.value, payload)
    else await createCoupon(payload)
    showForm.value = false; editingId.value = null; await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { detail?: string } }; message?: string }
    formError.value = err?.response?.data?.detail || err?.message || 'Error al guardar'
  } finally { saving.value = false }
}

function confirmDeleteCoupon(id: string) { deleteId.value = id; confirmOpen.value = true }
async function handleDelete() {
  confirmLoading.value = true
  try { if (deleteId.value) { await deleteCoupon(deleteId.value); await load() } }
  finally { confirmLoading.value = false; confirmOpen.value = false }
}

async function toggleUsages(couponId: string) {
  if (usagesCouponId.value === couponId) { usagesCouponId.value = null; return }
  usagesCouponId.value = couponId; usagesLoading.value = true
  try { usages.value = await getCouponUsages(couponId) }
  finally { usagesLoading.value = false }
}

function copyCode(code: string) {
  navigator.clipboard.writeText(code); copiedCode.value = code
  setTimeout(() => { copiedCode.value = '' }, 2000)
}

function toggleCategory(catId: number) {
  const idx = form.value.categories.indexOf(catId)
  if (idx >= 0) form.value.categories.splice(idx, 1)
  else form.value.categories.push(catId)
}

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) }
function fmtPrice(n: number | null) { return n != null ? Math.round(n).toLocaleString('es-AR') : '—' }

onMounted(() => load())
</script>

<template>
  <div>
    <PageHeader title="Cupones" subtitle="Gestión de cupones de descuento">
      <template #actions>
        <button v-if="!showForm" class="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600" @click="openCreate">
          <Plus :size="16" /> Nuevo cupón
        </button>
      </template>
    </PageHeader>

    <!-- Form -->
    <div v-if="showForm" class="mb-6 rounded-xl border border-surface-700/50 bg-surface-800 p-5">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-gray-200">{{ editingId ? 'Editar cupón' : 'Nuevo cupón' }}</h2>
        <button class="text-gray-500 hover:text-gray-300" @click="showForm = false"><X :size="18" /></button>
      </div>
      <form @submit.prevent="saveForm" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label class="mb-1 block text-2xs font-medium text-gray-400">Código</label>
          <input v-model="form.code" required class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" placeholder="DESCUENTO10" />
        </div>
        <div>
          <label class="mb-1 block text-2xs font-medium text-gray-400">Tipo</label>
          <select v-model="form.type" class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none">
            <option value="percentage">Porcentaje (%)</option>
            <option value="fixed">Monto fijo ($)</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-2xs font-medium text-gray-400">Valor {{ form.type === 'percentage' ? '(%)' : '($)' }}</label>
          <input v-model.number="form.value" type="number" min="0" :max="form.type === 'percentage' ? 100 : undefined" required class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
        </div>
        <div>
          <label class="mb-1 block text-2xs font-medium text-gray-400">Descuento máximo ($)</label>
          <input v-model.number="form.max_amount" type="number" min="0" class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" placeholder="Sin límite" />
        </div>
        <div>
          <label class="mb-1 block text-2xs font-medium text-gray-400">Compra mínima ($)</label>
          <input v-model.number="form.min_purchase" type="number" min="0" class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" placeholder="Sin mínimo" />
        </div>
        <div>
          <label class="mb-1 block text-2xs font-medium text-gray-400">Máx. usos</label>
          <input v-model.number="form.max_uses" type="number" min="0" class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" placeholder="Ilimitados" />
        </div>
        <div>
          <label class="mb-1 block text-2xs font-medium text-gray-400">Vencimiento</label>
          <input v-model="form.expires_at" type="datetime-local" required class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
        </div>
        <div class="flex items-end">
          <label class="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
            <button type="button" @click="form.active = !form.active" class="text-gray-400 hover:text-gray-200">
              <component :is="form.active ? ToggleRight : ToggleLeft" :size="24" :class="form.active ? 'text-primary-400' : ''" />
            </button>
            {{ form.active ? 'Activo' : 'Inactivo' }}
          </label>
        </div>
        <!-- Categories -->
        <div class="sm:col-span-2 lg:col-span-3">
          <label class="mb-1 block text-2xs font-medium text-gray-400">Categorías elegibles (vacío = todas)</label>
          <div class="flex flex-wrap gap-2">
            <button v-for="cat in categories" :key="cat.id" type="button"
              class="rounded-full px-2.5 py-1 text-xs transition-colors"
              :class="form.categories.includes(cat.id) ? 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/30' : 'bg-surface-700/50 text-gray-400 hover:bg-surface-700'"
              @click="toggleCategory(cat.id)">{{ cat.name }}</button>
          </div>
        </div>
        <div v-if="formError" class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 sm:col-span-2 lg:col-span-3">{{ formError }}</div>
        <div class="flex justify-end gap-3 sm:col-span-2 lg:col-span-3">
          <button type="button" class="rounded-lg border border-surface-700/50 px-4 py-2 text-sm text-gray-400 hover:bg-surface-700" @click="showForm = false">Cancelar</button>
          <button type="submit" :disabled="saving" class="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50">
            <Save :size="16" /> {{ saving ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Table -->
    <div class="overflow-hidden rounded-xl border border-surface-700/50">
      <div v-if="loading" class="flex justify-center py-20"><LoadingSpinner text="Cargando cupones…" /></div>
      <div v-else-if="coupons.length === 0" class="py-16"><EmptyState title="Sin cupones" message="Creá tu primer cupón de descuento." /></div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-700/50 bg-surface-800">
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Código</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Tipo</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Valor</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Usos</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Vence</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Estado</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="c in coupons" :key="c.id">
              <tr class="border-b border-surface-700/30 transition-colors hover:bg-surface-800/60">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <code class="rounded bg-surface-700/50 px-2 py-0.5 text-xs font-bold text-primary-400">{{ c.code }}</code>
                    <button class="text-gray-500 hover:text-gray-300" @click="copyCode(c.code)" :title="copiedCode === c.code ? 'Copiado!' : 'Copiar'">
                      <component :is="copiedCode === c.code ? Check : Copy" :size="13" />
                    </button>
                  </div>
                </td>
                <td class="px-4 py-3 text-gray-400">{{ c.type === 'percentage' ? 'Porcentaje' : 'Fijo' }}</td>
                <td class="px-4 py-3 text-right font-medium text-gray-200">{{ c.type === 'percentage' ? c.value + '%' : '$' + fmtPrice(c.value) }}</td>
                <td class="px-4 py-3 text-center text-gray-400">{{ c.used }}{{ c.max_uses ? ' / ' + c.max_uses : '' }}</td>
                <td class="px-4 py-3 text-2xs text-gray-400">{{ fmtDate(c.expires_at) }}</td>
                <td class="px-4 py-3 text-center"><StatusBadge :status="c.is_expired ? 'expired' : c.active ? 'active' : 'inactive'" size="xs" /></td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button class="rounded p-1 text-gray-500 hover:bg-surface-700 hover:text-blue-400" @click="toggleUsages(c.id)" title="Historial de uso"><History :size="14" /></button>
                    <button class="rounded p-1 text-gray-500 hover:bg-surface-700 hover:text-gray-200" @click="openEdit(c)"><Pencil :size="14" /></button>
                    <button class="rounded p-1 text-gray-500 hover:bg-surface-700 hover:text-red-400" @click="confirmDeleteCoupon(c.id)"><Trash2 :size="14" /></button>
                  </div>
                </td>
              </tr>
              <!-- Usages -->
              <tr v-if="usagesCouponId === c.id">
                <td colspan="7" class="bg-surface-900/50 px-4 py-3">
                  <div v-if="usagesLoading" class="py-4 text-center text-sm text-gray-500">Cargando usos…</div>
                  <div v-else-if="usages.length === 0" class="py-4 text-center text-sm text-gray-500">Sin usos registrados</div>
                  <table v-else class="w-full text-xs">
                    <thead><tr class="text-gray-500"><th class="px-2 py-1 text-left">Usuario</th><th class="px-2 py-1 text-left">Orden</th><th class="px-2 py-1 text-right">Monto</th><th class="px-2 py-1 text-left">Fecha</th></tr></thead>
                    <tbody>
                      <tr v-for="u in usages" :key="u.id" class="text-gray-400">
                        <td class="px-2 py-1">{{ u.user.username }}</td>
                        <td class="px-2 py-1">{{ u.order_id || '—' }}</td>
                        <td class="px-2 py-1 text-right">${{ fmtPrice(u.amount) }}</td>
                        <td class="px-2 py-1">{{ fmtDate(u.used_at) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <ConfirmDialog v-model:open="confirmOpen" title="Eliminar cupón" message="¿Eliminar este cupón permanentemente?" variant="danger" :loading="confirmLoading" @confirm="handleDelete" />
  </div>
</template>
