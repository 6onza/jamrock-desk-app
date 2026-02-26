<script setup lang="ts">
/**
 * StatsPage — Detailed statistics with multiple charts and CSV export
 *
 * Features:
 *  - Period selector + custom date range
 *  - Revenue timeline bar chart
 *  - Orders doughnut by status
 *  - User registrations line chart
 *  - Performance summary cards with % changes
 *  - CSV export using Tauri dialog + fs API
 */
import { onMounted, ref, computed } from 'vue'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import PageHeader from '@/components/ui/PageHeader.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import { getOrderStats, getUserStats, clearStatsCache } from '@/services/statistics'
import { getOrderStatusStats } from '@/services/orders'
import type { StatsPeriod, OrderAnalyticsStats, UserStatisticsStats } from '@/types/statistics'
import type { OrderStatusCounts } from '@/types/orders'
import {
  ShoppingCart, DollarSign, Receipt, UserPlus, Home, CheckCircle,
   RefreshCw, Calendar, BarChart3, PieChart, Users, TrendingUp, ClipboardList,
} from 'lucide-vue-next'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

// ─── State ───
const isLoading = ref(false)
const error = ref<string | null>(null)

const selectedPeriod = ref<StatsPeriod>('month')
const customStart = ref('')
const customEnd = ref('')
const showCustomRange = ref(false)

const orderStats = ref<OrderAnalyticsStats | null>(null)
const userStats = ref<UserStatisticsStats | null>(null)
const statusCounts = ref<OrderStatusCounts | null>(null)

const periods: { key: StatsPeriod; label: string }[] = [
  { key: 'day', label: 'Hoy' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'year', label: 'Año' },
]

// ─── Fetch ───
async function fetchAllStats() {
  isLoading.value = true
  error.value = null
  try {
    const params =
      customStart.value && customEnd.value
        ? { start_date: customStart.value, end_date: customEnd.value }
        : { period: selectedPeriod.value }

    const [analytics, users, counts] = await Promise.all([
      getOrderStats(params),
      getUserStats(params),
      getOrderStatusStats(),
    ])

    orderStats.value = analytics.stats
    userStats.value = users.stats
    statusCounts.value = counts.counts ?? null
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Error al cargar estadísticas'
    console.error('[StatsPage]', e)
  } finally {
    isLoading.value = false
  }
}

function selectPeriod(p: StatsPeriod) {
  showCustomRange.value = false
  selectedPeriod.value = p
  customStart.value = ''
  customEnd.value = ''
  clearStatsCache()
  fetchAllStats()
}

function applyCustomRange() {
  if (customStart.value && customEnd.value) {
    clearStatsCache()
    fetchAllStats()
  }
}

// ─── Revenue Chart ───
const revenueChartData = computed(() => {
  const tl = orderStats.value?.timeline ?? []
  return {
    labels: tl.map((p) => {
      try { return format(new Date(p.date), 'dd MMM', { locale: es }) }
      catch { return p.date }
    }),
    datasets: [
      {
        label: 'Facturación ($)',
        data: tl.map((p) => p.value),
        backgroundColor: 'rgba(34,197,94,0.4)',
        borderColor: 'rgb(34,197,94)',
        borderWidth: 2,
        borderRadius: 4,
      },
    ],
  }
})

const revenueOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#9ca3af' } },
    tooltip: { backgroundColor: '#1f2937', titleColor: '#f9fafb', bodyColor: '#d1d5db' },
  },
  scales: {
    x: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(55,65,81,0.3)' } },
    y: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(55,65,81,0.3)' } },
  },
}

// ─── Orders by status doughnut ───
const statusChartData = computed(() => {
  const c = statusCounts.value
  if (!c) return { labels: [], datasets: [{ data: [], backgroundColor: [] as string[] }] }

  const items = [
    { label: 'Pendiente', value: c.pending, color: '#f59e0b' },
    { label: 'Pagado', value: c.paid, color: '#22c55e' },
    { label: 'Enviado', value: c.shipped, color: '#3b82f6' },
    { label: 'Cancelado', value: c.cancelled, color: '#ef4444' },
  ].filter((i) => i.value > 0)

  return {
    labels: items.map((i) => i.label),
    datasets: [{
      data: items.map((i) => i.value),
      backgroundColor: items.map((i) => i.color),
      borderWidth: 0,
    }],
  }
})

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '60%',
  plugins: {
    legend: { position: 'bottom' as const, labels: { color: '#9ca3af', padding: 12 } },
    tooltip: { backgroundColor: '#1f2937', titleColor: '#f9fafb', bodyColor: '#d1d5db' },
  },
}

