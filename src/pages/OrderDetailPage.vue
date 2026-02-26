<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft, Printer, Edit3, Save, X,
  Package, User, MapPin, CreditCard, Clock,
  ChevronDown, Minus, Plus, Trash2, Truck,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import {
  getOrderDetail, updateOrderStatus, updateOrderItems,
  notifyShipping, deleteOrder,
} from '@/services/orders'
import type { Order, OrderStatus, UpdateOrderItemData } from '@/types/orders'
import { ORDER_TRANSITIONS } from '@/types/orders'

const route = useRoute()
const router = useRouter()

const order = ref<Order | null>(null)
const loading = ref(true)
const error = ref('')
const statusDropdownOpen = ref(false)
const editingItems = ref(false)
const editedItems = ref<{ id: number; quantity: number }[]>([])
const saving = ref(false)
const statusChanging = ref(false)
const notifying = ref(false)
const confirmOpen = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmAction = ref<(() => Promise<void>) | null>(null)

const orderId = () => route.params.id as string

async function loadOrder() {
  loading.value = true
  error.value = ''
  try { order.value = await getOrderDetail(orderId()) }
  catch (e) { error.value = (e as Error).message || 'Error al cargar el pedido' }
  finally { loading.value = false }
}

// ── Status ──
function availableTransitions(): OrderStatus[] {
  if (!order.value) return []
  return (ORDER_TRANSITIONS[order.value.status] ?? []).filter(s => s !== order.value!.status)
}
async function changeStatus(status: string) {
  if (!order.value) return
  statusDropdownOpen.value = false
  statusChanging.value = true
  try { order.value = await updateOrderStatus(order.value.id, status) }
  finally { statusChanging.value = false }
}

// ── Notify shipping ──
async function handleNotify() {
  if (!order.value) return
  notifying.value = true
  try { await notifyShipping(order.value.id); await loadOrder() }
  finally { notifying.value = false }
}

// ── Edit items ──
function startEdit() {
  if (!order.value) return
  editedItems.value = order.value.products.map(p => ({ id: p.id, quantity: p.quantity }))
  editingItems.value = true
}
function cancelEdit() { editingItems.value = false; editedItems.value = [] }
function adjustQty(itemId: number, delta: number) {
  const item = editedItems.value.find(i => i.id === itemId)
  if (item) item.quantity = Math.max(1, item.quantity + delta)
}
function removeItem(itemId: number) {
  editedItems.value = editedItems.value.filter(i => i.id !== itemId)
}
function getEditedQty(itemId: number): number {
  return editedItems.value.find(i => i.id === itemId)?.quantity ?? 0
}
function isItemRemoved(itemId: number): boolean {
  return !editedItems.value.find(i => i.id === itemId)
}
async function saveItems() {
  if (!order.value) return
  saving.value = true
  try {
    const items: UpdateOrderItemData[] = editedItems.value.map(i => ({ id: i.id, quantity: i.quantity }))
    order.value = await updateOrderItems(order.value.id, items)
    editingItems.value = false
    editedItems.value = []
  } finally { saving.value = false }
}

// ── Delete ──
function confirmDeleteOrder() {
  if (!order.value) return
  confirmTitle.value = 'Eliminar pedido'
  confirmMessage.value = `¿Eliminar pedido #${order.value.id}? Esta acción no se puede deshacer.`
  confirmAction.value = async () => {
    await deleteOrder(order.value!.id)
    confirmOpen.value = false
    router.push('/orders')
  }
  confirmOpen.value = true
}

// ── Print ──
function goPrint() {
  router.push(`/orders/${orderId()}/print`)
}

// ── Formatting ──
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
function fmtPrice(n: number) { return Math.round(n).toLocaleString('es-AR') }

