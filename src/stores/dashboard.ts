// ─── Dashboard Pinia Store ───
// Manages statistics, recent orders, and auto-refresh for the dashboard.

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StatsPeriod, OrderAnalyticsStats } from '@/types/statistics'
import type { Order, OrderStatusCounts } from '@/types/orders'
import { getOrderStats, getUserStats, clearStatsCache } from '@/services/statistics'
import { getAdminOrders, getOrderStatusStats } from '@/services/orders'

const AUTO_REFRESH_MS = 5 * 60 * 1000 // 5 minutes

export const useDashboardStore = defineStore('dashboard', () => {
  // ═══════════════════════════════════════
  //  STATE
  // ═══════════════════════════════════════
  const stats = ref<OrderAnalyticsStats | null>(null)
  const userStatsCount = ref<{ periodCustomers: number; totalCustomers: number }>({
    periodCustomers: 0,
    totalCustomers: 0,
  })
  const recentOrders = ref<Order[]>([])
  const statusCounts = ref<OrderStatusCounts | null>(null)

  const selectedPeriod = ref<StatsPeriod>('month')
  const customStartDate = ref('')
  const customEndDate = ref('')

  const isLoading = ref(false)
  const lastFetched = ref<Date | null>(null)
  const error = ref<string | null>(null)

  let refreshTimer: ReturnType<typeof setInterval> | null = null

  // ═══════════════════════════════════════
  //  COMPUTED
  // ═══════════════════════════════════════
  const pendingOrdersCount = computed(() => statusCounts.value?.pending ?? 0)

  const hasData = computed(() => stats.value !== null)

  // ═══════════════════════════════════════
  //  ACTIONS
  // ═══════════════════════════════════════

  async function fetchDashboardData() {
    isLoading.value = true
    error.value = null

    try {
      const params =
        customStartDate.value && customEndDate.value
          ? { start_date: customStartDate.value, end_date: customEndDate.value }
          : { period: selectedPeriod.value }

      // Fire all requests in parallel
      const [analyticsRes, userRes, ordersRes, statsRes] = await Promise.all([
        getOrderStats(params),
        getUserStats(params),
        getAdminOrders({ sort_by: 'created_at', order: 'desc', page: 1 }),
        getOrderStatusStats(),
      ])

      stats.value = analyticsRes.stats
      userStatsCount.value = {
        periodCustomers: userRes.stats.period_customers,
        totalCustomers: userRes.stats.total_customers,
      }
      recentOrders.value = ordersRes.orders.slice(0, 10)
      statusCounts.value = statsRes.counts ?? null
      lastFetched.value = new Date()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al cargar datos del dashboard'
      error.value = msg
      console.error('[DashboardStore]', e)
    } finally {
      isLoading.value = false
    }
  }

  function setPeriod(period: StatsPeriod) {
    selectedPeriod.value = period
    customStartDate.value = ''
    customEndDate.value = ''
    clearStatsCache()
    fetchDashboardData()
  }

  function setCustomRange(start: string, end: string) {
    customStartDate.value = start
    customEndDate.value = end
    clearStatsCache()
    fetchDashboardData()
  }

  function startAutoRefresh() {
    stopAutoRefresh()
    refreshTimer = setInterval(() => {
      clearStatsCache()
      fetchDashboardData()
    }, AUTO_REFRESH_MS)
  }

  function stopAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  function $reset() {
    stopAutoRefresh()
    stats.value = null
    recentOrders.value = []
    statusCounts.value = null
    userStatsCount.value = { periodCustomers: 0, totalCustomers: 0 }
    isLoading.value = false
    lastFetched.value = null
    error.value = null
    selectedPeriod.value = 'month'
    customStartDate.value = ''
    customEndDate.value = ''
  }

  return {
    // state
    stats,
    userStatsCount,
    recentOrders,
    statusCounts,
    selectedPeriod,
    customStartDate,
    customEndDate,
    isLoading,
    lastFetched,
    error,
    // computed
    pendingOrdersCount,
    hasData,
    // actions
    fetchDashboardData,
    setPeriod,
    setCustomRange,
    startAutoRefresh,
    stopAutoRefresh,
    $reset,
  }
})
