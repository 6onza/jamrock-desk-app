<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  RefreshCw, Search, X, Filter,
  Plus, Pencil, Trash2, UserPlus, LogIn, ShoppingCart, ArrowLeftRight,
  Clock, CalendarDays, CalendarRange, Activity,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { getActivityLogs, getActivityStats } from '@/services/activity'
import type { ActivityLog, ActivityFilters, ActivityStats, ActivityAction } from '@/types/system'
import { ACTION_LABELS, ACTION_COLORS } from '@/types/system'

// State
const activities = ref<ActivityLog[]>([])
const stats = ref<ActivityStats | null>(null)
const loading = ref(true)
const loadingMore = ref(false)
const page = ref(1)
const hasMore = ref(true)
const autoRefresh = ref(true)
let refreshTimer: ReturnType<typeof setInterval> | null = null
let searchTimer: ReturnType<typeof setTimeout>

// Filters
const filters = ref<ActivityFilters>({ page_size: 15 })
const searchText = ref('')
const showFilters = ref(false)

// Action types for filter
const actionTypes: { value: ActivityAction; label: string }[] = [
  { value: 'create', label: 'Creaciones' },
  { value: 'update', label: 'Modificaciones' },
  { value: 'delete', label: 'Eliminaciones' },
  { value: 'register', label: 'Registros' },
  { value: 'login', label: 'Inicios de sesión' },
  { value: 'order', label: 'Órdenes' },
  { value: 'status_change', label: 'Cambios de estado' },
]

const hasActiveFilters = computed(() =>
  !!filters.value.action || !!filters.value.date_from || !!filters.value.date_to || !!searchText.value,
)

// Icons per action
function actionIcon(action: string) {
  const icons: Record<string, typeof Plus> = {
    create: Plus, update: Pencil, delete: Trash2,
    register: UserPlus, login: LogIn, order: ShoppingCart, status_change: ArrowLeftRight,
  }
  return icons[action] || Activity
}

function actionColor(action: string) {
  return ACTION_COLORS[action as ActivityAction] || 'text-gray-400 bg-gray-500/10'
}

// Load functions
async function loadStats() {
  try { stats.value = await getActivityStats() } catch { /* silent */ }
}

async function loadActivities(reset = true) {
  if (reset) { page.value = 1; loading.value = true }
  else loadingMore.value = true

  try {
    const params: ActivityFilters = { ...filters.value, page: page.value }
    if (searchText.value) params.description = searchText.value

    const res = await getActivityLogs(params)
    const results = res.results ?? []
    hasMore.value = !!res.next

    if (reset) activities.value = results
    else activities.value = [...activities.value, ...results]
  } catch { /* silent */ }
  finally {
    loading.value = false; loadingMore.value = false
  }
}

function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  page.value++; loadActivities(false)
}

function handleSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadActivities(), 400)
}

function setAction(a: string) {
  filters.value.action = filters.value.action === a ? undefined : a
  loadActivities()
}

function clearFilters() {
  filters.value = { page_size: 15 }; searchText.value = ''
  loadActivities()
}

async function forceRefresh() {
  await Promise.all([loadActivities(), loadStats()])
}

// Auto-refresh toggle
function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value
  setupAutoRefresh()
}

function setupAutoRefresh() {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
  if (autoRefresh.value) {
    refreshTimer = setInterval(() => {
      loadActivities()
    }, 30_000)
  }
}

