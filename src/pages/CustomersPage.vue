<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Search, UserPlus, MoreVertical, Eye, Ban, Unlock,
  Trash2, ChevronLeft, ChevronRight,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import {
  getCustomers, blockCustomer, unblockCustomer, deleteCustomer,
} from '@/services/customers'
import type { Customer } from '@/types/customers'

const router = useRouter()

// ── State ──
const customers = ref<Customer[]>([])
const loading = ref(true)
const totalCount = ref(0)
const page = ref(1)
const search = ref('')
const statusFilter = ref<'' | 'active' | 'blocked'>('')
let debounceTimer: ReturnType<typeof setTimeout>

// Actions
const actionDropdown = ref<number | null>(null)
const actionMenuPos = ref({ top: 0, right: 0 })
const activeCustomer = computed<Customer | null>(() =>
  actionDropdown.value !== null
    ? (customers.value.find((c) => c.id === actionDropdown.value) ?? null)
    : null,
)
const confirmOpen = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmVariant = ref<'danger' | 'warning'>('danger')
const confirmAction = ref<() => Promise<void>>(async () => {})
const confirmLoading = ref(false)

// ── Data loading ──
async function load() {
  loading.value = true
  try {
    const res = await getCustomers({
      search: search.value || undefined,
      is_active: statusFilter.value === 'active' ? true : statusFilter.value === 'blocked' ? false : undefined,
      page: page.value,
    })
    if (Array.isArray(res)) {
      customers.value = res as unknown as Customer[]
      totalCount.value = (res as unknown as Customer[]).length
    } else {
      customers.value = res.results
      totalCount.value = res.count
    }
  } catch {
    customers.value = []
    totalCount.value = 0
  } finally {
    loading.value = false
  }
}

function onSearch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { page.value = 1; load() }, 400)
}

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / 24)))

// ── Actions ──
function toggleDropdown(id: number, event: MouseEvent) {
  if (actionDropdown.value === id) { actionDropdown.value = null; return }
  const btn = event.currentTarget as HTMLElement
  const rect = btn.getBoundingClientRect()
  actionMenuPos.value = { top: rect.bottom + 4, right: window.innerWidth - rect.right }
  actionDropdown.value = id
}
function closeDropdowns() { actionDropdown.value = null }

function confirmBlock(c: Customer) {
  closeDropdowns()
  confirmTitle.value = 'Bloquear cliente'
  confirmMessage.value = `¿Bloquear a "${c.name || c.username}"? No podrá realizar compras.`
  confirmVariant.value = 'warning'
  confirmAction.value = async () => { await blockCustomer(c.id); await load() }
  confirmOpen.value = true
}

function confirmUnblock(c: Customer) {
  closeDropdowns()
  confirmTitle.value = 'Desbloquear cliente'
  confirmMessage.value = `¿Desbloquear a "${c.name || c.username}"?`
  confirmVariant.value = 'warning'
  confirmAction.value = async () => { await unblockCustomer(c.id); await load() }
  confirmOpen.value = true
}

function confirmDelete(c: Customer) {
  closeDropdowns()
  confirmTitle.value = 'Eliminar cliente'
  confirmMessage.value = `¿Eliminar permanentemente a "${c.name || c.username}"? Esta acción no se puede deshacer.`
  confirmVariant.value = 'danger'
  confirmAction.value = async () => { await deleteCustomer(c.id); await load() }
  confirmOpen.value = true
}

async function handleConfirm() {
  confirmLoading.value = true
  try { await confirmAction.value() }
  finally { confirmLoading.value = false; confirmOpen.value = false }
}

// ── Formatting ──
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function fmtPrice(n: number) { return Math.round(n).toLocaleString('es-AR') }
function getInitials(name: string) {
  return name.split(' ').map(w => w.charAt(0).toUpperCase()).slice(0, 2).join('')
}

watch(statusFilter, () => { page.value = 1; load() })
onMounted(() => load())
</script>

