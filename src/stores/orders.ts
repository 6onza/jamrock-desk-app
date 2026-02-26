// ─── Orders Store ───
// Pinia store for order list, detail, and statistics state management.

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as ordersService from '@/services/orders'
import type { Order, OrderFilters, OrderStatusCounts } from '@/types/orders'

export const useOrdersStore = defineStore('orders', () => {
  /* ── state ── */
  const orders = ref<Order[]>([])
  const currentOrder = ref<Order | null>(null)
  const stats = ref<OrderStatusCounts | null>(null)
  const totalCount = ref(0)
  const loading = ref(false)
  const detailLoading = ref(false)
  const statsLoading = ref(false)

  const filters = ref<OrderFilters>({
    status: '',
    search: '',
    page: 1,
    exclude_temporary: true,
  })

  /* ── getters ── */
  const openOrdersCount = computed(() => {
    if (!stats.value) return 0
    return (stats.value.pending ?? 0) + (stats.value.payment_pending ?? 0)
  })

  /* ── actions ── */
  async function fetchOrders(overrides?: Partial<OrderFilters>) {
    if (overrides) Object.assign(filters.value, overrides)
    loading.value = true
    try {
      const { orders: data, count } = await ordersService.getAdminOrders(
        filters.value,
      )
      orders.value = data
      totalCount.value = count
    } finally {
      loading.value = false
    }
  }

  async function fetchStats() {
    statsLoading.value = true
    try {
      const res = await ordersService.getOrderStatusStats({
        search: filters.value.search,
        start_date: filters.value.start_date,
        end_date: filters.value.end_date,
      })
      stats.value = res.counts
    } catch {
      // stats are non-critical
    } finally {
      statsLoading.value = false
    }
  }

  async function fetchOrderDetail(id: number | string) {
    detailLoading.value = true
    try {
      currentOrder.value = await ordersService.getOrderDetail(id)
    } finally {
      detailLoading.value = false
    }
  }

  async function changeStatus(id: number | string, status: string) {
    const updated = await ordersService.updateOrderStatus(id, status)
    const idx = orders.value.findIndex((o) => o.id === updated.id)
    if (idx >= 0) orders.value[idx] = updated
    if (currentOrder.value?.id === updated.id) currentOrder.value = updated
    await fetchStats()
    return updated
  }

  async function removeOrder(id: number | string) {
    await ordersService.deleteOrder(id)
    orders.value = orders.value.filter((o) => o.id !== Number(id))
    totalCount.value = Math.max(0, totalCount.value - 1)
    await fetchStats()
  }

  function setFilter(key: keyof OrderFilters, value: unknown) {
    ;(filters.value as Record<string, unknown>)[key] = value
    if (key !== 'page') filters.value.page = 1
  }

  function clearFilters() {
    filters.value = {
      status: '',
      search: '',
      page: 1,
      exclude_temporary: true,
    }
  }

  return {
    // state
    orders,
    currentOrder,
    stats,
    totalCount,
    loading,
    detailLoading,
    statsLoading,
    filters,
    // getters
    openOrdersCount,
    // actions
    fetchOrders,
    fetchStats,
    fetchOrderDetail,
    changeStatus,
    removeOrder,
    setFilter,
    clearFilters,
  }
})