// ─── User Registrations Line Chart ───
const userChartData = computed(() => {
  const tl = userStats.value?.timeline ?? []
  return {
    labels: tl.map((p) => {
      try { return format(new Date(p.date), 'dd MMM', { locale: es }) }
      catch { return p.date }
    }),
    datasets: [
      {
        label: 'Nuevos usuarios',
        data: tl.map((p) => p.count),
        borderColor: 'rgb(139,92,246)',
        backgroundColor: 'rgba(139,92,246,0.15)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: 'rgb(139,92,246)',
      },
    ],
  }
})

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#9ca3af' } },
    tooltip: { backgroundColor: '#1f2937', titleColor: '#f9fafb', bodyColor: '#d1d5db' },
  },
  scales: {
    x: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(55,65,81,0.3)' } },
    y: {
      beginAtZero: true,
      ticks: { color: '#6b7280', stepSize: 1 },
      grid: { color: 'rgba(55,65,81,0.3)' },
    },
  },
}

// ─── Performance cards ───
const performanceCards = computed(() => {
  const s = orderStats.value
  const u = userStats.value
  if (!s) return []
  return [
    {
      label: 'Ventas totales',
      value: formatNumber(s.ventas),
      change: s.changes?.ventas ?? null,
      icon: ShoppingCart,
    },
    {
      label: 'Facturación',
      value: formatCurrency(s.facturacion),
      change: s.changes?.facturacion ?? null,
      icon: DollarSign,
    },
    {
      label: 'Ticket promedio',
      value: formatCurrency(s.ticketPromedio),
      change: null,
      icon: Receipt,
    },
    {
      label: 'Clientes nuevos',
      value: formatNumber(u?.period_customers ?? 0),
      change: null,
      icon: UserPlus,
    },
    {
      label: 'Clientes totales',
      value: formatNumber(u?.total_customers ?? 0),
      change: null,
      icon: Home,
    },
    {
      label: 'Ventas pagadas',
      value: formatNumber(s.ventas_pagadas),
      change: null,
      icon: CheckCircle,
    },
  ]
})

function formatNumber(v: number): string {
  return new Intl.NumberFormat('es-AR').format(v)
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(v)
}

function changeClass(change: number | null): string {
  if (change === null || change === 0) return 'text-gray-500'
  return change > 0 ? 'text-green-400' : 'text-red-400'
}

