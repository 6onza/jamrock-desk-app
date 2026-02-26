<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  ShoppingCart, TrendingDown, RefreshCw, ArrowRightCircle,
  Search, DollarSign,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import {
  getAbandonedCarts,
  getAbandonedCartStatistics,
  identifyAbandonedCarts,
  recoverAbandonedCart,
  convertAbandonedCartToOrder,
} from '@/services/abandonedCarts'
import type { AbandonedCart, AbandonedCartStatistics, AbandonedCartStatus } from '@/types/orders'

// ── State ──
const carts = ref<AbandonedCart[]>([])
const stats = ref<AbandonedCartStatistics | null>(null)
const loading = ref(true)
const statsLoading = ref(true)
const actionLoading = ref<number | null>(null)
const identifyLoading = ref(false)
const period = ref('month')
const statusFilter = ref<AbandonedCartStatus | ''>('')

// ── Data loading ──
async function loadStats() {
  statsLoading.value = true
  try { stats.value = await getAbandonedCartStatistics(period.value) }
  finally { statsLoading.value = false }
}
async function loadCarts() {
  loading.value = true
  try { carts.value = await getAbandonedCarts(statusFilter.value ? { status: statusFilter.value } : {}) }
  finally { loading.value = false }
}
async function reload() { await Promise.all([loadStats(), loadCarts()]) }

// ── Actions ──
async function handleIdentify() {
  identifyLoading.value = true
  try { const res = await identifyAbandonedCarts(); if (res.marked_count > 0) await reload() }
  finally { identifyLoading.value = false }
}
async function handleRecover(id: number) {
  actionLoading.value = id
  try { await recoverAbandonedCart(id); await reload() }
  finally { actionLoading.value = null }
}
async function handleConvert(id: number) {
  actionLoading.value = id
  try { await convertAbandonedCartToOrder(id); await reload() }
  finally { actionLoading.value = null }
}
async function setPeriod(p: string) { period.value = p; await loadStats() }
async function setStatus(s: AbandonedCartStatus | '') { statusFilter.value = s; await loadCarts() }

