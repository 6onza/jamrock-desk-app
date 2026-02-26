<script setup lang="ts">
/**
 * DashboardPage — Main admin dashboard
 *
 * Features:
 *  - Period selector (day / week / month / year + custom date range)
 *  - 6 stat cards with % change indicators
 *  - Revenue bar/line chart (vue-chartjs)
 *  - Orders doughnut chart by status
 *  - Recent orders table (latest 10)
 *  - Quick action buttons
 *  - Auto-refresh every 5 min
 */
import { onMounted, onUnmounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Bar, Doughnut } from 'vue-chartjs'
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
import StatusBadge from '@/components/ui/StatusBadge.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useDashboardStore } from '@/stores/dashboard'
import type { StatsPeriod } from '@/types/statistics'
import {
  ShoppingCart, DollarSign, Clock, UserPlus, Receipt, CheckCircle,
  PlusCircle, Package, TrendingUp, RefreshCw, Calendar,
} from 'lucide-vue-next'

// Register Chart.js components
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

useKeyboardShortcuts()

const router = useRouter()
const dashboard = useDashboardStore()

const showCustomRange = ref(false)
const customStart = ref('')
const customEnd = ref('')

// ─── Period selector ───
const periods: { key: StatsPeriod; label: string }[] = [
  { key: 'day', label: 'Hoy' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'year', label: 'Año' },
]

function selectPeriod(p: StatsPeriod) {
  showCustomRange.value = false
  dashboard.setPeriod(p)
}

function applyCustomRange() {
  if (customStart.value && customEnd.value) {
    dashboard.setCustomRange(customStart.value, customEnd.value)
  }
}

// ─── Stat cards ───
const statCards = computed(() => {
  const s = dashboard.stats
  if (!s) return []
  return [
    {
      label: 'Ventas totales',
      value: s.ventas,
      format: 'number',
      change: s.changes?.ventas ?? null,
      icon: ShoppingCart,
      color: 'text-blue-400',
    },
    {
      label: 'Facturación',
      value: s.facturacion,
      format: 'currency',
      change: s.changes?.facturacion ?? null,
      icon: DollarSign,
      color: 'text-green-400',
    },
    {
      label: 'Pedidos pendientes',
      value: dashboard.pendingOrdersCount,
      format: 'number',
      change: null,
      icon: Clock,
      color: 'text-amber-400',
    },
    {
      label: 'Clientes nuevos',
      value: dashboard.userStatsCount.periodCustomers,
      format: 'number',
      change: null,
      icon: UserPlus,
      color: 'text-purple-400',
    },
    {
      label: 'Ticket promedio',
      value: s.ticketPromedio,
      format: 'currency',
      change: null,
      icon: Receipt,
      color: 'text-teal-400',
    },
    {
      label: 'Ventas pagadas',
      value: s.ventas_pagadas,
      format: 'number',
      change: null,
      icon: CheckCircle,
      color: 'text-emerald-400',
    },
  ]
})

function formatStatValue(value: number, fmt: string): string {
  if (fmt === 'currency') {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(value)
  }
  return new Intl.NumberFormat('es-AR').format(value)
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

// ─── Revenue Bar Chart ───
const revenueChartData = computed(() => {
  const tl = dashboard.stats?.timeline ?? []
  return {
    labels: tl.map((p) => {
      try {
        return format(new Date(p.date), 'dd MMM', { locale: es })
      } catch {
        return p.date
      }
    }),
    datasets: [
      {
        label: 'Facturación',
        data: tl.map((p) => p.value),
        backgroundColor: 'rgba(34,197,94,0.5)',
        borderColor: 'rgb(34,197,94)',
        borderWidth: 1,
        borderRadius: 4,
        order: 1,
      },
      {
        label: 'Pedidos',
        data: tl.map((p) => p.orders),
        backgroundColor: 'rgba(59,130,246,0.5)',
        borderColor: 'rgb(59,130,246)',
        borderWidth: 1,
        borderRadius: 4,
        order: 2,
      },
    ],
  }
})

const revenueChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: {
      position: 'top' as const,
      labels: { color: '#9ca3af', font: { size: 12 } },
    },
    tooltip: {
      backgroundColor: '#1f2937',
      titleColor: '#f9fafb',
      bodyColor: '#d1d5db',
      borderColor: '#374151',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      ticks: { color: '#6b7280', font: { size: 11 } },
      grid: { color: 'rgba(55,65,81,0.3)' },
    },
    y: {
      ticks: { color: '#6b7280', font: { size: 11 } },
      grid: { color: 'rgba(55,65,81,0.3)' },
    },
  },
}))