function changeLabel(change: number | null): string {
  if (change === null) return ''
  const sign = change > 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}%`
}


// ─── Lifecycle ───
onMounted(() => {
  fetchAllStats()
})
</script>

<template>
  <div>
    <!-- Header -->
    <PageHeader title="Estadísticas" subtitle="Métricas detalladas y reportes">
      <template #actions>
        <button
          class="rounded-lg bg-surface-700 px-3 py-1.5 text-xs text-gray-300 transition hover:bg-surface-600"
          :disabled="isLoading"
          @click="() => { clearStatsCache(); fetchAllStats() }"
        >
          <RefreshCw :size="14" class="inline" /> Actualizar
        </button>
      </template>
    </PageHeader>

    <!-- Period selector -->
    <div class="mb-6 flex flex-wrap items-center gap-2">
      <button
        v-for="p in periods"
        :key="p.key"
        class="rounded-lg px-3 py-1.5 text-xs font-medium transition"
        :class="
          selectedPeriod === p.key && !customStart
            ? 'bg-primary-600 text-white'
            : 'bg-surface-700 text-gray-400 hover:bg-surface-600 hover:text-gray-200'
        "
        @click="selectPeriod(p.key)"
      >
        {{ p.label }}
      </button>
      <button
        class="rounded-lg px-3 py-1.5 text-xs font-medium transition"
        :class="
          showCustomRange
            ? 'bg-primary-600 text-white'
            : 'bg-surface-700 text-gray-400 hover:bg-surface-600 hover:text-gray-200'
        "
        @click="showCustomRange = !showCustomRange"
      >
        <Calendar :size="14" class="mr-1 inline" /> Personalizado
      </button>
      <div v-if="showCustomRange" class="flex items-center gap-2">
        <input
          v-model="customStart"
          type="date"
          class="rounded-md bg-surface-700 px-2 py-1 text-xs text-gray-300 outline-none focus:ring-1 focus:ring-primary-500"
        />
        <span class="text-xs text-gray-500">—</span>
        <input
          v-model="customEnd"
          type="date"
          class="rounded-md bg-surface-700 px-2 py-1 text-xs text-gray-300 outline-none focus:ring-1 focus:ring-primary-500"
        />
        <button
          class="rounded-md bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-500"
          @click="applyCustomRange"
        >
          Aplicar
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading && !orderStats" class="flex justify-center py-20">
      <LoadingSpinner size="lg" text="Cargando estadísticas..." />
    </div>

    <!-- Error -->
    <div
      v-else-if="error && !orderStats"
      class="rounded-xl border border-red-800/30 bg-red-900/10 p-6 text-center"
    >
      <p class="text-sm text-red-400">{{ error }}</p>
      <button
        class="mt-3 rounded-lg bg-red-600 px-4 py-1.5 text-xs text-white hover:bg-red-500"
        @click="fetchAllStats"
      >
        Reintentar
      </button>
    </div>

    <!-- Content -->
    <template v-else-if="orderStats">
      <!-- Performance summary cards -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div
          v-for="card in performanceCards"
          :key="card.label"
          class="card-hover"
        >
          <div class="flex items-start justify-between">
            <p class="text-2xs text-gray-500">{{ card.label }}</p>
            <component :is="card.icon" :size="16" class="text-primary-400" />
          </div>
          <p class="mt-1 text-lg font-bold text-gray-100">{{ card.value }}</p>
          <p
            v-if="card.change !== null"
            class="mt-0.5 text-2xs"
            :class="changeClass(card.change)"
          >
            {{ changeLabel(card.change) }} vs anterior
          </p>
        </div>
      </div>

      <!-- Charts grid -->
      <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Revenue timeline -->
        <div class="rounded-xl bg-surface-800 p-4">
          <h3 class="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-300"><BarChart3 :size="16" class="text-primary-400" /> Facturación en el tiempo</h3>
          <div class="h-72">
            <Bar
              v-if="(orderStats?.timeline ?? []).length > 0"
              :data="revenueChartData"
              :options="revenueOptions"
            />
            <div v-else class="flex h-full items-center justify-center text-sm text-gray-600">
              Sin datos para este período
            </div>
          </div>
        </div>

        <!-- Orders by status doughnut -->
        <div class="rounded-xl bg-surface-800 p-4">
          <h3 class="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-300"><PieChart :size="16" class="text-primary-400" /> Pedidos por estado</h3>
          <div class="h-72">
            <Doughnut
              v-if="statusChartData.labels.length > 0"
              :data="statusChartData"
              :options="doughnutOptions"
            />
            <div v-else class="flex h-full items-center justify-center text-sm text-gray-600">
              Sin pedidos
            </div>
          </div>
        </div>

        <!-- User registrations line chart -->
        <div class="rounded-xl bg-surface-800 p-4">
          <h3 class="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-300"><Users :size="16" class="text-primary-400" /> Registros de usuarios</h3>
          <div class="h-72">
            <Line
              v-if="(userStats?.timeline ?? []).length > 0"
              :data="userChartData"
              :options="lineOptions"
            />
            <div v-else class="flex h-full items-center justify-center text-sm text-gray-600">
              Sin datos de usuarios
            </div>
          </div>
        </div>

        <!-- Orders timeline (bar) -->
        <div class="rounded-xl bg-surface-800 p-4">
          <h3 class="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-300"><TrendingUp :size="16" class="text-primary-400" /> Pedidos en el tiempo</h3>
          <div class="h-72">
            <Bar
              v-if="(orderStats?.timeline ?? []).length > 0"
              :data="{
                labels: revenueChartData.labels,
                datasets: [{
                  label: 'Pedidos',
                  data: (orderStats?.timeline ?? []).map(p => p.orders),
                  backgroundColor: 'rgba(59,130,246,0.5)',
                  borderColor: 'rgb(59,130,246)',
                  borderWidth: 1,
                  borderRadius: 4,
                }]
              }"
              :options="revenueOptions"
            />
            <div v-else class="flex h-full items-center justify-center text-sm text-gray-600">
              Sin datos para este período
            </div>
          </div>
        </div>
      </div>

      <!-- Status breakdown table -->
      <div v-if="statusCounts" class="mt-6 rounded-xl bg-surface-800 p-4">
        <h3 class="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-300"><ClipboardList :size="16" class="text-primary-400" /> Desglose por estado</h3>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div
            v-for="item in [
              { label: 'Pendiente', value: statusCounts.pending, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'Pagado', value: statusCounts.paid, color: 'text-green-400', bg: 'bg-green-500/10' },
              { label: 'Enviado', value: statusCounts.shipped, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Cancelado', value: statusCounts.cancelled, color: 'text-red-400', bg: 'bg-red-500/10' },
            ]"
            :key="item.label"
            class="rounded-lg p-3"
            :class="item.bg"
          >
            <p class="text-xs text-gray-400">{{ item.label }}</p>
            <p class="mt-1 text-2xl font-bold" :class="item.color">{{ item.value }}</p>
          </div>
        </div>
      </div>

      <!-- Background refresh indicator -->
      <div
        v-if="isLoading && orderStats"
        class="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg bg-surface-800 px-3 py-2 shadow-lg"
      >
        <LoadingSpinner size="sm" />
        <span class="text-xs text-gray-400">Actualizando...</span>
      </div>
    </template>
  </div>
</template>