// ── Formatting ──
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}
function fmtPrice(n: number) { return Math.round(n).toLocaleString('es-AR') }
function fmtMinutes(mins: number | null) {
  if (mins == null) return '—'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

onMounted(() => reload())
</script>

<template>
  <div>
    <PageHeader title="Carritos abandonados" subtitle="Seguimiento y recuperación de carritos sin finalizar">
      <template #actions>
        <button
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
          :disabled="identifyLoading" @click="handleIdentify"
        >
          <Search :size="16" /> {{ identifyLoading ? 'Identificando…' : 'Identificar abandonados' }}
        </button>
      </template>
    </PageHeader>

    <!-- Period tabs -->
    <div class="mt-4 flex items-center gap-2">
      <span class="text-xs text-gray-500">Período:</span>
      <button
        v-for="p in [{ v: 'week', l: 'Semana' }, { v: 'month', l: 'Mes' }, { v: 'quarter', l: 'Trimestre' }, { v: 'year', l: 'Año' }]"
        :key="p.v"
        class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
        :class="period === p.v ? 'bg-primary-500/15 text-primary-400' : 'text-gray-400 hover:text-gray-200'"
        @click="setPeriod(p.v)"
      >{{ p.l }}</button>
    </div>

    <!-- Statistics Cards -->
    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div v-if="statsLoading" class="col-span-full flex justify-center py-8">
        <LoadingSpinner text="Cargando estadísticas…" />
      </div>
      <template v-else-if="stats">
        <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-4">
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-orange-500/10 p-2"><ShoppingCart :size="20" class="text-orange-400" /></div>
            <div>
              <p class="text-2xs text-gray-500">Total abandonados</p>
              <p class="text-xl font-bold text-gray-200">{{ stats.abandoned_count }}</p>
            </div>
          </div>
        </div>
        <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-4">
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-green-500/10 p-2"><RefreshCw :size="20" class="text-green-400" /></div>
            <div>
              <p class="text-2xs text-gray-500">Recuperados</p>
              <p class="text-xl font-bold text-gray-200">{{ stats.recovered_count }}</p>
              <p class="text-2xs text-green-400">{{ stats.recovery_rate.toFixed(1) }}% tasa</p>
            </div>
          </div>
        </div>
        <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-4">
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-red-500/10 p-2"><TrendingDown :size="20" class="text-red-400" /></div>
            <div>
              <p class="text-2xs text-gray-500">Tasa de abandono</p>
              <p class="text-xl font-bold text-gray-200">{{ stats.abandonment_rate.toFixed(1) }}%</p>
            </div>
          </div>
        </div>
        <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-4">
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-blue-500/10 p-2"><DollarSign :size="20" class="text-blue-400" /></div>
            <div>
              <p class="text-2xs text-gray-500">Valor promedio</p>
              <p class="text-xl font-bold text-gray-200">${{ fmtPrice(stats.average_value) }}</p>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Status filter tabs -->
    <div class="mt-6 flex flex-wrap items-center gap-2">
      <button
        v-for="tab in [
          { v: '' as const, l: 'Todos' },
          { v: 'abandoned' as AbandonedCartStatus, l: 'Abandonados' },
          { v: 'active' as AbandonedCartStatus, l: 'Activos' },
          { v: 'recovered' as AbandonedCartStatus, l: 'Recuperados' },
          { v: 'converted' as AbandonedCartStatus, l: 'Convertidos' },
        ]" :key="tab.v"
        class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
        :class="statusFilter === tab.v
          ? 'bg-primary-500/15 text-primary-400 ring-1 ring-primary-500/30'
          : 'text-gray-400 hover:bg-surface-700/50'"
        @click="setStatus(tab.v)"
      >{{ tab.l }}</button>
    </div>

    <!-- Carts Table -->
    <div class="mt-4 overflow-hidden rounded-xl border border-surface-700/50">
      <div v-if="loading" class="flex items-center justify-center py-20">
        <LoadingSpinner text="Cargando carritos…" />
      </div>
      <div v-else-if="carts.length === 0" class="py-16">
        <EmptyState title="Sin carritos" message="No se encontraron carritos abandonados para el período seleccionado." />
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-700/50 bg-surface-800">
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">#</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Cliente</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Items</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Total</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Estado</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Abandonado</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Tiempo</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cart in carts" :key="cart.id" class="border-b border-surface-700/30 transition-colors hover:bg-surface-800/60">
              <td class="px-4 py-3 text-gray-400">#{{ cart.id }}</td>
              <td class="px-4 py-3">
                <p class="text-gray-200">{{ cart.customer?.name || cart.customer_email || 'Anónimo' }}</p>
                <p v-if="cart.customer?.email" class="text-2xs text-gray-500">{{ cart.customer.email }}</p>
              </td>
              <td class="px-4 py-3 text-center text-gray-400">{{ cart.items_count }}</td>
              <td class="px-4 py-3 text-right font-medium text-gray-200">${{ fmtPrice(cart.total) }}</td>
              <td class="px-4 py-3"><StatusBadge :status="cart.status" size="xs" /></td>
              <td class="px-4 py-3 text-gray-400 text-2xs">{{ fmtDate(cart.abandoned_at) }}</td>
              <td class="px-4 py-3 text-gray-400 text-2xs">{{ fmtMinutes(cart.time_abandoned) }}</td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <button
                    v-if="cart.status === 'abandoned'"
                    class="rounded-md bg-green-500/10 px-2.5 py-1 text-2xs font-medium text-green-400 hover:bg-green-500/20 disabled:opacity-50"
                    :disabled="actionLoading === cart.id" @click="handleRecover(cart.id)"
                  ><RefreshCw :size="12" class="inline mr-0.5" /> Recuperar</button>
                  <button
                    v-if="cart.status === 'abandoned' || cart.status === 'recovered'"
                    class="rounded-md bg-blue-500/10 px-2.5 py-1 text-2xs font-medium text-blue-400 hover:bg-blue-500/20 disabled:opacity-50"
                    :disabled="actionLoading === cart.id" @click="handleConvert(cart.id)"
                  ><ArrowRightCircle :size="12" class="inline mr-0.5" /> Convertir</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
