<script setup lang="ts">
// ─── ProductFormPage ───
// Create / edit product with variants, Cloudinary upload, Vuelidate rules.

import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVuelidate } from '@vuelidate/core'
import { required, minValue, maxValue, helpers } from '@vuelidate/validators'
import { useProductsStore } from '@/stores/products'
import { uploadImageToCloudinary } from '@/services/products'
import { getCurrentDollarRate } from '@/services/payments'
import { PageHeader, LoadingSpinner } from '@/components/ui'
import {
  CURRENCY_OPTIONS,
  EMPTY_PRODUCT_FORM,
  formatPrice,
} from '@/types/products'
import type { ProductFormData, VariantOption } from '@/types/products'
import {
  Save,
  ArrowLeft,
  X,
  Plus,
  Trash2,
  Image as ImageIcon,
  RefreshCw,
  Tag,
  DollarSign,
  Boxes,
  FileText,
  Settings,
  Eye,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = useProductsStore()

// ─── Mode detection ───
const productId = computed(() =>
  route.params.id ? Number(route.params.id) : null,
)
const isEdit = computed(() => !!productId.value)
const pageTitle = computed(() =>
  isEdit.value ? 'Editar producto' : 'Nuevo producto',
)
const pageSubtitle = computed(() =>
  isEdit.value ? 'Modificar datos del producto' : 'Agregar un nuevo producto al catálogo',
)

// ─── Form state ───
const form = reactive<ProductFormData>({ ...EMPTY_PRODUCT_FORM })
const initialLoading = ref(false)
const isSaving = ref(false)
const activeTab = ref<'general' | 'pricing' | 'variants' | 'images' | 'advanced'>('general')

// Image upload state
const isUploadingImage = ref(false)
const isUploadingImage2 = ref(false)
const imageFileInput = ref<HTMLInputElement | null>(null)
const image2FileInput = ref<HTMLInputElement | null>(null)

// Inline category creation
const showNewCategory = ref(false)
const newCategoryName = ref('')
const isCreatingCategory = ref(false)

// Dollar rate
const dollarRate = ref<number | null>(null)
const showCurrencyChangeAlert = ref(false)
const currencyConversionApplied = ref(false) // true = price was actually converted
const pendingConversion = ref<{ from: string; to: string; price: number } | null>(null)

// ─── Validation rules ───
const rules = computed(() => ({
  name: { required: helpers.withMessage('El nombre es obligatorio', required) },
  category: { required: helpers.withMessage('Seleccioná una categoría', required) },
  price: { minValue: helpers.withMessage('El precio debe ser ≥ 0', minValue(0)) },
  discount: {
    minValue: helpers.withMessage('El descuento debe ser ≥ 0', minValue(0)),
    maxValue: helpers.withMessage('El descuento debe ser ≤ 100', maxValue(100)),
  },
  stock: { minValue: helpers.withMessage('El stock debe ser ≥ 0', minValue(0)) },
}))

const v$ = useVuelidate(rules, form)

// ─── Computed ───
const computedFinalPrice = computed(() => {
  const p = Number(form.price) || 0
  const d = Number(form.discount) || 0
  return Math.max(0, p * (1 - d / 100))
})

// Currency-aware price formatting
const currencySymbol = computed(() => (form.currency === 'USD' ? 'USD ' : '$ '))

const formattedFinalPrice = computed(() => {
  if (form.currency === 'USD') {
    return Number(computedFinalPrice.value).toFixed(2)
  }
  return formatPrice(computedFinalPrice.value)
})

const formattedBasePrice = computed(() => {
  if (form.currency === 'USD') {
    return Number(form.price).toFixed(2)
  }
  return formatPrice(form.price)
})

// ARS equivalent of the final price (shown when currency = USD)
const arsEquivalent = computed(() => {
  if (form.currency !== 'USD' || !dollarRate.value) return null
  return formatPrice(computedFinalPrice.value * dollarRate.value)
})

const categories = computed(() => store.categories)

const tabs = [
  { key: 'general', label: 'General', icon: FileText },
  { key: 'pricing', label: 'Precios', icon: DollarSign },
  { key: 'variants', label: 'Variantes', icon: Tag },
  { key: 'images', label: 'Imágenes', icon: ImageIcon },
  { key: 'advanced', label: 'Avanzado', icon: Settings },
] as const

// ─── Watch currency change ───
const originalCurrency = ref<string | null>(null)

function applyConversion(fromCurrency: string, toCurrency: string, price: number, rate: number): number {
  if (toCurrency === 'ARS' && fromCurrency === 'USD') return Math.round(price * rate)
  if (toCurrency === 'USD' && fromCurrency === 'ARS') return parseFloat((price / rate).toFixed(2))
  return price
}

watch(() => form.currency, (newVal, oldVal) => {
  if (!oldVal || newVal === oldVal) return

  // Alert only when user changed away from the saved currency
  if (originalCurrency.value !== null && newVal !== originalCurrency.value) {
    showCurrencyChangeAlert.value = true
  } else {
    showCurrencyChangeAlert.value = false
    pendingConversion.value = null
    currencyConversionApplied.value = false
    return
  }

  if (dollarRate.value && dollarRate.value > 0) {
    // Rate already available — convert immediately
    form.price = applyConversion(oldVal, newVal, Number(form.price), dollarRate.value)
    // Also convert all variant price_adjustments
    for (const variant of form.variants) {
      for (const option of variant.options) {
        option.price_adjustment = applyConversion(oldVal, newVal, Number(option.price_adjustment || 0), dollarRate.value)
      }
    }
    currencyConversionApplied.value = true
    pendingConversion.value = null
  } else {
    // Rate not loaded yet — defer conversion
    currencyConversionApplied.value = false
    pendingConversion.value = { from: oldVal, to: newVal, price: Number(form.price) }
  }
})

// Apply deferred conversion once the rate loads
watch(dollarRate, (rate) => {
  if (rate && rate > 0 && pendingConversion.value) {
    const { from, to, price } = pendingConversion.value
    form.price = applyConversion(from, to, price, rate)
    // Also convert all variant price_adjustments
    for (const variant of form.variants) {
      for (const option of variant.options) {
        option.price_adjustment = applyConversion(from, to, Number(option.price_adjustment || 0), rate)
      }
    }
    currencyConversionApplied.value = true
    pendingConversion.value = null
  }
})

// ─── Load data ───
onMounted(async () => {
  initialLoading.value = true
  // Fetch dollar rate AND categories in parallel — both must resolve before showing the form
  const [, rateResult] = await Promise.allSettled([
    store.fetchCategories(),
    getCurrentDollarRate(),
  ])
  if (rateResult.status === 'fulfilled' && rateResult.value) {
    dollarRate.value = Number(rateResult.value.value)
  }
  if (productId.value) {
    const product = await store.fetchProduct(productId.value)
    if (product) {
      form.name = product.name
      form.brand = product.brand || ''
      form.description = product.description || ''
      form.category = product.category
      form.price = product.price
      form.discount = product.discount
      originalCurrency.value = product.currency
      form.currency = product.currency
      form.stock = product.stock
      form.volume = product.volume || ''
      form.dimensions = product.dimensions || ''
      form.image = product.image
      form.image_2 = product.image_2
      form.is_available = product.is_available
      form.has_variants = product.has_variants
      form.variants = product.variants ? JSON.parse(JSON.stringify(product.variants)) : []
      form.has_special_promotion = product.has_special_promotion
      form.special_promotion_name = product.special_promotion_name || ''
      originalCurrency.value = product.currency
    }
  }
  initialLoading.value = false
})

// ─── Image upload ───
async function handleImageUpload(slot: 'image' | 'image_2', event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const loading = slot === 'image' ? isUploadingImage : isUploadingImage2
  loading.value = true
  try {
    const url = await uploadImageToCloudinary(file)
    form[slot] = url
  } catch (err) {
    console.error('Upload failed:', err)
  } finally {
    loading.value = false
    input.value = ''
  }
}

function removeImage(slot: 'image' | 'image_2') {
  form[slot] = null
}

// ─── Variant builder ───
function addVariantGroup() {
  form.variants.push({
    variant_name: '',
    options: [{ name: '', stock: 0, price_adjustment: 0 }],
  })
}

function removeVariantGroup(index: number) {
  form.variants.splice(index, 1)
  if (form.variants.length === 0) {
    form.has_variants = false
  }
}

function addVariantOption(variantIndex: number) {
  form.variants[variantIndex].options.push({
    name: '',
    stock: 0,
    price_adjustment: 0,
  })
}

function removeVariantOption(variantIndex: number, optionIndex: number) {
  form.variants[variantIndex].options.splice(optionIndex, 1)
}

// ─── Variant price helpers ───
// The backend stores price_adjustment (relative to base price).
// The form shows the final absolute price per option so it’s intuitive.
function getVariantDisplayPrice(option: VariantOption): number {
  const base = Number(form.price) || 0
  return parseFloat((base + (Number(option.price_adjustment) || 0)).toFixed(2))
}

function setVariantDisplayPrice(option: VariantOption, rawValue: string) {
  const base = Number(form.price) || 0
  const entered = parseFloat(rawValue)
  if (isNaN(entered)) {
    option.price_adjustment = 0
    return
  }
  option.price_adjustment = parseFloat((entered - base).toFixed(2))
}

function formatVariantAdjustment(option: VariantOption): string {
  const adj = Number(option.price_adjustment) || 0
  if (adj === 0) return ''
  const sym = form.currency === 'USD' ? 'USD ' : '$'
  if (form.currency === 'USD') {
    return adj > 0 ? `+${sym}${adj.toFixed(2)}` : `${sym}${adj.toFixed(2)}`
  }
  return adj > 0
    ? `+${sym}${formatPrice(adj)}`
    : `-${sym}${formatPrice(Math.abs(adj))}`
}
async function createCategoryInline() {
  if (!newCategoryName.value.trim()) return
  isCreatingCategory.value = true
  const cat = await store.addCategory(newCategoryName.value.trim())
  if (cat) {
    form.category = cat.id
    newCategoryName.value = ''
    showNewCategory.value = false
  }
  isCreatingCategory.value = false
}

// ─── Save ───
async function handleSubmit() {
  const valid = await v$.value.$validate()
  if (!valid) {
    // Focus on first tab with errors
    if (v$.value.name.$error || v$.value.category.$error) activeTab.value = 'general'
    else if (v$.value.price.$error || v$.value.discount.$error) activeTab.value = 'pricing'
    else if (v$.value.stock.$error) activeTab.value = 'pricing'
    return
  }

  isSaving.value = true
  try {
    // Clean up variants if empty
    const payload: ProductFormData = { ...form }
    if (!payload.has_variants || payload.variants.length === 0) {
      payload.variants = []
      payload.has_variants = false
    }

    const saved = await store.saveProduct(payload, productId.value ?? undefined)
    if (saved) {
      originalCurrency.value = form.currency
      showCurrencyChangeAlert.value = false
      currencyConversionApplied.value = false
      pendingConversion.value = null
      router.push('/products')
    }
  } catch {
    // Error handled by store
  } finally {
    isSaving.value = false
  }
}

function goBack() {
  router.push('/products')
}

// ─── Watch variants toggle ───
watch(() => form.has_variants, (val) => {
  if (val && form.variants.length === 0) {
    addVariantGroup()
  }
})
</script>

<template>
  <div>
    <!-- Header -->
    <PageHeader :title="pageTitle" :subtitle="pageSubtitle">
      <template #actions>
        <button
          class="inline-flex items-center gap-1.5 rounded-lg border border-surface-600 px-4 py-2 text-sm text-surface-300 transition hover:text-white"
          @click="goBack"
        >
          <ArrowLeft class="h-4 w-4" />
          Volver
        </button>
        <button
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:opacity-50"
          :disabled="isSaving"
          @click="handleSubmit"
        >
          <RefreshCw v-if="isSaving" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          {{ isSaving ? 'Guardando…' : 'Guardar' }}
        </button>
      </template>
    </PageHeader>

    <!-- Loading -->
    <div v-if="initialLoading" class="mt-12">
      <LoadingSpinner label="Cargando producto…" />
    </div>

    <!-- Form -->
    <div v-else class="mt-6">
      <!-- Tabs -->
      <div class="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-surface-700 bg-surface-800/50 p-1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition"
          :class="activeTab === tab.key
            ? 'bg-surface-700 text-white shadow-sm'
            : 'text-surface-400 hover:text-white'"
          @click="activeTab = tab.key"
        >
          <component :is="tab.icon" class="h-4 w-4" />
          {{ tab.label }}
        </button>
      </div>

      <!-- Error banner -->
      <div v-if="store.error" class="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
        {{ store.error }}
      </div>

      <!-- ════════════════════ GENERAL TAB ════════════════════ -->
      <div v-show="activeTab === 'general'" class="space-y-5">
        <div class="rounded-xl border border-surface-700 bg-surface-800/50 p-5">
          <h3 class="mb-4 text-sm font-semibold text-white">Información básica</h3>

          <!-- Name -->
          <div class="mb-4">
            <label class="mb-1 block text-sm text-surface-300">Nombre *</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Nombre del producto"
              class="w-full rounded-lg border bg-surface-900 px-3 py-2 text-sm text-white outline-none transition"
              :class="v$.name.$error ? 'border-red-500' : 'border-surface-600 focus:border-primary-500'"
              @blur="v$.name.$touch()"
            />
            <p v-if="v$.name.$error" class="mt-1 text-xs text-red-400">
              {{ v$.name.$errors[0]?.$message }}
            </p>
          </div>

          <!-- Brand -->
          <div class="mb-4">
            <label class="mb-1 block text-sm text-surface-300">Marca</label>
            <input
              v-model="form.brand"
              type="text"
              placeholder="Marca del producto"
              class="w-full rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
            />
          </div>

          <!-- Category -->
          <div class="mb-4">
            <label class="mb-1 block text-sm text-surface-300">Categoría *</label>
            <div class="flex gap-2">
              <select
                v-model="form.category"
                class="flex-1 rounded-lg border bg-surface-900 px-3 py-2 text-sm text-white outline-none transition"
                :class="v$.category.$error ? 'border-red-500' : 'border-surface-600 focus:border-primary-500'"
                @blur="v$.category.$touch()"
              >
                <option :value="null" disabled>Seleccionar categoría…</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
              <button
                class="rounded-lg border border-surface-600 px-3 py-2 text-sm text-surface-400 transition hover:border-primary-500 hover:text-white"
                @click="showNewCategory = !showNewCategory"
                title="Crear categoría"
              >
                <Plus class="h-4 w-4" />
              </button>
            </div>
            <p v-if="v$.category.$error" class="mt-1 text-xs text-red-400">
              {{ v$.category.$errors[0]?.$message }}
            </p>

            <!-- Inline new category -->
            <div v-if="showNewCategory" class="mt-2 flex gap-2">
              <input
                v-model="newCategoryName"
                type="text"
                placeholder="Nombre de nueva categoría"
                class="flex-1 rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
                @keyup.enter="createCategoryInline"
              />
              <button
                class="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-500 disabled:opacity-50"
                :disabled="isCreatingCategory || !newCategoryName.trim()"
                @click="createCategoryInline"
              >
                <RefreshCw v-if="isCreatingCategory" class="h-3.5 w-3.5 animate-spin" />
                Crear
              </button>
            </div>
          </div>

          <!-- Description -->
          <div>
            <label class="mb-1 block text-sm text-surface-300">Descripción</label>
            <textarea
              v-model="form.description"
              rows="4"
              placeholder="Descripción del producto…"
              class="w-full rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- ════════════════════ PRICING TAB ════════════════════ -->
      <div v-show="activeTab === 'pricing'" class="space-y-5">
        <!-- Currency change alert -->
        <div
          v-if="showCurrencyChangeAlert"
          class="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300"
        >
          <span class="mt-0.5 text-base">⚠️</span>
          <div class="flex-1">
            <p class="font-medium">Moneda cambiada</p>
            <p v-if="currencyConversionApplied" class="mt-0.5 text-xs text-amber-400/80">
              El precio fue convertido automáticamente{{ dollarRate ? ` usando el tipo de cambio $​${formatPrice(dollarRate)}` : '' }}.
              Revisá el precio antes de guardar.
            </p>
            <p v-else class="mt-0.5 text-xs text-amber-400/80">
              No se pudo convertir el precio automáticamente (tipo de cambio no disponible aún).
              Ingresá el precio en la nueva moneda manualmente.
            </p>
          </div>
          <button class="text-amber-400 hover:text-amber-200" @click="showCurrencyChangeAlert = false">✕</button>
        </div>

        <div class="rounded-xl border border-surface-700 bg-surface-800/50 p-5">
          <h3 class="mb-4 text-sm font-semibold text-white">Precio y stock</h3>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <!-- Price -->
            <div>
              <label class="mb-1 block text-sm text-surface-300">Precio *</label>
              <div class="relative">
                <DollarSign class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input
                  v-model.number="form.price"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full rounded-lg border bg-surface-900 py-2 pl-10 pr-3 text-sm text-white outline-none transition"
                  :class="v$.price.$error ? 'border-red-500' : 'border-surface-600 focus:border-primary-500'"
                  @blur="v$.price.$touch()"
                />
              </div>
              <p v-if="v$.price.$error" class="mt-1 text-xs text-red-400">
                {{ v$.price.$errors[0]?.$message }}
              </p>
            </div>

            <!-- Currency -->
            <div>
              <label class="mb-1 block text-sm text-surface-300">Moneda</label>
              <select
                v-model="form.currency"
                class="w-full rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
              >
                <option v-for="opt in CURRENCY_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- Discount -->
            <div>
              <label class="mb-1 block text-sm text-surface-300">Descuento (%)</label>
              <input
                v-model.number="form.discount"
                type="number"
                step="1"
                min="0"
                max="100"
                class="w-full rounded-lg border bg-surface-900 px-3 py-2 text-sm text-white outline-none transition"
                :class="v$.discount.$error ? 'border-red-500' : 'border-surface-600 focus:border-primary-500'"
                @blur="v$.discount.$touch()"
              />
              <p v-if="v$.discount.$error" class="mt-1 text-xs text-red-400">
                {{ v$.discount.$errors[0]?.$message }}
              </p>
            </div>

            <!-- Stock -->
            <div>
              <label class="mb-1 block text-sm text-surface-300">Stock</label>
              <div class="relative">
                <Boxes class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input
                  v-model.number="form.stock"
                  type="number"
                  step="1"
                  min="0"
                  class="w-full rounded-lg border bg-surface-900 py-2 pl-10 pr-3 text-sm text-white outline-none transition"
                  :class="v$.stock.$error ? 'border-red-500' : 'border-surface-600 focus:border-primary-500'"
                  @blur="v$.stock.$touch()"
                />
              </div>
              <p v-if="v$.stock.$error" class="mt-1 text-xs text-red-400">
                {{ v$.stock.$errors[0]?.$message }}
              </p>
            </div>
          </div>

          <!-- Calculated final price -->
          <div class="mt-4 flex items-start gap-3 rounded-lg border border-surface-600 bg-surface-900/50 p-3">
            <Eye class="h-5 w-5 mt-0.5 text-primary-400" />
            <div>
              <span class="text-xs text-surface-400">Precio final</span>
              <span class="ml-2 text-lg font-bold text-emerald-400">
                {{ currencySymbol }}{{ formattedFinalPrice }}
              </span>
              <span v-if="form.discount > 0" class="ml-2 text-sm text-surface-500 line-through">
                {{ currencySymbol }}{{ formattedBasePrice }}
              </span>
              <!-- ARS equivalent when currency is USD -->
              <span v-if="arsEquivalent" class="ml-3 text-xs text-surface-400">
                ≈ $ {{ arsEquivalent }} ARS
                <span v-if="dollarRate" class="text-surface-500">(@ ${{ formatPrice(dollarRate) }})</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════ VARIANTS TAB ════════════════════ -->
      <div v-show="activeTab === 'variants'" class="space-y-5">
        <div class="rounded-xl border border-surface-700 bg-surface-800/50 p-5">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-white">Variantes del producto</h3>
            <label class="flex items-center gap-2 text-sm text-surface-300">
              <input
                v-model="form.has_variants"
                type="checkbox"
                class="rounded border-surface-500 bg-surface-700 text-primary-500 focus:ring-primary-500"
              />
              Tiene variantes
            </label>
          </div>

          <div v-if="form.has_variants">
            <p class="mb-4 text-xs text-surface-400">
              Agregá grupos de variantes (ej: Color, Tamaño). Cada grupo contiene opciones con su propio stock y ajuste de precio.
            </p>

            <!-- Variant groups -->
            <div
              v-for="(variant, vIdx) in form.variants"
              :key="vIdx"
              class="mb-4 rounded-lg border border-surface-600 bg-surface-900/50 p-4"
            >
              <div class="mb-3 flex items-center gap-3">
                <input
                  v-model="variant.variant_name"
                  type="text"
                  placeholder="Nombre del grupo (ej: Color, Tamaño)"
                  class="flex-1 rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
                />
                <button
                  class="rounded-lg p-1.5 text-surface-400 transition hover:text-red-400"
                  title="Eliminar grupo"
                  @click="removeVariantGroup(vIdx)"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>

              <!-- Options table -->
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-surface-600 text-xs text-surface-400">
                      <th class="px-2 py-1.5 text-left">Opción</th>
                      <th class="px-2 py-1.5 text-center">Precio ({{ form.currency }})</th>
                      <th class="px-2 py-1.5 text-center">Stock</th>
                      <th class="px-2 py-1.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(option, oIdx) in variant.options"
                      :key="oIdx"
                      class="border-b border-surface-700/50"
                    >
                      <!-- Name -->
                      <td class="px-2 py-1.5">
                        <input
                          v-model="option.name"
                          type="text"
                          placeholder="Ej: Rojo, 1L, XL…"
                          class="w-full rounded border border-surface-600 bg-surface-800 px-2 py-1 text-sm text-white outline-none focus:border-primary-500"
                        />
                      </td>
                      <!-- Absolute price — internally stored as price_adjustment -->
                      <td class="px-2 py-1.5">
                        <div class="flex items-center justify-center gap-1">
                          <input
                            :value="getVariantDisplayPrice(option)"
                            type="number"
                            :step="form.currency === 'USD' ? '0.01' : '1'"
                            min="0"
                            class="w-28 rounded border border-surface-600 bg-surface-800 px-2 py-1 text-center text-sm text-white outline-none focus:border-primary-500"
                            @change="setVariantDisplayPrice(option, ($event.target as HTMLInputElement).value)"
                          />
                          <span
                            v-if="option.price_adjustment !== 0"
                            class="whitespace-nowrap text-xs"
                            :class="(option.price_adjustment ?? 0) > 0 ? 'text-emerald-400' : 'text-red-400'"
                          >
                            {{ formatVariantAdjustment(option) }}
                          </span>
                        </div>
                      </td>
                      <!-- Stock -->
                      <td class="px-2 py-1.5 text-center">
                        <input
                          v-model.number="option.stock"
                          type="number"
                          min="0"
                          class="w-20 rounded border border-surface-600 bg-surface-800 px-2 py-1 text-center text-sm text-white outline-none focus:border-primary-500"
                        />
                      </td>
                      <!-- Delete -->
                      <td class="px-2 py-1.5 text-center">
                        <button
                          v-if="variant.options.length > 1"
                          class="text-surface-400 hover:text-red-400"
                          @click="removeVariantOption(vIdx, oIdx)"
                        >
                          <X class="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <!-- Helper note -->
              <p class="mt-2 text-xs text-surface-500">
                El precio de cada variante es el precio final que paga el cliente.
                El ajuste respecto al precio base ({{ currencySymbol }}{{ form.currency === 'USD' ? Number(form.price).toFixed(2) : formatPrice(form.price) }}) se calcula automáticamente.
              </p>

              <button
                class="mt-2 inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
                @click="addVariantOption(vIdx)"
              >
                <Plus class="h-3 w-3" />
                Agregar opción
              </button>
            </div>

            <button
              class="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-surface-500 px-4 py-2 text-sm text-surface-400 transition hover:border-primary-500 hover:text-white"
              @click="addVariantGroup"
            >
              <Plus class="h-4 w-4" />
              Agregar grupo de variantes
            </button>
          </div>

          <div v-else class="py-8 text-center text-sm text-surface-400">
            <Tag class="mx-auto mb-2 h-8 w-8 text-surface-500" />
            <p>Activá variantes para definir opciones como colores, tamaños, etc.</p>
          </div>
        </div>
      </div>

      <!-- ════════════════════ IMAGES TAB ════════════════════ -->
      <div v-show="activeTab === 'images'" class="space-y-5">
        <div class="rounded-xl border border-surface-700 bg-surface-800/50 p-5">
          <h3 class="mb-4 text-sm font-semibold text-white">Imágenes del producto</h3>
          <p class="mb-4 text-xs text-surface-400">
            Las imágenes se suben directamente a Cloudinary. Formatos aceptados: JPG, PNG, WebP.
          </p>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <!-- Image 1 -->
            <div>
              <label class="mb-2 block text-sm text-surface-300">Imagen principal</label>
              <div class="relative aspect-square overflow-hidden rounded-lg border-2 border-dashed border-surface-600 bg-surface-900 transition hover:border-primary-500">
                <img
                  v-if="form.image"
                  :src="form.image"
                  class="h-full w-full object-cover"
                  alt="Imagen principal"
                />
                <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 text-surface-400">
                  <ImageIcon class="h-10 w-10" />
                  <span class="text-xs">Click para subir</span>
                </div>

                <!-- Loading overlay -->
                <div
                  v-if="isUploadingImage"
                  class="absolute inset-0 flex items-center justify-center bg-black/60"
                >
                  <RefreshCw class="h-6 w-6 animate-spin text-white" />
                </div>

                <!-- Click zone -->
                <input
                  ref="imageFileInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="absolute inset-0 cursor-pointer opacity-0"
                  @change="handleImageUpload('image', $event)"
                />

                <!-- Remove button -->
                <button
                  v-if="form.image && !isUploadingImage"
                  class="absolute right-2 top-2 rounded-lg bg-red-500/80 p-1 text-white transition hover:bg-red-500"
                  @click.stop="removeImage('image')"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>

            <!-- Image 2 -->
            <div>
              <label class="mb-2 block text-sm text-surface-300">Imagen secundaria</label>
              <div class="relative aspect-square overflow-hidden rounded-lg border-2 border-dashed border-surface-600 bg-surface-900 transition hover:border-primary-500">
                <img
                  v-if="form.image_2"
                  :src="form.image_2"
                  class="h-full w-full object-cover"
                  alt="Imagen secundaria"
                />
                <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 text-surface-400">
                  <ImageIcon class="h-10 w-10" />
                  <span class="text-xs">Click para subir</span>
                </div>

                <div
                  v-if="isUploadingImage2"
                  class="absolute inset-0 flex items-center justify-center bg-black/60"
                >
                  <RefreshCw class="h-6 w-6 animate-spin text-white" />
                </div>

                <input
                  ref="image2FileInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="absolute inset-0 cursor-pointer opacity-0"
                  @change="handleImageUpload('image_2', $event)"
                />

                <button
                  v-if="form.image_2 && !isUploadingImage2"
                  class="absolute right-2 top-2 rounded-lg bg-red-500/80 p-1 text-white transition hover:bg-red-500"
                  @click.stop="removeImage('image_2')"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════ ADVANCED TAB ════════════════════ -->
      <div v-show="activeTab === 'advanced'" class="space-y-5">
        <div class="rounded-xl border border-surface-700 bg-surface-800/50 p-5">
          <h3 class="mb-4 text-sm font-semibold text-white">Configuración avanzada</h3>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <!-- Volume -->
            <div>
              <label class="mb-1 block text-sm text-surface-300">Volumen</label>
              <input
                v-model="form.volume"
                type="text"
                placeholder="Ej: 500ml, 1L"
                class="w-full rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
              />
            </div>

            <!-- Dimensions -->
            <div>
              <label class="mb-1 block text-sm text-surface-300">Dimensiones</label>
              <input
                v-model="form.dimensions"
                type="text"
                placeholder="Ej: 20x15x10 cm"
                class="w-full rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <!-- Availability -->
          <div class="mt-4">
            <label class="flex items-center gap-2 text-sm text-surface-300">
              <input
                v-model="form.is_available"
                type="checkbox"
                class="rounded border-surface-500 bg-surface-700 text-primary-500 focus:ring-primary-500"
              />
              Producto visible en la tienda
            </label>
          </div>

          <!-- Special promotion -->
          <div class="mt-4 rounded-lg border border-surface-600 bg-surface-900/50 p-4">
            <label class="flex items-center gap-2 text-sm text-surface-300">
              <input
                v-model="form.has_special_promotion"
                type="checkbox"
                class="rounded border-surface-500 bg-surface-700 text-primary-500 focus:ring-primary-500"
              />
              Promoción especial
            </label>
            <div v-if="form.has_special_promotion" class="mt-3">
              <label class="mb-1 block text-xs text-surface-400">Nombre de la promoción</label>
              <input
                v-model="form.special_promotion_name"
                type="text"
                placeholder="Ej: 3x2, Hot Sale"
                class="w-full rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════ BOTTOM SAVE BAR ════════════════════ -->
      <div class="mt-6 flex items-center justify-between rounded-xl border border-surface-700 bg-surface-800/50 p-4">
        <div class="text-sm text-surface-400">
          <span v-if="v$.$errors.length > 0" class="text-red-400">
            {{ v$.$errors.length }} error{{ v$.$errors.length > 1 ? 'es' : '' }} en el formulario
          </span>
          <span v-else>Todos los campos son válidos</span>
        </div>
        <div class="flex gap-2">
          <button
            class="rounded-lg border border-surface-600 px-4 py-2 text-sm text-surface-300 transition hover:text-white"
            @click="goBack"
          >
            Cancelar
          </button>
          <button
            class="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:opacity-50"
            :disabled="isSaving"
            @click="handleSubmit"
          >
            <RefreshCw v-if="isSaving" class="h-4 w-4 animate-spin" />
            <Save v-else class="h-4 w-4" />
            {{ isEdit ? 'Actualizar producto' : 'Crear producto' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