// ─── Orders Doughnut Chart ───
const doughnutData = computed(() => {
  const c = dashboard.statusCounts
  if (!c) return { labels: [], datasets: [{ data: [], backgroundColor: [] as string[] }] }

  const items = [
    { label: 'Pendiente', value: c.pending, color: '#f59e0b' },
    { label: 'Pagado', value: c.paid, color: '#22c55e' },
    { label: 'Enviado', value: c.shipped, color: '#3b82f6' },
    { label: 'Cancelado', value: c.cancelled, color: '#ef4444' },
  ].filter((i) => i.value > 0)

  return {
    labels: items.map((i) => i.label),
    datasets: [
      {
        data: items.map((i) => i.value),
        backgroundColor: items.map((i) => i.color),
        borderWidth: 0,
      },
    ],
  }
})

const doughnutOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '60%',
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { color: '#9ca3af', font: { size: 12 }, padding: 12 },
    },
    tooltip: {
      backgroundColor: '#1f2937',
      titleColor: '#f9fafb',
      bodyColor: '#d1d5db',
    },
  },
}))

// ─── Recent Orders helpers ───
function formatDate(iso: string): string {
  try {
    return format(new Date(iso), "dd/MM/yy HH:mm", { locale: es })
  } catch {
    return iso
  }
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(v)
}

// ─── Quick actions ───
function goTo(path: string) {
  router.push(path)
}

// ─── Lifecycle ───
onMounted(() => {
  dashboard.fetchDashboardData()
  dashboard.startAutoRefresh()
})

onUnmounted(() => {
  dashboard.stopAutoRefresh()
})

// Period label for subtitle
const periodLabel = computed(() => {
  if (dashboard.customStartDate && dashboard.customEndDate) {
    return `${dashboard.customStartDate} — ${dashboard.customEndDate}`
  }
  const map: Record<string, string> = {
    day: 'Hoy',
    week: 'Esta semana',
    month: 'Este mes',
    year: 'Este año',
  }
  return map[dashboard.selectedPeriod] || dashboard.selectedPeriod
})
</script>

