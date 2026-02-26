<script setup lang="ts" generic="T extends Record<string, unknown>">
/**
 * Reusable data table with sorting, pagination, and search.
 *
 * Usage:
 *   <DataTable
 *     :columns="columns"
 *     :rows="products"
 *     :total="pagination.count"
 *     :page="page"
 *     :page-size="24"
 *     :loading="loading"
 *     :searchable="true"
 *     v-model:search="searchQuery"
 *     @page-change="fetchPage"
 *     @sort="handleSort"
 *     @row-click="goToDetail"
 *   >
 *     <template #cell-status="{ row }">
 *       <StatusBadge :status="row.status" />
 *     </template>
 *   </DataTable>
 */

import { computed } from 'vue'
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-vue-next'
import LoadingSpinner from './LoadingSpinner.vue'
import EmptyState from './EmptyState.vue'

export interface Column {
  key: string
  label: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
}

const props = withDefaults(
  defineProps<{
    columns: Column[]
    rows: T[]
    total?: number
    page?: number
    pageSize?: number
    loading?: boolean
    searchable?: boolean
    search?: string
    sortBy?: string
    sortDir?: 'asc' | 'desc'
    emptyTitle?: string
    emptyMessage?: string
  }>(),
  {
    total: 0,
    page: 1,
    pageSize: 24,
    loading: false,
    searchable: false,
    search: '',
    sortBy: '',
    sortDir: 'asc',
    emptyTitle: 'Sin resultados',
    emptyMessage: 'No se encontraron datos para mostrar.',
  },
)

const emit = defineEmits<{
  'update:search': [value: string]
  'page-change': [page: number]
  sort: [key: string, dir: 'asc' | 'desc']
  'row-click': [row: T]
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

function handleSort(col: Column) {
  if (!col.sortable) return
  const newDir = props.sortBy === col.key && props.sortDir === 'asc' ? 'desc' : 'asc'
  emit('sort', col.key, newDir)
}

function goToPage(p: number) {
  if (p >= 1 && p <= totalPages.value && p !== props.page) {
    emit('page-change', p)
  }
}

const visiblePages = computed(() => {
  const pages: number[] = []
  const total = totalPages.value
  const current = props.page
  const delta = 2

  for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
    pages.push(i)
  }
  return pages
})
</script>

<template>
  <div class="space-y-4">
    <!-- Search bar -->
    <div v-if="searchable" class="relative max-w-sm">
      <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
      <input
        type="text"
        :value="search"
        class="input-field pl-9 text-sm"
        placeholder="Buscar…"
        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- Table -->
    <div class="overflow-hidden rounded-xl border border-surface-700/50">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-700/50 bg-surface-800">
              <th
                v-for="col in columns"
                :key="col.key"
                class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                :style="col.width ? { width: col.width } : {}"
                :class="[
                  col.sortable ? 'cursor-pointer select-none hover:text-gray-300' : '',
                  col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : '',
                ]"
                @click="handleSort(col)"
              >
                <div class="flex items-center gap-1" :class="col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''">
                  {{ col.label }}
                  <template v-if="col.sortable">
                    <ChevronUp v-if="sortBy === col.key && sortDir === 'asc'" :size="14" class="text-primary-400" />
                    <ChevronDown v-else-if="sortBy === col.key && sortDir === 'desc'" :size="14" class="text-primary-400" />
                    <ChevronsUpDown v-else :size="14" class="text-gray-600" />
                  </template>
                </div>
              </th>
            </tr>
          </thead>

          <tbody v-if="!loading && rows.length > 0">
            <tr
              v-for="(row, i) in rows"
              :key="i"
              class="border-b border-surface-700/30 transition-colors hover:bg-surface-800/60 cursor-pointer"
              @click="emit('row-click', row)"
            >
              <td
                v-for="col in columns"
                :key="col.key"
                class="px-4 py-3 text-gray-300"
                :class="col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''"
              >
                <!-- Named slot for custom cell rendering -->
                <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                  {{ row[col.key] ?? '—' }}
                </slot>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <LoadingSpinner text="Cargando datos…" />
      </div>

      <!-- Empty state -->
      <EmptyState
        v-if="!loading && rows.length === 0"
        :title="emptyTitle"
        :message="emptyMessage"
        class="py-16"
      />
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1 && !loading" class="flex items-center justify-between text-xs text-gray-500">
      <span>
        Mostrando {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, total) }}
        de {{ total }}
      </span>

      <div class="flex items-center gap-1">
        <button
          class="rounded-md px-2 py-1 transition-colors hover:bg-surface-700/50 disabled:opacity-30"
          :disabled="page <= 1"
          @click="goToPage(page - 1)"
        >
          ‹ Ant
        </button>

        <button
          v-for="p in visiblePages"
          :key="p"
          class="rounded-md px-2.5 py-1 transition-colors"
          :class="p === page ? 'bg-primary-500/15 text-primary-400 font-medium' : 'hover:bg-surface-700/50'"
          @click="goToPage(p)"
        >
          {{ p }}
        </button>

        <button
          class="rounded-md px-2 py-1 transition-colors hover:bg-surface-700/50 disabled:opacity-30"
          :disabled="page >= totalPages"
          @click="goToPage(page + 1)"
        >
          Sig ›
        </button>
      </div>
    </div>
  </div>
</template>
