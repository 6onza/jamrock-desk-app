<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus, Search, Calendar, RotateCcw,
  ChevronDown, Printer, Truck,
  MoreVertical, Eye, Trash2,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useOrdersStore } from '@/stores/orders'
import { notifyShipping } from '@/services/orders'
import type { Order, OrderStatus } from '@/types/orders'
import { ORDER_STATUS_LABELS, ORDER_TRANSITIONS } from '@/types/orders'

const router = useRouter()
const store = useOrdersStore()
const PAGE_SIZE = 10

// ── Local UI state ──
const actionsOpenId = ref<number | null>(null)
const actionMenuPos = ref({ top: 0, right: 0 })
const dateDropdownOpen = ref(false)
const confirmOpen = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmAction = ref<(() => Promise<void>) | null>(null)
const notifyingId = ref<number | null>(null)
const statusChangingId = ref<number | null>(null)

// Date filter
const datePreset = ref('')
const customStart = ref('')
const customEnd = ref('')
const showCustomDates = ref(false)

// Status tabs
const statusTabs: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'paid', label: 'Pagados' },
  { value: 'shipped', label: 'Enviados' },
  { value: 'cancelled', label: 'Cancelados' },
  { value: 'archived', label: 'Archivados' },
]

function statusCount(s: OrderStatus): number {
  if (!store.stats) return 0
  return (store.stats as Record<string, number>)[s] ?? 0
}

// ── Formatting ──
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
}
function fmtPrice(n: number) {
  return Math.round(n).toLocaleString('es-AR')
}

// ── Filter actions ──
async function setStatus(s: OrderStatus | '') {
  store.setFilter('status', store.filters.status === s ? '' : s)
  await reload()
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
function onSearch(e: Event) {
  const v = (e.target as HTMLInputElement).value
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    store.setFilter('search', v)
    await reload()
  }, 400)
}

async function applyDatePreset(preset: string) {
  datePreset.value = preset
  dateDropdownOpen.value = false
  showCustomDates.value = false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let s = ''
  let e = ''
  switch (preset) {
    case 'today':
      s = today.toISOString().split('T')[0]
      e = new Date(today.getTime() + 86400000).toISOString().split('T')[0]
      break
    case 'week': {
      const sw = new Date(today)
      sw.setDate(today.getDate() - today.getDay())
      s = sw.toISOString().split('T')[0]
      const ew = new Date(sw)
      ew.setDate(sw.getDate() + 7)
      e = ew.toISOString().split('T')[0]
      break
    }
    case 'month':
      s = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
      e = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
      break
    case 'year':
      s = `${today.getFullYear()}-01-01`
      e = `${today.getFullYear() + 1}-01-01`
      break
  }
  store.setFilter('start_date', s || undefined)
  store.setFilter('end_date', e || undefined)
  await reload()
}

async function applyCustomDates() {
  if (customStart.value && customEnd.value) {
    datePreset.value = 'custom'
    store.setFilter('start_date', customStart.value)
    store.setFilter('end_date', customEnd.value)
    dateDropdownOpen.value = false
    showCustomDates.value = false
    await reload()
  }
}

async function clearDate() {
  datePreset.value = ''
  customStart.value = ''
  customEnd.value = ''
  showCustomDates.value = false
  store.setFilter('start_date', undefined)
  store.setFilter('end_date', undefined)
  dateDropdownOpen.value = false
  await reload()
}

async function clearAll() {
  store.clearFilters()
  datePreset.value = ''
  customStart.value = ''
  customEnd.value = ''
  showCustomDates.value = false
  await reload()
}

// ── Navigation ──
function goDetail(o: Order) { router.push(`/orders/${o.id}`) }
function goPrint(id: number) {
  const r = router.resolve(`/orders/${id}/print`)
  window.open(r.href, '_blank')
}