// Format
function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}
function fmtRelative(iso: string) {
  const now = Date.now(), then = new Date(iso).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'Hace un momento'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} hs`
  return fmtDate(iso)
}

// Expanded changes
const expandedIds = ref<Set<number>>(new Set())
function toggleChanges(id: number) {
  if (expandedIds.value.has(id)) expandedIds.value.delete(id)
  else expandedIds.value.add(id)
}

function formatChanges(changes: Record<string, unknown> | null): string {
  if (!changes) return ''
  const c = changes as Record<string, Record<string, unknown>>
  if (c.before && c.after) {
    const diffs: string[] = []
    for (const key of Object.keys(c.after)) {
      if (['updated_at', 'created_at', 'id'].includes(key)) continue
      if (JSON.stringify(c.before[key]) !== JSON.stringify(c.after[key])) {
        diffs.push(`${key}: ${JSON.stringify(c.before[key])} → ${JSON.stringify(c.after[key])}`)
      }
    }
    return diffs.length ? diffs.join('\n') : 'Sin cambios detallados'
  }
  if (c.old_status && c.new_status) {
    return `Estado: ${c.old_status} → ${c.new_status}`
  }
  return JSON.stringify(changes, null, 2)
}

onMounted(() => {
  Promise.all([loadActivities(), loadStats()])
  setupAutoRefresh()
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<template>
  <div>
    <PageHeader title="Actividad" subtitle="Registro de actividad del sistema">
      <template #actions>
        <button
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors"
          :class="autoRefresh ? 'bg-primary-500/15 text-primary-400' : 'bg-surface-700/50 text-gray-400'"
          @click="toggleAutoRefresh"
          title="Auto-refresh cada 30s"
        >
          <Clock :size="14" />
          {{ autoRefresh ? 'Auto' : 'Manual' }}
        </button>
        <button
          class="inline-flex items-center gap-1.5 rounded-lg bg-surface-700/50 px-3 py-2 text-sm text-gray-400 hover:bg-surface-700 hover:text-gray-200"
          :disabled="loading"
          @click="forceRefresh"
        >
          <RefreshCw :size="14" :class="loading ? 'animate-spin' : ''" />
          Actualizar
        </button>
      </template>
    </PageHeader>

    <!-- Stats Cards -->
    <div v-if="stats" class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
            <CalendarDays :size="18" class="text-blue-400" />
          </div>
          <div>
            <p class="text-2xs text-gray-500">Hoy</p>
            <p class="text-lg font-bold text-gray-100">{{ stats.activities_today }}</p>
          </div>
        </div>
      </div>
      <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
            <CalendarRange :size="18" class="text-green-400" />
          </div>
          <div>
            <p class="text-2xs text-gray-500">Esta semana</p>
            <p class="text-lg font-bold text-gray-100">{{ stats.activities_last_week }}</p>
          </div>
        </div>
      </div>
      <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
            <Activity :size="18" class="text-purple-400" />
          </div>
          <div>
            <p class="text-2xs text-gray-500">Este mes</p>
            <p class="text-lg font-bold text-gray-100">{{ stats.activities_last_month }}</p>
          </div>
        </div>
      </div>
      <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
            <Activity :size="18" class="text-amber-400" />
          </div>
          <div>
            <p class="text-2xs text-gray-500">Total</p>
            <p class="text-lg font-bold text-gray-100">{{ stats.total_activities }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="mb-4 rounded-xl border border-surface-700/50 bg-surface-800 p-4">
      <div class="flex flex-wrap items-center gap-3">
        <!-- Search -->
        <div class="relative flex-1">
          <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            v-model="searchText"
            @input="handleSearch"
            placeholder="Buscar actividades…"
            class="w-full rounded-lg border border-surface-700/50 bg-surface-900 py-2 pl-8 pr-3 text-sm text-gray-200 placeholder-gray-600 focus:border-primary-500/50 focus:outline-none"
          />
        </div>
        <button
          class="inline-flex items-center gap-1.5 rounded-lg border border-surface-700/50 px-3 py-2 text-sm text-gray-400 hover:bg-surface-700"
          @click="showFilters = !showFilters"
        >
          <Filter :size="14" /> Filtros
        </button>
        <button
          v-if="hasActiveFilters"
          class="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
          @click="clearFilters"
        >
          <X :size="12" /> Limpiar
        </button>
      </div>
      <!-- Expanded filters -->
      <div v-if="showFilters" class="mt-3 flex flex-wrap items-center gap-3 border-t border-surface-700/30 pt-3">
        <!-- Action type chips -->
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="at in actionTypes" :key="at.value"
            class="rounded-full px-2.5 py-1 text-xs transition-colors"
            :class="filters.action === at.value ? 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/30' : 'bg-surface-700/50 text-gray-400 hover:bg-surface-700'"
            @click="setAction(at.value)"
          >{{ at.label }}</button>
        </div>
        <!-- Date from -->
        <input
          v-model="filters.date_from"
          @change="loadActivities()"
          type="date"
          class="rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-1.5 text-xs text-gray-200 focus:border-primary-500/50 focus:outline-none"
        />
        <span class="text-xs text-gray-600">→</span>
        <input
          v-model="filters.date_to"
          @change="loadActivities()"
          type="date"
          class="rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-1.5 text-xs text-gray-200 focus:border-primary-500/50 focus:outline-none"
        />
      </div>
    </div>

    <!-- Timeline -->
    <div class="overflow-hidden rounded-xl border border-surface-700/50">
      <div v-if="loading" class="flex justify-center py-20"><LoadingSpinner text="Cargando actividad…" /></div>
      <div v-else-if="activities.length === 0" class="py-16"><EmptyState title="Sin actividad" message="No hay registros de actividad para mostrar." /></div>
      <div v-else class="divide-y divide-surface-700/30">
        <div
          v-for="a in activities" :key="a.id"
          class="flex gap-3 px-4 py-3 transition-colors hover:bg-surface-800/40"
        >
          <!-- Icon -->
          <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" :class="actionColor(a.action)">
            <component :is="actionIcon(a.action)" :size="14" />
          </div>
          <!-- Content -->
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <p class="text-sm text-gray-200">{{ a.description }}</p>
              <span class="flex-shrink-0 text-2xs text-gray-600" :title="fmtDate(a.timestamp) + ' ' + fmtTime(a.timestamp)">
                {{ fmtRelative(a.timestamp) }}
              </span>
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-2">
              <span class="rounded-full bg-surface-700/50 px-2 py-0.5 text-2xs text-gray-400">
                {{ a.user_username || 'Sistema' }}
              </span>
              <span class="rounded-full px-2 py-0.5 text-2xs" :class="actionColor(a.action)">
                {{ ACTION_LABELS[a.action] || a.action }}
              </span>
              <span v-if="a.content_type_name" class="text-2xs text-gray-600">
                {{ a.content_type_name }}{{ a.object_id ? ' #' + a.object_id : '' }}
              </span>
            </div>
            <!-- Expandable changes -->
            <div v-if="a.changes">
              <button
                class="mt-1.5 text-2xs text-gray-500 hover:text-primary-400"
                @click="toggleChanges(a.id)"
              >
                {{ expandedIds.has(a.id) ? 'Ocultar detalles' : 'Ver detalles' }}
              </button>
              <pre
                v-if="expandedIds.has(a.id)"
                class="mt-1.5 max-h-40 overflow-y-auto rounded-lg bg-surface-900 p-3 text-2xs text-gray-400"
              >{{ formatChanges(a.changes) }}</pre>
            </div>
          </div>
        </div>
        <!-- Load more -->
        <div v-if="hasMore" class="flex justify-center py-4">
          <button
            class="inline-flex items-center gap-2 rounded-lg bg-surface-700/50 px-4 py-2 text-sm text-gray-400 hover:bg-surface-700"
            :disabled="loadingMore"
            @click="loadMore"
          >
            <RefreshCw v-if="loadingMore" :size="14" class="animate-spin" />
            {{ loadingMore ? 'Cargando…' : 'Cargar más' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
