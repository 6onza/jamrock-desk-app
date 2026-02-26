<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Search, Plus, Minus, Trash2, ShoppingCart,
  User, ArrowLeft, Tag, Check,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import { getProducts } from '@/services/products'
import { createOrder } from '@/services/orders'
import type { ProductListItem } from '@/types/products'
import type { CreateOrderItemData, DeliveryType, PaymentMethod } from '@/types/orders'

const router = useRouter()

// ── Product search ──
const searchQuery = ref('')
const searchResults = ref<ProductListItem[]>([])
const searching = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | undefined

// ── Cart ──
interface CartItem {
  product: ProductListItem
  quantity: number
  unitPrice: number
  selectedVariants: Record<string, string>
  variantsLabel: string
}
const cart = ref<CartItem[]>([])

// ── Customer form ──
const customerName = ref('')
const customerEmail = ref('')
const customerPhone = ref('')
const customerDni = ref('')
const deliveryType = ref<DeliveryType>('pickup')
const paymentMethod = ref<PaymentMethod>('cash')
const shippingStreet = ref('')
const shippingNumber = ref('')
const shippingCity = ref('')
const shippingPostalCode = ref('')
const shippingAddress = ref('')
const couponCode = ref('')

// ── State ──
const submitting = ref(false)
const submitError = ref('')

// ── Product search ──
function onSearchInput() {
  clearTimeout(searchTimer)
  if (searchQuery.value.length < 2) { searchResults.value = []; return }
  searchTimer = setTimeout(async () => {
    searching.value = true
    try {
      const res = await getProducts({ search: searchQuery.value, page: 1, page_size: 10, is_available: 'true' })
      searchResults.value = res.results
    } catch { searchResults.value = [] }
    finally { searching.value = false }
  }, 300)
}

function addToCart(product: ProductListItem) {
  const existing = cart.value.find(i => i.product.id === product.id && i.variantsLabel === '')
  if (existing) { existing.quantity++ }
  else {
    cart.value.push({
      product, quantity: 1, unitPrice: product.final_price ?? product.price,
      selectedVariants: {}, variantsLabel: '',
    })
  }
  searchQuery.value = ''
  searchResults.value = []
}

function removeFromCart(idx: number) { cart.value.splice(idx, 1) }
function adjustCartQty(idx: number, delta: number) {
  cart.value[idx].quantity = Math.max(1, cart.value[idx].quantity + delta)
}

// ── Totals ──
const subtotal = computed(() => cart.value.reduce((s, i) => s + i.unitPrice * i.quantity, 0))
const total = computed(() => subtotal.value)

// ── Submit ──
async function handleSubmit() {
  submitError.value = ''
  if (cart.value.length === 0) { submitError.value = 'Agrega al menos un producto al carrito.'; return }
  if (!customerName.value || !customerEmail.value || !customerPhone.value) {
    submitError.value = 'Completa los datos del cliente (nombre, email, teléfono).'; return
  }
  submitting.value = true
  try {
    const productsData: CreateOrderItemData[] = cart.value.map(item => ({
      product_id: item.product.id, quantity: item.quantity, price: item.unitPrice,
      variants: Object.keys(item.selectedVariants).length ? item.selectedVariants : null,
      variants_label: item.variantsLabel,
    }))
    const order = await createOrder({
      recipient_name: customerName.value, customer_email: customerEmail.value,
      customer_phone: customerPhone.value, customer_dni_cuit: customerDni.value || undefined,
      delivery_type: deliveryType.value, payment_method: paymentMethod.value,
      shipping_street: shippingStreet.value || undefined, shipping_number: shippingNumber.value || undefined,
      shipping_city: shippingCity.value || undefined, shipping_postal_code: shippingPostalCode.value || undefined,
      shipping_address: shippingAddress.value || undefined,
      products_data: productsData, coupon_code: couponCode.value || undefined,
    })
    router.push(`/orders/${order.id}`)
  } catch (e) { submitError.value = (e as Error).message || 'Error al crear la orden.' }
  finally { submitting.value = false }
}

function fmtPrice(n: number) { return Math.round(n).toLocaleString('es-AR') }
</script>