<template>
  <div @click="closeDropdowns">
    <PageHeader title="Clientes" subtitle="Gestión de clientes registrados">
      <template #actions>
        <router-link
          to="/customers/new"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          <UserPlus :size="16" /> Nuevo cliente
        </router-link>
      </template>
    </PageHeader>

    <!-- Filters -->
    <div class="mt-4 flex flex-wrap items-center gap-4">
      <div class="relative flex-1" style="max-width: 400px">
        <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          v-model="search" @input="onSearch"
          placeholder="Buscar por nombre, email, DNI…"
          class="w-full rounded-lg border border-surface-700/50 bg-surface-800 py-2 pl-9 pr-3 text-sm text-gray-200 placeholder-gray-500 focus:border-primary-500/50 focus:outline-none"
        />
      </div>
      <div class="flex items-center gap-1">
        <button
          v-for="tab in [
            { v: '' as const, l: 'Todos' },
            { v: 'active' as const, l: 'Activos' },
            { v: 'blocked' as const, l: 'Bloqueados' },
          ]" :key="tab.v"
          class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
          :class="statusFilter === tab.v
            ? 'bg-primary-500/15 text-primary-400 ring-1 ring-primary-500/30'
            : 'text-gray-400 hover:bg-surface-700/50'"
          @click="statusFilter = tab.v"
        >{{ tab.l }}</button>
      </div>
    </div>

    <!-- Table -->
    <div class="mt-4 overflow-hidden rounded-xl border border-surface-700/50">
      <div v-if="loading" class="flex justify-center py-20">
        <LoadingSpinner text="Cargando clientes…" />
      </div>
      <div v-else-if="customers.length === 0" class="py-16">
        <EmptyState title="Sin clientes" message="No se encontraron clientes con estos filtros." />
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-700/50 bg-surface-800">
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Usuario</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Email</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Nombre</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Registro</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Pedidos</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Gastado</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Estado</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in customers" :key="c.id"
              class="border-b border-surface-700/30 transition-colors hover:bg-surface-800/60"
              :class="{ 'opacity-60': !c.is_active }"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                    :class="c.is_active ? 'bg-primary-500/20 text-primary-400' : 'bg-red-500/20 text-red-400'"
                  >{{ getInitials(c.name || c.username) }}</div>
                  <span class="font-medium text-gray-200">{{ c.username }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-400">{{ c.email }}</td>
              <td class="px-4 py-3 text-gray-300">{{ c.name }}</td>
              <td class="px-4 py-3 text-gray-400">{{ fmtDate(c.date_joined) }}</td>
              <td class="px-4 py-3 text-center text-gray-300">{{ c.total_orders }}</td>
              <td class="px-4 py-3 text-right font-medium text-gray-200">${{ fmtPrice(c.total_spent) }}</td>
              <td class="px-4 py-3 text-center">
                <StatusBadge :status="c.is_active ? 'active' : 'blocked'" size="xs" />
              </td>
              <td class="px-4 py-3 text-right">
                <div class="relative inline-block" @click.stop>
                  <button class="rounded p-1 text-gray-400 hover:bg-surface-700 hover:text-gray-200" @click="toggleDropdown(c.id, $event)">
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
    <div v-if="!loading && totalPages > 1" class="mt-4 flex items-center justify-between text-sm text-gray-500">
      <span>{{ totalCount }} clientes — Página {{ page }} de {{ totalPages }}</span>
      <div class="flex gap-1">
        <button class="rounded-lg border border-surface-700/50 px-2.5 py-1 hover:bg-surface-800 disabled:opacity-40" :disabled="page <= 1" @click="page--; load()"><ChevronLeft :size="16" /></button>
        <button class="rounded-lg border border-surface-700/50 px-2.5 py-1 hover:bg-surface-800 disabled:opacity-40" :disabled="page >= totalPages" @click="page++; load()"><ChevronRight :size="16" /></button>
      </div>
    </div>

    <!-- Actions dropdown — teleported to body to escape overflow-hidden clipping -->
    <Teleport to="body">
      <div
        v-if="activeCustomer"
        :style="{ position: 'fixed', top: actionMenuPos.top + 'px', right: actionMenuPos.right + 'px', zIndex: 9999 }"
        class="w-48 rounded-lg border border-surface-700/50 bg-surface-800 py-1 shadow-xl"
        @click.stop
      >
        <button class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-surface-700" @click="router.push(`/customers/${activeCustomer!.id}`); closeDropdowns()">
          <Eye :size="14" /> Ver perfil
        </button>
        <button v-if="activeCustomer!.is_active" class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-400 hover:bg-surface-700" @click="confirmBlock(activeCustomer!)">
          <Ban :size="14" /> Bloquear
        </button>
        <button v-else class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-green-400 hover:bg-surface-700" @click="confirmUnblock(activeCustomer!)">
          <Unlock :size="14" /> Desbloquear
        </button>
        <hr class="my-1 border-surface-700/50" />
        <button class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-surface-700" @click="confirmDelete(activeCustomer!)">
          <Trash2 :size="14" /> Eliminar
        </button>
      </div>
    </Teleport>

    <ConfirmDialog
      v-model:open="confirmOpen" :title="confirmTitle" :message="confirmMessage"
      :variant="confirmVariant" :loading="confirmLoading" confirm-label="Confirmar"
      @confirm="handleConfirm"
    />
  </div>
</template>
