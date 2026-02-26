<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft, ShoppingCart, DollarSign, Calendar,
  Ban, Unlock, Trash2, Pencil, Save, X,
} from 'lucide-vue-next'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import {
  getCustomer, getCustomerOrders, updateCustomer,
  blockCustomer, unblockCustomer, deleteCustomer,
} from '@/services/customers'
import type { Customer, CustomerOrder } from '@/types/customers'

const route = useRoute()
const router = useRouter()
const id = Number(route.params.id)

const customer = ref<Customer | null>(null)
const orders = ref<CustomerOrder[]>([])
const loading = ref(true)
const ordersLoading = ref(false)
const editing = ref(false)
const editForm = ref({ username: '', email: '', dni: '' })
const saving = ref(false)

const confirmOpen = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmVariant = ref<'danger' | 'warning'>('danger')
const confirmAction = ref<() => Promise<void>>(async () => {})
const confirmLoading = ref(false)

async function loadCustomer() {
  loading.value = true
  try {
    customer.value = await getCustomer(id)
    editForm.value = {
      username: customer.value.username,
      email: customer.value.email,
      dni: customer.value.dni || '',
    }
  } catch { router.push('/customers') }
  finally { loading.value = false }
}

async function loadOrders() {
  ordersLoading.value = true
  try { orders.value = await getCustomerOrders(id) }
  catch { orders.value = [] }
  finally { ordersLoading.value = false }
}

function startEdit() { editing.value = true }
function cancelEdit() {
  editing.value = false
  if (customer.value) {
    editForm.value = {
      username: customer.value.username,
      email: customer.value.email,
      dni: customer.value.dni || '',
    }
  }
}

async function saveEdit() {
  saving.value = true
  try {
    customer.value = await updateCustomer(id, editForm.value as Partial<Customer>)
    editing.value = false
  } finally { saving.value = false }
}

function doBlock() {
  confirmTitle.value = 'Bloquear cliente'
  confirmMessage.value = `¿Bloquear a "${customer.value?.name}"?`
  confirmVariant.value = 'warning'
  confirmAction.value = async () => { customer.value = await blockCustomer(id) }
  confirmOpen.value = true
}

function doUnblock() {
  confirmTitle.value = 'Desbloquear cliente'
  confirmMessage.value = `¿Desbloquear a "${customer.value?.name}"?`
  confirmVariant.value = 'warning'
  confirmAction.value = async () => { customer.value = await unblockCustomer(id) }
  confirmOpen.value = true
}

function doDelete() {
  confirmTitle.value = 'Eliminar cliente'
  confirmMessage.value = `¿Eliminar permanentemente a "${customer.value?.name}"? Esta acción no se puede deshacer.`
  confirmVariant.value = 'danger'
  confirmAction.value = async () => { await deleteCustomer(id); router.push('/customers') }
  confirmOpen.value = true
}

async function handleConfirm() {
  confirmLoading.value = true
  try { await confirmAction.value() }
  finally { confirmLoading.value = false; confirmOpen.value = false }
}

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'
}
function fmtPrice(n: number) { return Math.round(n).toLocaleString('es-AR') }
function getInitials(name: string) {
  return name.split(' ').map(w => w[0]?.toUpperCase()).slice(0, 2).join('')
}

