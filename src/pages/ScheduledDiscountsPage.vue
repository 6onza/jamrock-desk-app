<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Pencil, Trash2, X, Save, Play, Square, ToggleLeft, ToggleRight } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import {
  getScheduledDiscounts, createScheduledDiscount, updateScheduledDiscount,
  deleteScheduledDiscount, applyNow, removeNow,
} from '@/services/scheduledDiscounts'
import { getCategories } from '@/services/products'
import type { ScheduledCategoryDiscount, ScheduledDiscountFormData, DayOfWeek } from '@/types/marketing'
import { DAY_LABELS } from '@/types/marketing'
import type { Category } from '@/types/products'

const discounts = ref<ScheduledCategoryDiscount[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const showForm = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const formError = ref('')
const actionMsg = ref('')

// Delete
const confirmOpen = ref(false)
const deleteId = ref<string | null>(null)
const confirmLoading = ref(false)

const defaultForm = (): ScheduledDiscountFormData => ({
  name: '', description: '', category: null, day_of_week: todayDow.value,
  discount: 10, start_time: null, end_time: null, active: true,
  valid_from: null, valid_until: null,
})
const form = ref<ScheduledDiscountFormData>(defaultForm())

// Current day of week (Python-style: 0=Monday)
const todayDow = computed<DayOfWeek>(() => {
  const js = new Date().getDay() // 0=Sunday
  return (js === 0 ? 6 : js - 1) as DayOfWeek
})

const days: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6]

// Group discounts by day
const byDay = computed(() => {
  const map: Record<number, ScheduledCategoryDiscount[]> = {}
  for (const d of days) map[d] = []
  for (const disc of discounts.value) {
    if (map[disc.day_of_week]) map[disc.day_of_week].push(disc)
  }
  return map
})

async function load() {
  loading.value = true
  try {
    ;[discounts.value, categories.value] = await Promise.all([getScheduledDiscounts(), getCategories()])
  } finally { loading.value = false }
}

function openCreate(day?: DayOfWeek) {
  form.value = { ...defaultForm(), day_of_week: day ?? todayDow.value }
  editingId.value = null; formError.value = ''; showForm.value = true
}

function openEdit(d: ScheduledCategoryDiscount) {
  editingId.value = d.id
  form.value = {
    name: d.name, description: d.description || '', category: d.category,
    day_of_week: d.day_of_week, discount: d.discount,
    start_time: d.start_time, end_time: d.end_time, active: d.active,
    valid_from: d.valid_from ? d.valid_from.slice(0, 16) : null,
    valid_until: d.valid_until ? d.valid_until.slice(0, 16) : null,
  }
  formError.value = ''; showForm.value = true
}

async function saveForm() {
  saving.value = true; formError.value = ''
  try {
    const payload: ScheduledDiscountFormData = {
      ...form.value,
      valid_from: form.value.valid_from ? new Date(form.value.valid_from).toISOString() : null,
      valid_until: form.value.valid_until ? new Date(form.value.valid_until).toISOString() : null,
    }
    if (editingId.value) await updateScheduledDiscount(editingId.value, payload)
    else await createScheduledDiscount(payload)
    showForm.value = false; editingId.value = null; await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { detail?: string; non_field_errors?: string[] } }; message?: string }
    formError.value = err?.response?.data?.non_field_errors?.[0] || err?.response?.data?.detail || err?.message || 'Error al guardar'
  } finally { saving.value = false }
}

function confirmDeleteDiscount(id: string) { deleteId.value = id; confirmOpen.value = true }
async function handleDelete() {
  confirmLoading.value = true
  try { if (deleteId.value) { await deleteScheduledDiscount(deleteId.value); await load() } }
  finally { confirmLoading.value = false; confirmOpen.value = false }
}

async function doApplyNow(id: string) {
  try {
    const res = await applyNow(id)
    actionMsg.value = res.message || 'Aplicado'
    await load()
    setTimeout(() => { actionMsg.value = '' }, 3000)
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    actionMsg.value = err?.response?.data?.message || err?.message || 'Error'
  }
}

async function doRemoveNow(id: string) {
  try {
    const res = await removeNow(id)
    actionMsg.value = res.message || 'Removido'
    await load()
    setTimeout(() => { actionMsg.value = '' }, 3000)
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    actionMsg.value = err?.response?.data?.message || err?.message || 'Error'
  }
}

function getCatName(id: number | null) {
  if (id == null) return '—'
  return categories.value.find(c => c.id === id)?.name || `Categoría #${id}`
}

onMounted(() => load())
</script>

