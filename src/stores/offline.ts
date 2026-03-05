// ─── Offline / Sync Store ───
// Pinia store that wraps the sync engine's reactive state
// and provides actions for components.

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import {
  syncState,
  runSync,
  initSyncEngine,
  onSyncEvent,
} from '@/services/syncEngine'
import {
  startConnectionMonitor,
} from '@/services/connectionDetector'
import { getQueue, getQueueStats, getRequestQueue, getRequestQueueStats } from '@/services/offlineDb'
import type { OfflineOperation, OfflineHttpRequest, SyncState } from '@/types/offline'
import { useToast } from 'vue-toastification'

export const useOfflineStore = defineStore('offline', () => {
  /* ── state ── */
  const state = ref<SyncState>({
    connectionStatus: 'online',
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
    conflictCount: 0,
    lastSyncTimestamp: null,
    latency: null,
  })
  const recentOperations = ref<OfflineOperation[]>([])
  const queuedRequests = ref<OfflineHttpRequest[]>([])
  const initialized = ref(false)

  /* ── getters ── */
  const isOnline = computed(() =>
    state.value.connectionStatus === 'online' || state.value.connectionStatus === 'degraded',
  )
  const isOffline = computed(() => state.value.connectionStatus === 'offline')
  const hasPending = computed(() => state.value.pendingCount > 0)
  const hasProblems = computed(() => state.value.failedCount > 0 || state.value.conflictCount > 0)
  const statusLabel = computed(() => {
    if (state.value.isSyncing) return 'Sincronizando…'
    if (state.value.connectionStatus === 'offline') return 'Sin conexión'
    if (state.value.connectionStatus === 'degraded') return 'Conexión lenta'
    if (state.value.pendingCount > 0) return `${state.value.pendingCount} pendientes`
    if (state.value.failedCount > 0) return `${state.value.failedCount} con error`
    return 'Sincronizado'
  })
  const statusColor = computed(() => {
    if (state.value.connectionStatus === 'offline') return 'red'
    if (state.value.isSyncing) return 'blue'
    if (state.value.failedCount > 0 || state.value.conflictCount > 0) return 'yellow'
    if (state.value.pendingCount > 0) return 'orange'
    return 'green'
  })

  /* ── actions ── */
  async function init() {
    if (initialized.value) return

    // Start connection monitoring
    startConnectionMonitor()

    // Init sync engine (listens for reconnection, auto-syncs)
    await initSyncEngine()

    // Keep our state in sync with the engine
    watch(syncState, (s) => {
      state.value = { ...s }
    }, { deep: true, immediate: true })

    // Listen for sync events
    onSyncEvent(async (event) => {
      // Refresh operations list on any change
      await loadRecentOperations()

      // After sync completes, refresh all active data stores
      if (event.type === 'sync_complete') {
        await refreshActiveStores()
      }
    })

    await loadRecentOperations()
    initialized.value = true
  }

  async function triggerSync() {
    await runSync()
  }

  async function loadRecentOperations() {
    const queue = await getQueue()
    // Show last 20 operations, most recent first
    recentOperations.value = queue.slice(-20).reverse()
    // Load queued HTTP requests
    const requests = await getRequestQueue()
    queuedRequests.value = requests.slice(-20).reverse()
    // Also refresh counts
    const stats = await getQueueStats()
    const reqStats = await getRequestQueueStats()
    state.value = {
      ...state.value,
      pendingCount: stats.pending + reqStats.pending,
      failedCount: stats.failed + reqStats.failed,
      conflictCount: stats.conflict,
    }
  }

  /**
   * After sync completes, refresh all active Pinia stores so pages
   * show the latest data from the server (including replayed offline changes).
   */
  async function refreshActiveStores() {
    const toast = useToast()

    try {
      // Lazy-import stores to avoid circular dependencies
      const { useProductsStore } = await import('@/stores/products')
      const { useOrdersStore } = await import('@/stores/orders')
      const { useDashboardStore } = await import('@/stores/dashboard')

      const productsStore = useProductsStore()
      const ordersStore = useOrdersStore()
      const dashboardStore = useDashboardStore()

      // Refresh products if the store has been used (has products loaded)
      if (productsStore.products.length > 0 || productsStore.currentProduct) {
        await productsStore.fetchProducts()
        if (productsStore.currentProduct) {
          await productsStore.fetchProduct(productsStore.currentProduct.id)
        }
        await productsStore.fetchCategories()
      }

      // Refresh orders if the store has been used
      if (ordersStore.orders.length > 0 || ordersStore.currentOrder) {
        await ordersStore.fetchOrders()
        await ordersStore.fetchStats()
        if (ordersStore.currentOrder) {
          await ordersStore.fetchOrderDetail(ordersStore.currentOrder.id)
        }
      }

      // Refresh dashboard if it has been loaded
      if (dashboardStore.hasData) {
        await dashboardStore.fetchDashboardData()
      }

      console.log('[Offline] Active stores refreshed after sync')
      toast.success('✓ Sincronización completa — datos actualizados', { timeout: 3000 })
    } catch (err) {
      console.error('[Offline] Error refreshing stores:', err)
    }
  }

  return {
    state,
    recentOperations,
    queuedRequests,
    initialized,
    // getters
    isOnline,
    isOffline,
    hasPending,
    hasProblems,
    statusLabel,
    statusColor,
    // actions
    init,
    triggerSync,
    loadRecentOperations,
  }
})
