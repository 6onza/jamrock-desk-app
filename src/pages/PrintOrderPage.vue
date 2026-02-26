<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Printer } from 'lucide-vue-next'
import { getOrderDetail } from '@/services/orders'
import type { Order } from '@/types/orders'

const route = useRoute()
const router = useRouter()
const order = ref<Order | null>(null)
const loading = ref(true)
const orderId = route.params.id as string

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
function fmtPrice(n: number) { return Math.round(n).toLocaleString('es-AR') }
function printPage() { window.print() }

onMounted(async () => {
  try { order.value = await getOrderDetail(orderId) }
  catch { router.push('/orders') }
  finally { loading.value = false }
})
</script>

<template>
  <div class="print-wrapper">
    <div v-if="loading" class="flex items-center justify-center py-20 text-gray-500">Cargando…</div>

    <template v-else-if="order">
      <!-- Print controls (hidden on print) -->
      <div class="no-print mb-6 flex items-center justify-between">
        <button class="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300" @click="router.push(`/orders/${orderId}`)">← Volver al pedido</button>
        <button class="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500" @click="printPage">
          <Printer :size="16" /> Imprimir
        </button>
      </div>

      <!-- Printable content -->
      <div class="print-content">
        <!-- Header -->
        <div class="header">
          <div>
            <img src="@/assets/jamrock-logo.png" alt="Jamrock Logo" class="mb-2 h-40">
            <h1 class="text-2xl font-bold text-gray-900">Jamrock Growshop</h1>
            <p class="text-sm text-gray-500">Comprobante de pedido</p>  
          </div>
          <div class="text-right">
            <p class="text-lg font-bold text-gray-900">Pedido #{{ order.id }}</p>
            <p class="text-sm text-gray-500">{{ fmtDate(order.created_at) }}</p>
          </div>
        </div>

        <hr class="my-4 border-gray-300" />

        <!-- Customer + Shipping -->
        <div class="grid grid-cols-2 gap-6">
          <div>
            <h2 class="mb-2 text-xs font-bold uppercase text-gray-500">Datos del cliente</h2>
            <p class="text-sm text-gray-900">{{ order.recipient_name }}</p>
            <p class="text-sm text-gray-600">{{ order.customer_email }}</p>
            <p class="text-sm text-gray-600">{{ order.customer_phone }}</p>
            <p v-if="order.customer_dni_cuit" class="text-sm text-gray-600">DNI/CUIT: {{ order.customer_dni_cuit }}</p>
          </div>
          <div>
            <h2 class="mb-2 text-xs font-bold uppercase text-gray-500">Entrega</h2>
            <p class="text-sm text-gray-900">{{ order.delivery_type === 'delivery' ? 'Envío a domicilio' : 'Retiro / Acordar' }}</p>
            <template v-if="order.delivery_type === 'delivery'">
              <p v-if="order.shipping_street" class="text-sm text-gray-600">{{ order.shipping_street }} {{ order.shipping_number }}</p>
              <p v-if="order.shipping_city" class="text-sm text-gray-600">{{ order.shipping_city }} {{ order.shipping_postal_code }}</p>
            </template>
          </div>
        </div>

        <!-- Items table -->
        <table class="mt-6 w-full text-sm">
          <thead>
            <tr class="border-b-2 border-gray-300">
              <th class="pb-2 text-left text-xs font-bold uppercase text-gray-500">Producto</th>
              <th class="pb-2 text-center text-xs font-bold uppercase text-gray-500">Cant.</th>
              <th class="pb-2 text-right text-xs font-bold uppercase text-gray-500">Precio unit.</th>
              <th class="pb-2 text-right text-xs font-bold uppercase text-gray-500">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in order.products" :key="item.id" class="border-b border-gray-200">
              <td class="py-2 text-gray-900">
                {{ item.product_details?.name || 'Producto eliminado' }}
                <span v-if="item.variants_label" class="block text-xs text-gray-500">{{ item.variants_label }}</span>
              </td>
              <td class="py-2 text-center text-gray-700">{{ item.quantity }}</td>
              <td class="py-2 text-right text-gray-700">${{ fmtPrice(item.price_at_time) }}</td>
              <td class="py-2 text-right font-medium text-gray-900">${{ fmtPrice(item.price_at_time * item.quantity) }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Totals -->
        <div class="mt-4 flex justify-end">
          <div class="w-64 space-y-1 text-sm">
            <div class="flex justify-between text-gray-600"><span>Subtotal</span><span>${{ fmtPrice(order.subtotal) }}</span></div>
            <div v-if="order.discount > 0" class="flex justify-between text-green-600"><span>Descuento</span><span>-${{ fmtPrice(order.discount) }}</span></div>
            <div v-if="order.bulk_promotion_discount > 0" class="flex justify-between text-green-600"><span>Promo bulk</span><span>-${{ fmtPrice(order.bulk_promotion_discount) }}</span></div>
            <hr class="border-gray-300" />
            <div class="flex justify-between text-lg font-bold text-gray-900"><span>Total</span><span>${{ fmtPrice(order.total) }}</span></div>
          </div>
        </div>

        <!-- Footer -->
        <div class="mt-8 border-t border-gray-300 pt-4 text-center text-xs text-gray-400">
          Jamrock Growshop — Comprobante generado automáticamente
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.print-wrapper {
  min-height: 100vh;
  background: white;
  padding: 2rem;
  color: #1a1a1a;
}
.print-content {
  max-width: 800px;
  margin: 0 auto;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
@media print {
  .no-print { display: none !important; }
  .print-wrapper { padding: 0; }
}
</style>
