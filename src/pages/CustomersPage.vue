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
const actionMenuPos = ref({ top: 0, bottom: 0, right: 0, openUpwards: false })
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
  const menuHeight = 180 // altura real del menú
  const padding = 16 // espacio de seguridad
  const spaceBelow = window.innerHeight - rect.bottom - padding
  const spaceAbove = rect.top - padding
  
  // Decidir si abrir hacia arriba basándose en el espacio disponible
  const openUpwards = spaceBelow < menuHeight && spaceAbove >= menuHeight
  
  if (openUpwards) {
    // Abrir hacia arriba
    actionMenuPos.value = {
      top: 0,
      bottom: window.innerHeight - rect.top + 4,
      right: window.innerWidth - rect.right,
      openUpwards: true
    }
  } else {
    // Abrir hacia abajo (por defecto si hay más espacio abajo o no cabe en ningún lado)
    actionMenuPos.value = {
      top: rect.bottom + 4,
      bottom: 0,
      right: window.innerWidth - rect.right,
      openUpwards: false
    }
  }
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
        <Search :size="20" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          v-model="search" @input="onSearch"
          placeholder="Buscar por nombre, email, DNI…"
          class="w-full rounded-lg border border-surface-700/50 bg-surface-800 py-2.5 pl-11 pr-3 text-[15px] text-gray-200 placeholder-gray-500 focus:border-primary-500/50 focus:outline-none"
        />
      </div>
      <div class="flex items-center gap-1">
        <button
          v-for="tab in [
            { v: '' as const, l: 'Todos' },
            { v: 'active' as const, l: 'Activos' },
            { v: 'blocked' as const, l: 'Bloqueados' },
          ]" :key="tab.v"
          class="rounded-full px-4 py-2 text-[15px] font-medium transition-colors"
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
        <table class="w-full">
          <thead>
            <tr class="border-b border-surface-700/50 bg-surface-800">
              <th class="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Usuario</th>
              <th class="hidden px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">Email</th>
              <th class="hidden px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 lg:table-cell">Nombre</th>
              <th class="hidden px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 xl:table-cell">Registro</th>
              <th class="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Pedidos</th>
              <th class="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Gastado</th>
              <th class="hidden px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 sm:table-cell">Estado</th>
              <th class="sticky right-0 bg-surface-800 px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 shadow-[-4px_0_8px_rgba(0,0,0,0.3)]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in customers" :key="c.id"
              class="border-b border-surface-700/30 transition-colors hover:bg-surface-800/60"
              :class="{ 'opacity-60': !c.is_active }"
            >
              <td class="px-4 py-4">
                <div class="flex items-center gap-2">
                  <div
                    class="flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-bold"
                    :class="c.is_active ? 'bg-primary-500/20 text-primary-400' : 'bg-red-500/20 text-red-400'"
                  >{{ getInitials(c.name || c.username) }}</div>
                  <span class="font-medium text-[15px] text-gray-200">{{ c.username }}</span>
                </div>
              </td>
              <td class="hidden px-4 py-4 text-[15px] text-gray-400 md:table-cell">{{ c.email }}</td>
              <td class="hidden px-4 py-4 text-[15px] text-gray-300 lg:table-cell">{{ c.name }}</td>
              <td class="hidden px-4 py-4 text-[15px] text-gray-400 xl:table-cell">{{ fmtDate(c.date_joined) }}</td>
              <td class="px-4 py-4 text-center text-[15px] text-gray-300">{{ c.total_orders }}</td>
              <td class="px-4 py-4 text-right text-[15px] font-medium text-gray-200">${{ fmtPrice(c.total_spent) }}</td>
              <td class="hidden px-4 py-4 text-center sm:table-cell">
                <StatusBadge :status="c.is_active ? 'active' : 'blocked'" size="xs" />
              </td>
              <td class="sticky right-0 bg-surface-900 px-4 py-4 text-right shadow-[-4px_0_8px_rgba(0,0,0,0.3)] hover:bg-surface-800/60">
                <div class="relative inline-block" @click.stop>
                  <button class="rounded p-1.5 text-gray-400 hover:bg-surface-700 hover:text-gray-200" @click="toggleDropdown(c.id, $event)">
                    <MoreVertical :size="20" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && totalPages > 1" class="mt-4 flex items-center justify-between text-[15px] text-gray-500">
      <span>{{ totalCount }} clientes — Página {{ page }} de {{ totalPages }}</span>
      <div class="flex gap-1">
        <button class="rounded-lg border border-surface-700/50 px-3 py-2 hover:bg-surface-800 disabled:opacity-40" :disabled="page <= 1" @click="page--; load()"><ChevronLeft :size="20" /></button>
        <button class="rounded-lg border border-surface-700/50 px-3 py-2 hover:bg-surface-800 disabled:opacity-40" :disabled="page >= totalPages" @click="page++; load()"><ChevronRight :size="20" /></button>
      </div>
    </div>

    <!-- Actions dropdown — teleported to body to escape overflow-hidden clipping -->
    <Teleport to="body">
      <div
        v-if="activeCustomer"
        :style="{ 
          position: 'fixed', 
          top: actionMenuPos.openUpwards ? 'auto' : actionMenuPos.top + 'px',
          bottom: actionMenuPos.openUpwards ? actionMenuPos.bottom + 'px' : 'auto',
          right: actionMenuPos.right + 'px', 
          zIndex: 9999 
        }"
        class="w-52 rounded-lg border border-surface-700/50 bg-surface-800 py-1 shadow-xl max-h-[calc(100vh-32px)] overflow-y-auto"
        @click.stop
      >
        <button class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[15px] text-gray-300 hover:bg-surface-700" @click="router.push(`/customers/${activeCustomer!.id}`); closeDropdowns()">
          <Eye :size="18" /> Ver perfil
        </button>
        <button v-if="activeCustomer!.is_active" class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[15px] text-amber-400 hover:bg-surface-700" @click="confirmBlock(activeCustomer!)">
          <Ban :size="18" /> Bloquear
        </button>
        <button v-else class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[15px] text-green-400 hover:bg-surface-700" @click="confirmUnblock(activeCustomer!)">
          <Unlock :size="18" /> Desbloquear
        </button>
        <hr class="my-1 border-surface-700/50" />
        <button class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[15px] text-red-400 hover:bg-surface-700" @click="confirmDelete(activeCustomer!)">
          <Trash2 :size="18" /> Eliminar
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