<template>
  <div>
    <PageHeader title="Nueva venta" subtitle="Crear una orden de venta manual">
      <template #actions>
        <button class="inline-flex items-center gap-1.5 rounded-lg border border-surface-700/50 px-3 py-2 text-xs text-gray-400 hover:text-gray-200" @click="router.push('/orders')">
          <ArrowLeft :size="14" /> Volver a pedidos
        </button>
      </template>
    </PageHeader>

    <div class="mt-6 grid gap-6 lg:grid-cols-5">
      <!-- Left: Product search + Cart -->
      <div class="lg:col-span-3 space-y-6">
        <!-- Product Search -->
        <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-5">
          <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200">
            <Search :size="16" class="text-primary-400" /> Buscar productos
          </h3>
          <div class="relative">
            <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input v-model="searchQuery" type="text" class="input-field pl-9 text-sm" placeholder="Buscar por nombre o SKU…" @input="onSearchInput" />
          </div>
          <div v-if="searching" class="mt-3 text-center"><LoadingSpinner text="Buscando…" /></div>
          <div v-else-if="searchResults.length > 0" class="mt-3 max-h-64 space-y-2 overflow-y-auto">
            <div
              v-for="p in searchResults" :key="p.id"
              class="flex items-center gap-3 rounded-lg border border-surface-700/30 p-3 transition-colors hover:bg-surface-700/30 cursor-pointer"
              @click="addToCart(p)"
            >
              <img :src="p.image || ''" :alt="p.name" class="h-10 w-10 rounded-md bg-surface-700 object-cover" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-200 truncate">{{ p.name }}</p>
                <p class="text-2xs text-gray-500">Stock: {{ p.stock }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm font-medium text-gray-200">${{ fmtPrice(p.final_price ?? p.price) }}</p>
                <p v-if="p.total_discount > 0" class="text-2xs text-green-400">-{{ p.total_discount }}%</p>
              </div>
              <Plus :size="16" class="text-primary-400 flex-shrink-0" />
            </div>
          </div>
        </div>

        <!-- Cart Items -->
        <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-5">
          <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200">
            <ShoppingCart :size="16" class="text-primary-400" /> Carrito ({{ cart.length }} productos)
          </h3>
          <div v-if="cart.length === 0" class="py-8 text-center text-sm text-gray-500">Busca y agrega productos al carrito</div>
          <div v-else class="space-y-3">
            <div v-for="(item, idx) in cart" :key="idx" class="flex items-center gap-3 rounded-lg border border-surface-700/30 p-3">
              <img :src="item.product.image || ''" :alt="item.product.name" class="h-10 w-10 rounded-md bg-surface-700 object-cover" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-200 truncate">{{ item.product.name }}</p>
                <p class="text-2xs text-gray-500">${{ fmtPrice(item.unitPrice) }} c/u</p>
              </div>
              <div class="flex items-center gap-1.5">
                <button class="rounded-md bg-surface-700 p-1 text-gray-400 hover:text-gray-200 disabled:opacity-30" :disabled="item.quantity <= 1" @click="adjustCartQty(idx, -1)"><Minus :size="12" /></button>
                <span class="w-8 text-center text-sm text-gray-200">{{ item.quantity }}</span>
                <button class="rounded-md bg-surface-700 p-1 text-gray-400 hover:text-gray-200" @click="adjustCartQty(idx, 1)"><Plus :size="12" /></button>
              </div>
              <p class="w-20 text-right text-sm font-medium text-gray-200">${{ fmtPrice(item.unitPrice * item.quantity) }}</p>
              <button class="rounded-md p-1 text-red-400 hover:bg-red-500/10" @click="removeFromCart(idx)"><Trash2 :size="14" /></button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Customer form + Summary -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Customer info -->
        <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-5">
          <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200"><User :size="16" class="text-primary-400" /> Datos del cliente</h3>
          <div class="space-y-3">
            <div><label class="mb-1 block text-2xs font-medium text-gray-500">Nombre *</label><input v-model="customerName" type="text" class="input-field text-sm" placeholder="Nombre completo" /></div>
            <div><label class="mb-1 block text-2xs font-medium text-gray-500">Email *</label><input v-model="customerEmail" type="email" class="input-field text-sm" placeholder="email@ejemplo.com" /></div>
            <div><label class="mb-1 block text-2xs font-medium text-gray-500">Teléfono *</label><input v-model="customerPhone" type="tel" class="input-field text-sm" placeholder="+54 11 …" /></div>
            <div><label class="mb-1 block text-2xs font-medium text-gray-500">DNI/CUIT</label><input v-model="customerDni" type="text" class="input-field text-sm" placeholder="Opcional" /></div>
          </div>
        </div>

        <!-- Delivery -->
        <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-5">
          <h3 class="mb-3 text-sm font-semibold text-gray-200">Entrega</h3>
          <div class="flex gap-2">
            <button
              v-for="opt in [{ v: 'pickup' as DeliveryType, l: 'Retiro / acordar' }, { v: 'delivery' as DeliveryType, l: 'Envío a domicilio' }]" :key="opt.v"
              class="flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
              :class="deliveryType === opt.v ? 'border-primary-500/30 bg-primary-500/10 text-primary-400' : 'border-surface-700/50 text-gray-400 hover:text-gray-200'"
              @click="deliveryType = opt.v"
            >{{ opt.l }}</button>
          </div>
          <div v-if="deliveryType === 'delivery'" class="mt-3 space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="mb-1 block text-2xs font-medium text-gray-500">Calle</label><input v-model="shippingStreet" type="text" class="input-field text-sm" /></div>
              <div><label class="mb-1 block text-2xs font-medium text-gray-500">Número</label><input v-model="shippingNumber" type="text" class="input-field text-sm" /></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="mb-1 block text-2xs font-medium text-gray-500">Ciudad</label><input v-model="shippingCity" type="text" class="input-field text-sm" /></div>
              <div><label class="mb-1 block text-2xs font-medium text-gray-500">C.P.</label><input v-model="shippingPostalCode" type="text" class="input-field text-sm" /></div>
            </div>
            <div><label class="mb-1 block text-2xs font-medium text-gray-500">Notas de envío</label><textarea v-model="shippingAddress" class="input-field text-sm" rows="2" /></div>
          </div>
        </div>

        <!-- Payment method -->
        <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-5">
          <h3 class="mb-3 text-sm font-semibold text-gray-200">Método de pago</h3>
          <div class="flex gap-2">
            <button
              v-for="opt in [{ v: 'cash' as PaymentMethod, l: 'Efectivo / Acordar' }, { v: 'online' as PaymentMethod, l: 'MercadoPago' }]" :key="opt.v"
              class="flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
              :class="paymentMethod === opt.v ? 'border-primary-500/30 bg-primary-500/10 text-primary-400' : 'border-surface-700/50 text-gray-400 hover:text-gray-200'"
              @click="paymentMethod = opt.v"
            >{{ opt.l }}</button>
          </div>
        </div>

        <!-- Coupon -->
        <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-5">
          <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200"><Tag :size="16" class="text-primary-400" /> Cupón</h3>
          <input v-model="couponCode" type="text" class="input-field text-sm" placeholder="Código de cupón (opcional)" />
          <p class="mt-1 text-2xs text-gray-500">El descuento se calculará al crear la orden.</p>
        </div>

        <!-- Summary + Submit -->
        <div class="rounded-xl border border-primary-500/20 bg-primary-500/5 p-5">
          <div class="space-y-2 text-sm">
            <div class="flex justify-between text-gray-400"><span>Subtotal ({{ cart.length }} productos)</span><span>${{ fmtPrice(subtotal) }}</span></div>
            <div class="flex justify-between font-semibold text-gray-200 text-base"><span>Total estimado</span><span>${{ fmtPrice(total) }}</span></div>
          </div>
          <p v-if="submitError" class="mt-3 text-xs text-red-400">{{ submitError }}</p>
          <button
            class="mt-4 w-full rounded-lg bg-primary-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
            :disabled="submitting || cart.length === 0" @click="handleSubmit"
          >
            <span v-if="submitting">Creando orden…</span>
            <span v-else class="inline-flex items-center gap-1.5"><Check :size="16" /> Crear orden</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