// ── Row actions ──
function toggleActions(id: number, event: MouseEvent) {
  if (actionsOpenId.value === id) { actionsOpenId.value = null; return }
  const btn = event.currentTarget as HTMLElement
  const rect = btn.getBoundingClientRect()
  actionMenuPos.value = { top: rect.bottom + 4, right: window.innerWidth - rect.right }
  actionsOpenId.value = id
}

async function handleStatusChange(order: Order, status: string) {
  actionsOpenId.value = null
  statusChangingId.value = order.id
  try { await store.changeStatus(order.id, status) } finally { statusChangingId.value = null }
}

async function handleNotify(order: Order) {
  actionsOpenId.value = null
  notifyingId.value = order.id
  try {
    await notifyShipping(order.id)
    await reload()
  } finally { notifyingId.value = null }
}

function confirmDelete(order: Order) {
  actionsOpenId.value = null
  confirmTitle.value = 'Eliminar pedido'
  confirmMessage.value = `¿Eliminar pedido #${order.id}? Esta acción no se puede deshacer.`
  confirmAction.value = async () => {
    await store.removeOrder(order.id)
    confirmOpen.value = false
  }
  confirmOpen.value = true
}

const transitions = (order: Order): OrderStatus[] =>
  (ORDER_TRANSITIONS[order.status] ?? []).filter((s) => s !== order.status)

// ── Pagination ──
async function goToPage(p: number) {
  store.filters.page = p
  await store.fetchOrders()
}

async function reload() {
  await Promise.all([store.fetchOrders(), store.fetchStats()])
}

// ── Computed ──
const currentPage = computed(() => store.filters.page ?? 1)
const totalPages = computed(() => Math.max(1, Math.ceil(store.totalCount / PAGE_SIZE)))
const pageRange = computed(() => {
  const pages: number[] = []
  const t = totalPages.value
  const c = currentPage.value
  for (let i = Math.max(1, c - 2); i <= Math.min(t, c + 2); i++) pages.push(i)
  return pages
})

const activeOrder = computed<Order | null>(() =>
  actionsOpenId.value !== null
    ? (store.orders.find((o) => o.id === actionsOpenId.value) ?? null)
    : null,
)

const dateLabel = computed(() => {
  const labels: Record<string, string> = {
    today: 'Hoy', week: 'Esta semana', month: 'Este mes',
    year: 'Este año', custom: 'Personalizado',
  }
  return labels[datePreset.value] || 'Fecha'
})