<template>
  <div>
    <PageHeader title="Descuentos programados" subtitle="Descuentos automáticos por día de la semana">
      <template #actions>
        <button v-if="!showForm" class="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600" @click="openCreate()">
          <Plus :size="16" /> Nuevo descuento
        </button>
      </template>
    </PageHeader>

    <!-- Action message -->
    <div v-if="actionMsg" class="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-400">{{ actionMsg }}</div>

    <!-- Form -->
    <div v-if="showForm" class="mb-6 rounded-xl border border-surface-700/50 bg-surface-800 p-5">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-gray-200">{{ editingId ? 'Editar descuento' : 'Nuevo descuento programado' }}</h2>
        <button class="text-gray-500 hover:text-gray-300" @click="showForm = false"><X :size="18" /></button>
      </div>
      <form @submit.prevent="saveForm" class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div class="sm:col-span-2">
            <label class="mb-1 block text-2xs font-medium text-gray-400">Nombre</label>
            <input v-model="form.name" required class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" placeholder="Descuento Martes Fertilizantes" />
          </div>
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Descuento (%)</label>
            <input v-model.number="form.discount" type="number" min="1" max="100" required class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Categoría</label>
            <select v-model.number="form.category" required class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none">
              <option :value="null" disabled>Seleccionar…</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Día de la semana</label>
            <select v-model.number="form.day_of_week" required class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none">
              <option v-for="d in days" :key="d" :value="d">{{ DAY_LABELS[d] }}</option>
            </select>
          </div>
          <div class="flex items-end">
            <label class="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
              <button type="button" @click="form.active = !form.active" class="text-gray-400 hover:text-gray-200">
                <component :is="form.active ? ToggleRight : ToggleLeft" :size="24" :class="form.active ? 'text-primary-400' : ''" />
              </button>
              {{ form.active ? 'Activo' : 'Inactivo' }}
            </label>
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Hora inicio <span class="text-gray-600">(opcional)</span></label>
            <input v-model="form.start_time" type="time" class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
          </div>
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Hora fin <span class="text-gray-600">(opcional)</span></label>
            <input v-model="form.end_time" type="time" class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
          </div>
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Válido desde <span class="text-gray-600">(opcional)</span></label>
            <input v-model="form.valid_from" type="datetime-local" class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
          </div>
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Válido hasta <span class="text-gray-600">(opcional)</span></label>
            <input v-model="form.valid_until" type="datetime-local" class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
          </div>
        </div>
        <div>
          <label class="mb-1 block text-2xs font-medium text-gray-400">Descripción <span class="text-gray-600">(opcional)</span></label>
          <textarea v-model="form.description" rows="2" class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
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

    <!-- Weekly Calendar -->
    <div v-if="loading" class="flex justify-center py-20"><LoadingSpinner text="Cargando descuentos…" /></div>
    <div v-else-if="discounts.length === 0 && !showForm" class="py-16"><EmptyState title="Sin descuentos programados" message="Programá descuentos automáticos por día de la semana." /></div>
    <div v-else class="grid gap-3 md:grid-cols-7">
      <div v-for="day in days" :key="day"
        class="rounded-xl border p-3 transition-colors"
        :class="day === todayDow ? 'border-primary-500/50 bg-primary-500/5' : 'border-surface-700/50 bg-surface-800/50'">
        <!-- Day header -->
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-bold" :class="day === todayDow ? 'text-primary-400' : 'text-gray-400'">
            {{ DAY_LABELS[day] }}
          </span>
          <span v-if="day === todayDow" class="rounded-full bg-primary-500/20 px-1.5 py-0.5 text-2xs font-medium text-primary-400">Hoy</span>
          <button v-else class="rounded p-0.5 text-gray-600 hover:text-gray-400" @click="openCreate(day)" title="Agregar">
            <Plus :size="12" />
          </button>
        </div>
        <!-- Discount cards -->
        <div class="space-y-2">
          <div v-for="d in byDay[day]" :key="d.id"
            class="rounded-lg border p-2 text-xs"
            :class="d.is_active_now ? 'border-green-500/30 bg-green-500/10' : d.active ? 'border-surface-700/50 bg-surface-900/50' : 'border-surface-700/30 bg-surface-900/30 opacity-60'">
            <div class="mb-1 flex items-center justify-between">
              <span class="font-medium text-gray-200 line-clamp-1" :title="d.name">{{ d.name }}</span>
              <span class="ml-1 font-bold text-green-400">{{ d.discount }}%</span>
            </div>
            <p class="text-2xs text-gray-500">{{ d.category_name || getCatName(d.category) }}</p>
            <p v-if="d.start_time || d.end_time" class="text-2xs text-gray-600">
              {{ d.start_time || '00:00' }} — {{ d.end_time || '23:59' }}
            </p>
            <div v-if="d.affected_products_count" class="text-2xs text-gray-600">{{ d.affected_products_count }} productos</div>
            <!-- Actions -->
            <div class="mt-1.5 flex items-center gap-1">
              <button v-if="d.active && !d.is_active_now" class="rounded p-0.5 text-green-500 hover:bg-green-500/10" @click="doApplyNow(d.id)" title="Aplicar ahora">
                <Play :size="11" />
              </button>
              <button v-if="d.is_active_now" class="rounded p-0.5 text-amber-500 hover:bg-amber-500/10" @click="doRemoveNow(d.id)" title="Remover ahora">
                <Square :size="11" />
              </button>
              <button class="rounded p-0.5 text-gray-500 hover:text-gray-300" @click="openEdit(d)"><Pencil :size="11" /></button>
              <button class="rounded p-0.5 text-gray-500 hover:text-red-400" @click="confirmDeleteDiscount(d.id)"><Trash2 :size="11" /></button>
              <StatusBadge v-if="d.is_active_now" status="active" size="xs" class="ml-auto" />
            </div>
          </div>
          <p v-if="byDay[day].length === 0" class="py-2 text-center text-2xs text-gray-600">Sin descuentos</p>
        </div>
      </div>
    </div>

    <ConfirmDialog v-model:open="confirmOpen" title="Eliminar descuento" message="¿Eliminar este descuento programado?" variant="danger" :loading="confirmLoading" @confirm="handleDelete" />
  </div>
</template>