<template>
  <div>
    <!-- Header -->
    <PageHeader title="Dashboard" :subtitle="`Panel de administración · ${periodLabel}`">
      <template #actions>
        <span v-if="dashboard.lastFetched" class="text-2xs text-gray-600">
          Actualizado {{ format(dashboard.lastFetched, 'HH:mm') }}
        </span>
        <button
          class="rounded-lg bg-surface-700 px-3 py-1.5 text-xs text-gray-300 transition hover:bg-surface-600"
          :disabled="dashboard.isLoading"
          @click="dashboard.fetchDashboardData()"
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
          dashboard.selectedPeriod === p.key && !dashboard.customStartDate
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

    <!-- Loading state -->
    <div v-if="dashboard.isLoading && !dashboard.hasData" class="flex justify-center py-20">
      <LoadingSpinner size="lg" text="Cargando estadísticas..." />
    </div>

    <!-- Error state -->
    <div
      v-else-if="dashboard.error && !dashboard.hasData"
      class="rounded-xl border border-red-800/30 bg-red-900/10 p-6 text-center"
    >
      <p class="text-sm text-red-400">{{ dashboard.error }}</p>
      <button
        class="mt-3 rounded-lg bg-red-600 px-4 py-1.5 text-xs text-white hover:bg-red-500"
        @click="dashboard.fetchDashboardData()"
      >
        Reintentar
      </button>
    </div>

    <!-- Dashboard content -->
    <template v-else-if="dashboard.hasData">
      <!-- Stat Cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div
          v-for="card in statCards"
          :key="card.label"
          class="card-hover relative overflow-hidden"
        >
          <div class="flex items-start justify-between">
            <p class="text-xs text-gray-500">{{ card.label }}</p>
            <component :is="card.icon" :size="18" :class="card.color" />
          </div>
          <p class="mt-1 text-2xl font-bold">
            {{ formatStatValue(card.value, card.format) }}
          </p>
          <p v-if="card.change !== null" class="mt-1 text-xs" :class="changeClass(card.change)">
            {{ changeLabel(card.change) }} vs período anterior
          </p>
        </div>
      </div>

      <!-- Charts row -->
      <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Revenue bar chart -->
        <div class="lg:col-span-2 rounded-xl bg-surface-800 p-4">
          <h3 class="mb-3 text-sm font-semibold text-gray-300">Facturación y Pedidos</h3>
          <div class="h-64">
            <Bar
              v-if="(dashboard.stats?.timeline ?? []).length > 0"
              :data="revenueChartData"
              :options="revenueChartOptions"
            />
            <div v-else class="flex h-full items-center justify-center text-sm text-gray-600">
              Sin datos para este período
            </div>
          </div>
        </div>

        <!-- Doughnut chart -->
        <div class="rounded-xl bg-surface-800 p-4">
          <h3 class="mb-3 text-sm font-semibold text-gray-300">Pedidos por estado</h3>
          <div class="h-64">
            <Doughnut
              v-if="doughnutData.labels.length > 0"
              :data="doughnutData"
              :options="doughnutOptions"
            />
            <div v-else class="flex h-full items-center justify-center text-sm text-gray-600">
              Sin pedidos
            </div>
          </div>
        </div>
      </div>

      <!-- Recent orders + Quick actions -->
      <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
        <!-- Recent orders table -->
        <div class="lg:col-span-3 rounded-xl bg-surface-800 p-4">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-300">Pedidos recientes</h3>
            <button
              class="text-xs text-primary-400 hover:text-primary-300"
              @click="goTo('/orders')"
            >
              Ver todos →
            </button>
          </div>

          <div v-if="dashboard.recentOrders.length === 0" class="py-8 text-center text-sm text-gray-600">
            No hay pedidos recientes
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-surface-700 text-left text-gray-500">
                  <th class="pb-2 pr-4">ID</th>
                  <th class="pb-2 pr-4">Cliente</th>
                  <th class="pb-2 pr-4">Estado</th>
                  <th class="pb-2 pr-4 text-right">Total</th>
                  <th class="pb-2 pr-4">Fecha</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="order in dashboard.recentOrders"
                  :key="order.id"
                  class="border-b border-surface-700/50 transition hover:bg-surface-700/30 cursor-pointer"
                  @click="goTo(`/orders/${order.id}`)"
                >
                  <td class="py-2 pr-4 font-mono text-gray-400">#{{ order.id }}</td>
                  <td class="py-2 pr-4 text-gray-300">
                    {{ order.recipient_name || order.customer_email || '—' }}
                  </td>
                  <td class="py-2 pr-4">
                    <StatusBadge :status="order.status" size="xs" />
                  </td>
                  <td class="py-2 pr-4 text-right font-medium text-gray-200">
                    {{ formatCurrency(order.total) }}
                  </td>
                  <td class="py-2 pr-4 text-gray-500">
                    {{ formatDate(order.created_at) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Quick actions -->
        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-gray-300">Acciones rápidas</h3>

          <button
            class="flex w-full items-center gap-2.5 rounded-xl bg-primary-600 px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-primary-500"
            @click="goTo('/orders/new')"
          >
            <PlusCircle :size="16" /> Nueva venta
          </button>
          <button
            class="flex w-full items-center gap-2.5 rounded-xl bg-surface-700 px-4 py-3 text-left text-sm text-gray-300 transition hover:bg-surface-600"
            @click="goTo('/orders?status=pending')"
          >
            <Clock :size="16" /> Pedidos pendientes
            <span
              v-if="dashboard.pendingOrdersCount > 0"
              class="ml-1 inline-flex items-center justify-center rounded-full bg-amber-500/20 px-1.5 py-0.5 text-2xs font-bold text-amber-400"
            >
              {{ dashboard.pendingOrdersCount }}
            </span>
          </button>
          <button
            class="flex w-full items-center gap-2.5 rounded-xl bg-surface-700 px-4 py-3 text-left text-sm text-gray-300 transition hover:bg-surface-600"
            @click="goTo('/products/new')"
          >
            <Package :size="16" /> Nuevo producto
          </button>
          <button
            class="flex w-full items-center gap-2.5 rounded-xl bg-surface-700 px-4 py-3 text-left text-sm text-gray-300 transition hover:bg-surface-600"
            @click="goTo('/dashboard/stats')"
          >
            <TrendingUp :size="16" /> Ver estadísticas
          </button>
        </div>
      </div>
      
      <!-- Overlay spinner for background refreshes -->
      <div
        v-if="dashboard.isLoading && dashboard.hasData"
        class="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg bg-surface-800 px-3 py-2 shadow-lg"
      >
        <LoadingSpinner size="sm" />
        <span class="text-xs text-gray-400">Actualizando...</span>
      </div>
    </template>
  </div>
</template>