// ── Close dropdowns on outside click ──
function onDocClick(ev: MouseEvent) {
  const t = ev.target as HTMLElement
  if (!t.closest('[data-actions-menu]')) actionsOpenId.value = null
  if (!t.closest('[data-date-dropdown]')) dateDropdownOpen.value = false
}
onMounted(() => { reload(); document.addEventListener('click', onDocClick) })
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div>
    <PageHeader title="Pedidos" :subtitle="`${store.totalCount} pedidos · ${store.openOrdersCount} abiertos`">
      <template #actions>
        <router-link
          to="/orders/new"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          <Plus :size="16" /> Nueva venta
        </router-link>
      </template>
    </PageHeader>

    <!-- Status Tabs -->
    <div class="mt-6 flex flex-wrap items-center gap-2">
      <button
        v-for="tab in statusTabs" :key="tab.value"
        class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
        :class="store.filters.status === tab.value
          ? 'bg-primary-500/15 text-primary-400 ring-1 ring-primary-500/30'
          : 'text-gray-400 hover:bg-surface-700/50 hover:text-gray-200'"
        @click="setStatus(tab.value)"
      >
        {{ tab.label }}
        <span
          v-if="tab.value !== '' && store.stats"
          class="rounded-full bg-surface-700/60 px-1.5 text-2xs"
        >{{ statusCount(tab.value as OrderStatus) }}</span>
      </button>
    </div>

    <!-- Filters bar -->
    <div class="mt-4 flex flex-wrap items-center gap-3">
      <div class="relative flex-1" style="min-width: 200px; max-width: 320px">
        <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text" :value="store.filters.search" class="input-field pl-9 text-sm"
          placeholder="Buscar por nombre, email o #…" @input="onSearch"
        />
      </div>

      <!-- Date dropdown -->
      <div class="relative" data-date-dropdown>
        <button
          class="inline-flex items-center gap-1.5 rounded-lg border border-surface-700/50 bg-surface-800 px-3 py-2 text-xs text-gray-400 transition-colors hover:text-gray-200"
          :class="datePreset ? 'ring-1 ring-primary-500/30 text-primary-400' : ''"
          @click.stop="dateDropdownOpen = !dateDropdownOpen"
        >
          <Calendar :size="14" /> {{ dateLabel }}
          <ChevronDown :size="14" :class="dateDropdownOpen ? 'rotate-180' : ''" class="transition-transform" />
        </button>
        <div v-if="dateDropdownOpen" class="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-surface-700/50 bg-surface-800 p-1 shadow-xl">
          <button
            v-for="dp in ['today', 'week', 'month', 'year']" :key="dp"
            class="w-full rounded-md px-3 py-2 text-left text-xs text-gray-300 hover:bg-surface-700/50"
            @click="applyDatePreset(dp)"
          >{{ { today: 'Hoy', week: 'Esta semana', month: 'Este mes', year: 'Este año' }[dp] }}</button>
          <hr class="my-1 border-surface-700/50" />
          <button class="w-full rounded-md px-3 py-2 text-left text-xs text-gray-300 hover:bg-surface-700/50" @click.stop="showCustomDates = !showCustomDates">
            Rango personalizado
          </button>
          <div v-if="showCustomDates" class="space-y-2 px-3 py-2">
            <input v-model="customStart" type="date" class="input-field text-xs" />
            <input v-model="customEnd" type="date" class="input-field text-xs" />
            <button class="w-full rounded-md bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600" @click="applyCustomDates">Aplicar</button>
          </div>
          <hr class="my-1 border-surface-700/50" />
          <button class="w-full rounded-md px-3 py-2 text-left text-xs text-gray-400 hover:bg-surface-700/50" @click="clearDate">Limpiar fecha</button>
        </div>
      </div>

      <button v-if="store.filters.search || store.filters.status || datePreset" class="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300" @click="clearAll">
        <RotateCcw :size="12" /> Limpiar todo
      </button>
    </div>

    <!-- Table -->
    <div class="mt-6 overflow-hidden rounded-xl border border-surface-700/50">
      <div v-if="store.loading" class="flex items-center justify-center py-20">
        <LoadingSpinner text="Cargando pedidos…" />
      </div>
      <div v-else-if="store.orders.length === 0" class="py-16">
        <EmptyState title="No hay pedidos" message="No se encontraron pedidos con los filtros seleccionados." />
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-700/50 bg-surface-800">
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">#</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Fecha</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Cliente</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Total</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Productos</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Estado</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Envío</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="order in store.orders" :key="order.id"
              class="border-b border-surface-700/30 transition-colors hover:bg-surface-800/60 cursor-pointer"
              @click="goDetail(order)"
            >
              <td class="px-4 py-3">
                <span class="rounded-full bg-primary-500/10 px-2 py-0.5 text-xs font-semibold text-primary-400">#{{ order.id }}</span>
              </td>
              <td class="px-4 py-3 text-gray-400">{{ fmtDate(order.created_at) }}</td>
              <td class="px-4 py-3">
                <div class="text-gray-200">{{ order.recipient_name || '—' }}</div>
                <div class="text-2xs text-gray-500">{{ order.customer_email }}</div>
              </td>
              <td class="px-4 py-3 text-right font-medium text-gray-200">${{ fmtPrice(order.total) }}</td>
              <td class="px-4 py-3 text-center text-gray-400">{{ order.products?.length ?? 0 }}</td>
              <td class="px-4 py-3"><StatusBadge :status="order.status" size="xs" /></td>
              <td class="px-4 py-3">
                <span class="text-2xs text-gray-500">{{ order.delivery_type === 'delivery' ? 'Envío' : 'Retiro' }}</span>
              </td>
              <td class="px-4 py-3 text-right" @click.stop>
                <div class="relative inline-block" data-actions-menu>
                  <button class="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-surface-700/50 hover:text-gray-300" @click.stop="toggleActions(order.id, $event)">
                    <MoreVertical :size="16" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1 && !store.loading" class="mt-4 flex items-center justify-between text-xs text-gray-500">
      <span>Mostrando {{ (currentPage - 1) * PAGE_SIZE + 1 }}–{{ Math.min(currentPage * PAGE_SIZE, store.totalCount) }} de {{ store.totalCount }}</span>
      <div class="flex items-center gap-1">
        <button class="rounded-md px-2 py-1 hover:bg-surface-700/50 disabled:opacity-30" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">‹ Ant</button>
        <button
          v-for="p in pageRange" :key="p"
          class="rounded-md px-2.5 py-1" :class="p === currentPage ? 'bg-primary-500/15 text-primary-400 font-medium' : 'hover:bg-surface-700/50'"
          @click="goToPage(p)"
        >{{ p }}</button>
        <button class="rounded-md px-2 py-1 hover:bg-surface-700/50 disabled:opacity-30" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">Sig ›</button>
      </div>
    </div>

    <!-- Actions dropdown — teleported to body to escape overflow-hidden / overflow-x-auto clipping -->
    <Teleport to="body">
      <div
        v-if="activeOrder"
        :style="{ position: 'fixed', top: actionMenuPos.top + 'px', right: actionMenuPos.right + 'px', zIndex: 9999 }"
        class="w-52 rounded-lg border border-surface-700/50 bg-surface-800 p-1 shadow-xl"
        data-actions-menu
      >
        <button class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-gray-300 hover:bg-surface-700/50" @click="actionsOpenId = null; goDetail(activeOrder!)">
          <Eye :size="14" /> Ver detalle
        </button>
        <button class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-gray-300 hover:bg-surface-700/50" @click="actionsOpenId = null; goPrint(activeOrder!.id)">
          <Printer :size="14" /> Imprimir
        </button>
        <hr class="my-1 border-surface-700/50" />
        <div class="px-3 py-1 text-2xs font-medium uppercase tracking-wider text-gray-600">Cambiar estado</div>
        <button
          v-for="t in transitions(activeOrder!)" :key="t"
          class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-gray-300 hover:bg-surface-700/50 disabled:opacity-30"
          :disabled="statusChangingId === activeOrder!.id"
          @click="handleStatusChange(activeOrder!, t)"
        >{{ ORDER_STATUS_LABELS[t] }}</button>
        <template v-if="activeOrder!.status === 'shipped' && !activeOrder!.shipping_notification_sent">
          <hr class="my-1 border-surface-700/50" />
          <button
            class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-gray-300 hover:bg-surface-700/50 disabled:opacity-30"
            :disabled="notifyingId === activeOrder!.id"
            @click="handleNotify(activeOrder!)"
          ><Truck :size="14" /> {{ notifyingId === activeOrder!.id ? 'Enviando…' : 'Notificar envío' }}</button>
        </template>
        <hr class="my-1 border-surface-700/50" />
        <button class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-red-400 hover:bg-red-500/10" @click="confirmDelete(activeOrder!)">
          <Trash2 :size="14" /> Eliminar
        </button>
      </div>
    </Teleport>

    <!-- Confirm Dialog -->
    <ConfirmDialog
      :open="confirmOpen" :title="confirmTitle" :message="confirmMessage"
      confirm-label="Eliminar" variant="danger"
      @confirm="confirmAction?.()" @cancel="confirmOpen = false" @update:open="confirmOpen = $event"
    />
  </div>
</template>