onMounted(async () => { await loadCustomer(); loadOrders() })
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex items-center gap-3">
      <button class="rounded-lg p-1.5 text-gray-400 hover:bg-surface-800 hover:text-gray-200" @click="router.push('/customers')">
        <ArrowLeft :size="20" />
      </button>
      <div v-if="customer" class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
          :class="customer.is_active ? 'bg-primary-500/20 text-primary-400' : 'bg-red-500/20 text-red-400'">
          {{ getInitials(customer.name || customer.username) }}
        </div>
        <div>
          <h1 class="text-xl font-bold text-gray-100">{{ customer.name }}</h1>
          <p class="text-sm text-gray-500">@{{ customer.username }} · {{ customer.email }}</p>
        </div>
        <StatusBadge :status="customer.is_active ? 'active' : 'blocked'" size="sm" class="ml-2" />
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><LoadingSpinner text="Cargando cliente…" /></div>

    <template v-else-if="customer">
      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Left: Stats + Orders -->
        <div class="space-y-6 lg:col-span-2">
          <!-- Stats cards -->
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-4">
              <div class="flex items-center gap-3">
                <div class="rounded-lg bg-blue-500/10 p-2"><ShoppingCart :size="20" class="text-blue-400" /></div>
                <div>
                  <p class="text-2xs text-gray-500">Pedidos</p>
                  <p class="text-xl font-bold text-gray-200">{{ customer.total_orders }}</p>
                </div>
              </div>
            </div>
            <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-4">
              <div class="flex items-center gap-3">
                <div class="rounded-lg bg-green-500/10 p-2"><DollarSign :size="20" class="text-green-400" /></div>
                <div>
                  <p class="text-2xs text-gray-500">Total gastado</p>
                  <p class="text-xl font-bold text-gray-200">${{ fmtPrice(customer.total_spent) }}</p>
                </div>
              </div>
            </div>
            <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-4">
              <div class="flex items-center gap-3">
                <div class="rounded-lg bg-purple-500/10 p-2"><Calendar :size="20" class="text-purple-400" /></div>
                <div>
                  <p class="text-2xs text-gray-500">Última compra</p>
                  <p class="text-lg font-bold text-gray-200">{{ fmtDate(customer.last_purchase) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Orders table -->
          <div class="rounded-xl border border-surface-700/50">
            <div class="border-b border-surface-700/50 bg-surface-800 px-4 py-3">
              <h2 class="text-sm font-semibold text-gray-300">Pedidos del cliente</h2>
            </div>
            <div v-if="ordersLoading" class="flex justify-center py-12"><LoadingSpinner size="sm" /></div>
            <div v-else-if="orders.length === 0" class="py-10 text-center text-sm text-gray-500">Sin pedidos registrados</div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-surface-700/50 bg-surface-800/50">
                    <th class="px-4 py-2 text-left text-xs text-gray-500">#</th>
                    <th class="px-4 py-2 text-left text-xs text-gray-500">Fecha</th>
                    <th class="px-4 py-2 text-center text-xs text-gray-500">Estado</th>
                    <th class="px-4 py-2 text-right text-xs text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="o in orders" :key="o.id"
                    class="cursor-pointer border-b border-surface-700/30 hover:bg-surface-800/60"
                    @click="router.push(`/orders/${o.id}`)"
                  >
                    <td class="px-4 py-2 font-medium text-gray-300">#{{ o.id }}</td>
                    <td class="px-4 py-2 text-gray-400">{{ fmtDate(o.created_at) }}</td>
                    <td class="px-4 py-2 text-center"><StatusBadge :status="o.status" size="xs" /></td>
                    <td class="px-4 py-2 text-right font-medium text-gray-200">${{ fmtPrice(o.total) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Right: Info + Actions -->
        <div class="space-y-6">
          <!-- Customer info -->
          <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-4">
            <div class="mb-3 flex items-center justify-between">
              <h2 class="text-sm font-semibold text-gray-300">Información</h2>
              <button v-if="!editing" class="rounded p-1 text-gray-500 hover:text-gray-300" @click="startEdit">
                <Pencil :size="14" />
              </button>
              <div v-else class="flex gap-1">
                <button class="rounded p-1 text-green-400 hover:text-green-300" :disabled="saving" @click="saveEdit"><Save :size="14" /></button>
                <button class="rounded p-1 text-gray-500 hover:text-gray-300" @click="cancelEdit"><X :size="14" /></button>
              </div>
            </div>
            <div class="space-y-3 text-sm">
              <div>
                <label class="text-2xs text-gray-500">Username</label>
                <input v-if="editing" v-model="editForm.username"
                  class="mt-0.5 w-full rounded border border-surface-700/50 bg-surface-900 px-2 py-1 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
                <p v-else class="text-gray-200">@{{ customer.username }}</p>
              </div>
              <div>
                <label class="text-2xs text-gray-500">Email</label>
                <input v-if="editing" v-model="editForm.email"
                  class="mt-0.5 w-full rounded border border-surface-700/50 bg-surface-900 px-2 py-1 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
                <p v-else class="text-gray-200">{{ customer.email }}</p>
              </div>
              <div>
                <label class="text-2xs text-gray-500">DNI</label>
                <input v-if="editing" v-model="editForm.dni"
                  class="mt-0.5 w-full rounded border border-surface-700/50 bg-surface-900 px-2 py-1 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
                <p v-else class="text-gray-200">{{ customer.dni || '—' }}</p>
              </div>
              <div>
                <label class="text-2xs text-gray-500">Registrado</label>
                <p class="text-gray-200">{{ fmtDate(customer.date_joined) }}</p>
              </div>
              <div v-if="customer.admin_notes">
                <label class="text-2xs text-gray-500">Nota admin</label>
                <p class="text-xs text-amber-400">{{ customer.admin_notes }}</p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="space-y-2 rounded-xl border border-surface-700/50 bg-surface-800 p-4">
            <h2 class="mb-2 text-sm font-semibold text-gray-300">Acciones</h2>
            <button v-if="customer.is_active" @click="doBlock"
              class="flex w-full items-center gap-2 rounded-lg border border-amber-500/30 px-3 py-2 text-sm text-amber-400 hover:bg-amber-500/10">
              <Ban :size="14" /> Bloquear cliente
            </button>
            <button v-else @click="doUnblock"
              class="flex w-full items-center gap-2 rounded-lg border border-green-500/30 px-3 py-2 text-sm text-green-400 hover:bg-green-500/10">
              <Unlock :size="14" /> Desbloquear cliente
            </button>
            <button @click="doDelete"
              class="flex w-full items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10">
              <Trash2 :size="14" /> Eliminar cliente
            </button>
          </div>
        </div>
      </div>
    </template>

    <ConfirmDialog
      v-model:open="confirmOpen" :title="confirmTitle" :message="confirmMessage"
      :variant="confirmVariant" :loading="confirmLoading" confirm-label="Confirmar"
      @confirm="handleConfirm"
    />
  </div>
</template>