function onDocClick(ev: MouseEvent) {
  if (!(ev.target as HTMLElement).closest('[data-status-dropdown]')) statusDropdownOpen.value = false
}
onMounted(() => { loadOrder(); document.addEventListener('click', onDocClick) })
onUnmounted(() => document.removeEventListener('click', onDocClick))
watch(() => route.params.id, () => loadOrder())
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <LoadingSpinner text="Cargando pedido…" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="py-20 text-center">
      <p class="text-red-400">{{ error }}</p>
      <button class="mt-4 text-sm text-primary-400 hover:underline" @click="loadOrder">Reintentar</button>
    </div>

    <!-- Content -->
    <template v-else-if="order">
      <PageHeader :title="`Pedido #${order.id}`" :subtitle="fmtDate(order.created_at)">
        <template #actions>
          <div class="flex items-center gap-2">
            <button class="inline-flex items-center gap-1.5 rounded-lg border border-surface-700/50 px-3 py-2 text-xs text-gray-400 hover:text-gray-200" @click="router.push('/orders')">
              <ArrowLeft :size="14" /> Volver
            </button>
            <button class="inline-flex items-center gap-1.5 rounded-lg border border-surface-700/50 px-3 py-2 text-xs text-gray-400 hover:text-gray-200" @click="goPrint">
              <Printer :size="14" /> Imprimir
            </button>
            <div class="relative" data-status-dropdown>
              <button
                class="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-xs font-medium text-white hover:bg-primary-600 disabled:opacity-50"
                :disabled="statusChanging" @click.stop="statusDropdownOpen = !statusDropdownOpen"
              >{{ statusChanging ? 'Cambiando…' : 'Cambiar estado' }} <ChevronDown :size="14" /></button>
              <div v-if="statusDropdownOpen" class="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-surface-700/50 bg-surface-800 p-1 shadow-xl">
                <button
                  v-for="t in availableTransitions()" :key="t"
                  class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-gray-300 hover:bg-surface-700/50"
                  @click="changeStatus(t)"
                ><StatusBadge :status="t" size="xs" /></button>
              </div>
            </div>
          </div>
        </template>
      </PageHeader>

      <div class="mt-6 grid gap-6 lg:grid-cols-3">
        <!-- Left: Items -->
        <div class="lg:col-span-2 space-y-6">
          <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-200"><Package :size="16" class="text-primary-400" /> Productos ({{ order.products.length }})</h3>
              <button v-if="!editingItems" class="text-xs text-primary-400 hover:underline" @click="startEdit"><Edit3 :size="12" class="inline mr-1" /> Editar</button>
              <div v-else class="flex items-center gap-2">
                <button class="inline-flex items-center gap-1 rounded-md bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 disabled:opacity-50" :disabled="saving" @click="saveItems">
                  <Save :size="12" /> {{ saving ? 'Guardando…' : 'Guardar' }}
                </button>
                <button class="inline-flex items-center gap-1 rounded-md border border-surface-700/50 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200" @click="cancelEdit"><X :size="12" /> Cancelar</button>
              </div>
            </div>
            <div class="space-y-3">
              <div
                v-for="item in order.products" :key="item.id"
                class="flex items-center gap-4 rounded-lg border border-surface-700/30 p-3"
                :class="{ 'opacity-30': editingItems && isItemRemoved(item.id) }"
              >
                <img :src="item.product_details?.image || ''" :alt="item.product_details?.name || 'Producto'" class="h-12 w-12 rounded-lg bg-surface-700 object-cover" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-200 truncate">{{ item.product_details?.name || 'Producto eliminado' }}</p>
                  <p v-if="item.variants_label" class="text-2xs text-gray-500">{{ item.variants_label }}</p>
                  <p class="text-2xs text-gray-500">${{ fmtPrice(item.price_at_time) }}
                    <span v-if="item.product_details?.currency === 'USD'" class="text-green-400"> (USD)</span>
                  </p>
                </div>
                <div v-if="editingItems && !isItemRemoved(item.id)" class="flex items-center gap-1.5">
                  <button class="rounded-md bg-surface-700 p-1 text-gray-400 hover:text-gray-200 disabled:opacity-30" :disabled="getEditedQty(item.id) <= 1" @click="adjustQty(item.id, -1)"><Minus :size="12" /></button>
                  <span class="w-8 text-center text-sm text-gray-200">{{ getEditedQty(item.id) }}</span>
                  <button class="rounded-md bg-surface-700 p-1 text-gray-400 hover:text-gray-200" @click="adjustQty(item.id, 1)"><Plus :size="12" /></button>
                  <button class="ml-2 rounded-md p-1 text-red-400 hover:bg-red-500/10" @click="removeItem(item.id)"><Trash2 :size="12" /></button>
                </div>
                <div v-else class="text-right">
                  <p class="text-sm text-gray-300">×{{ item.quantity }}</p>
                  <p class="text-xs font-medium text-gray-200">${{ fmtPrice(item.price_at_time * item.quantity) }}</p>
                </div>
              </div>
            </div>
            <!-- Totals -->
            <div class="mt-4 space-y-1 border-t border-surface-700/50 pt-4 text-sm">
              <div class="flex justify-between text-gray-400"><span>Subtotal</span><span>${{ fmtPrice(order.subtotal) }}</span></div>
              <div v-if="order.discount > 0" class="flex justify-between text-green-400"><span>Descuento (cupón)</span><span>-${{ fmtPrice(order.discount) }}</span></div>
              <div v-if="order.bulk_promotion_discount > 0" class="flex justify-between text-green-400"><span>Promoción bulk</span><span>-${{ fmtPrice(order.bulk_promotion_discount) }}</span></div>
              <div class="flex justify-between font-semibold text-gray-200"><span>Total</span><span>${{ fmtPrice(order.total) }}</span></div>
            </div>
          </div>

          <!-- Coupon -->
          <div v-if="order.coupon_details" class="rounded-xl border border-surface-700/50 bg-surface-800 p-5">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-3"><CreditCard :size="16" class="text-primary-400" /> Cupón aplicado</h3>
            <div class="grid grid-cols-3 gap-4 text-sm">
              <div><p class="text-2xs text-gray-500">Código</p><p class="font-medium text-primary-400">{{ order.coupon_details.code }}</p></div>
              <div><p class="text-2xs text-gray-500">Tipo</p><p class="text-gray-300">{{ order.coupon_details.type === 'percentage' ? 'Porcentaje' : 'Monto fijo' }}</p></div>
              <div><p class="text-2xs text-gray-500">Valor</p><p class="text-gray-300">{{ order.coupon_details.type === 'percentage' ? `${order.coupon_details.value}%` : `$${fmtPrice(order.coupon_details.value)}` }}</p></div>
            </div>
          </div>
        </div>

        <!-- Right: Meta -->
        <div class="space-y-6">
          <!-- Status -->
          <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-5">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-3"><Clock :size="16" class="text-primary-400" /> Estado</h3>
            <StatusBadge :status="order.status" size="md" />
            <p class="mt-2 text-2xs text-gray-500">Actualizado {{ fmtDate(order.updated_at) }}</p>
            <div v-if="order.status === 'shipped'" class="mt-3 pt-3 border-t border-surface-700/50">
              <p v-if="order.shipping_notification_sent" class="text-xs text-green-400">✓ Notificación de envío enviada</p>
              <button v-else class="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 disabled:opacity-50" :disabled="notifying" @click="handleNotify">
                <Truck :size="14" /> {{ notifying ? 'Enviando…' : 'Notificar envío al cliente' }}
              </button>
            </div>
          </div>

          <!-- Customer -->
          <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-5">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-3"><User :size="16" class="text-primary-400" /> Cliente</h3>
            <div class="space-y-2 text-sm">
              <div><p class="text-2xs text-gray-500">Nombre</p><p class="text-gray-300">{{ order.recipient_name }}</p></div>
              <div><p class="text-2xs text-gray-500">Email</p><p class="text-gray-300">{{ order.customer_email }}</p></div>
              <div><p class="text-2xs text-gray-500">Teléfono</p><p class="text-gray-300">{{ order.customer_phone || '—' }}</p></div>
              <div v-if="order.customer_dni_cuit"><p class="text-2xs text-gray-500">DNI/CUIT</p><p class="text-gray-300">{{ order.customer_dni_cuit }}</p></div>
            </div>
          </div>

          <!-- Shipping -->
          <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-5">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-3"><MapPin :size="16" class="text-primary-400" /> Entrega</h3>
            <div class="space-y-2 text-sm">
              <div><p class="text-2xs text-gray-500">Tipo</p><p class="text-gray-300">{{ order.delivery_type === 'delivery' ? 'Envío a domicilio' : 'Retiro / acordar' }}</p></div>
              <template v-if="order.delivery_type === 'delivery'">
                <div v-if="order.shipping_street"><p class="text-2xs text-gray-500">Dirección</p><p class="text-gray-300">{{ order.shipping_street }} {{ order.shipping_number }}<span v-if="order.shipping_neighborhood">, {{ order.shipping_neighborhood }}</span></p></div>
                <div v-if="order.shipping_city"><p class="text-2xs text-gray-500">Ciudad</p><p class="text-gray-300">{{ order.shipping_city }} {{ order.shipping_postal_code }}</p></div>
                <div v-if="order.shipping_address"><p class="text-2xs text-gray-500">Notas</p><p class="text-gray-300">{{ order.shipping_address }}</p></div>
              </template>
            </div>
          </div>

          <!-- Danger zone -->
          <div class="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
            <h3 class="text-sm font-semibold text-red-400 mb-3">Zona de peligro</h3>
            <button class="inline-flex items-center gap-1.5 rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10" @click="confirmDeleteOrder">
              <Trash2 :size="14" /> Eliminar pedido
            </button>
          </div>
        </div>
      </div>
    </template>

    <ConfirmDialog
      :open="confirmOpen" :title="confirmTitle" :message="confirmMessage"
      confirm-label="Eliminar" variant="danger"
      @confirm="confirmAction?.()" @cancel="confirmOpen = false" @update:open="confirmOpen = $event"
    />
  </div>
</template>
