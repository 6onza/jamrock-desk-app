<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import {
  Save, RefreshCw, AlertTriangle, Shield,
  DollarSign,
  ToggleLeft, ToggleRight,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import {
  getSiteConfig, updateSiteConfig,
  getMaintenanceStatus, toggleMaintenance,
} from '@/services/siteConfig'
import {
  getCurrentDollarRate, createDollarRate, updateDollarRate,
  updateDollarRateFromAPI,
  getDistributionCenters,
} from '@/services/payments'
import type { DollarRate, DistributionCenter, DollarRateType } from '@/types/orders'
import type { MaintenanceStatus } from '@/types/system'

// ─── Loading states ───
const loading = ref(true)
const saving = ref(false)
const dollarLoading = ref(false)
const msg = ref<{ type: 'success' | 'error'; text: string } | null>(null)

// ─── Maintenance ───
const maintenance = ref<MaintenanceStatus>({ maintenance_mode: false, message: '', has_bypass_password: false })
const maintenanceConfirmOpen = ref(false)
const bypassPwd = ref('')
const bypassConfirm = ref('')

// ─── Site config ───
const siteForm = reactive({
  min_purchase_amount: 0,
})

// ─── Dollar rate ───
const dollarRate = ref<DollarRate | null>(null)
const dollarForm = reactive({
  rateType: 'blue' as DollarRateType,
  autoUpdate: true,
  value: 0,
})

// ─── Distribution centers ───
const centers = ref<(DistributionCenter & { _deleted?: boolean; _new?: boolean })[]>([])

// ─── Email ───

// ═══════════════════════════════════════
//  LOAD
// ═══════════════════════════════════════

async function loadAll() {
  loading.value = true
  try {
    const [maint, config, rate, centersData] = await Promise.all([
      getMaintenanceStatus().catch(() => null),
      getSiteConfig().catch(() => null),
      getCurrentDollarRate().catch(() => null),
      getDistributionCenters().catch(() => []),
    ])

    if (maint) maintenance.value = maint
    if (config) {
      siteForm.min_purchase_amount = Number(config.min_purchase_amount) || 0
    }
    if (rate) {
      dollarRate.value = rate
      dollarForm.rateType = rate.rate_type
      dollarForm.autoUpdate = rate.auto_update
      dollarForm.value = rate.value
    }
    centers.value = centersData.map(c => ({ ...c }))
  } finally { loading.value = false }
}

// ═══════════════════════════════════════
//  MAINTENANCE
// ═══════════════════════════════════════

function confirmMaintenanceToggle() {
  maintenanceConfirmOpen.value = true
}

async function doToggleMaintenance() {
  try {
    const result = await toggleMaintenance({
      maintenance_mode: !maintenance.value.maintenance_mode,
    })
    maintenance.value = result
    showMsg('success', `Modo mantenimiento ${result.maintenance_mode ? 'activado' : 'desactivado'}`)
  } catch {
    showMsg('error', 'Error al cambiar modo mantenimiento')
  } finally {
    maintenanceConfirmOpen.value = false
  }
}

async function saveBypassPassword() {
  if (bypassPwd.value !== bypassConfirm.value) {
    showMsg('error', 'Las contraseñas no coinciden')
    return
  }
  try {
    const result = await toggleMaintenance({
      maintenance_mode: maintenance.value.maintenance_mode,
      bypass_password: bypassPwd.value || null,
    })
    maintenance.value = result
    bypassPwd.value = ''; bypassConfirm.value = ''
    showMsg('success', bypassPwd.value ? 'Contraseña actualizada' : 'Contraseña removida')
  } catch {
    showMsg('error', 'Error al guardar contraseña')
  }
}

// ═══════════════════════════════════════
//  DOLLAR RATE
// ═══════════════════════════════════════

async function refreshDollarFromAPI() {
  if (dollarForm.rateType === 'manual') return
  dollarLoading.value = true
  try {
    const res = await updateDollarRateFromAPI(dollarForm.rateType)
    if (res.rate) {
      dollarRate.value = res.rate
      dollarForm.value = res.rate.value
      showMsg('success', 'Tasa actualizada desde API')
    }
  } catch {
    showMsg('error', 'Error al actualizar tasa')
  } finally { dollarLoading.value = false }
}

async function saveDollarRate() {
  dollarLoading.value = true
  try {
    const payload: Partial<DollarRate> = {
      value: dollarForm.value,
      rate_type: dollarForm.rateType,
      auto_update: dollarForm.rateType !== 'manual' ? dollarForm.autoUpdate : false,
      is_active: true,
    }
    if (dollarRate.value?.id) {
      dollarRate.value = await updateDollarRate(dollarRate.value.id, payload)
    } else {
      dollarRate.value = await createDollarRate(payload)
    }
    showMsg('success', 'Tasa del dólar guardada')
  } catch {
    showMsg('error', 'Error al guardar tasa')
  } finally { dollarLoading.value = false }
}

// ═══════════════════════════════════════
//  SITE CONFIG
// ═══════════════════════════════════════

async function saveSiteConfig() {
  saving.value = true
  try {
    await updateSiteConfig({
      min_purchase_amount: siteForm.min_purchase_amount,
    })
    showMsg('success', 'Configuración guardada')
  } catch {
    showMsg('error', 'Error al guardar configuración')
  } finally { saving.value = false }
}

// ═══════════════════════════════════════
//  DISTRIBUTION CENTERS
// ═══════════════════════════════════════

// (UI for centers and email not yet implemented)

// ─── Helpers ───
function showMsg(type: 'success' | 'error', text: string) {
  msg.value = { type, text }
  setTimeout(() => { msg.value = null }, 4000)
}

function fmtTimeSince(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 60) return `hace ${diff} min`
  if (diff < 1440) return `hace ${Math.floor(diff / 60)} hs`
  return `hace ${Math.floor(diff / 1440)} días`
}

onMounted(() => loadAll())
</script>

<template>
  <div>
    <PageHeader title="Configuración tienda" subtitle="Ajustes generales de la tienda" />

    <!-- Global message -->
    <Transition name="dialog">
      <div v-if="msg"
        class="mb-4 rounded-lg border px-4 py-2.5 text-sm"
        :class="msg.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-red-500/30 bg-red-500/10 text-red-400'"
      >{{ msg.text }}</div>
    </Transition>

    <div v-if="loading" class="flex justify-center py-20"><LoadingSpinner text="Cargando configuración…" /></div>
    <div v-else class="space-y-6">

      <!-- ═══ SECTION: Maintenance ═══ -->
      <section class="rounded-xl border border-surface-700/50 bg-surface-800 p-5">
        <h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-200">
          <Shield :size="16" class="text-amber-400" /> Modo mantenimiento
        </h2>
        <div class="flex flex-wrap items-center gap-4">
          <button
            class="flex items-center gap-2 text-sm"
            @click="confirmMaintenanceToggle"
          >
            <component :is="maintenance.maintenance_mode ? ToggleRight : ToggleLeft" :size="28" :class="maintenance.maintenance_mode ? 'text-amber-400' : 'text-gray-500'" />
            <span :class="maintenance.maintenance_mode ? 'font-medium text-amber-400' : 'text-gray-400'">
              {{ maintenance.maintenance_mode ? 'Modo mantenimiento ACTIVADO' : 'Modo mantenimiento desactivado' }}
            </span>
          </button>
          <span
            class="rounded-full px-2.5 py-0.5 text-2xs font-medium"
            :class="maintenance.has_bypass_password ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'"
          >
            Contraseña bypass: {{ maintenance.has_bypass_password ? 'Configurada' : 'No configurada' }}
          </span>
        </div>
        <!-- Bypass password form -->
        <div class="mt-4 grid gap-3 sm:grid-cols-3">
          <input v-model="bypassPwd" type="password" placeholder="Nueva contraseña bypass"
            class="rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
          <input v-model="bypassConfirm" type="password" placeholder="Confirmar contraseña"
            class="rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
          <button class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-surface-700 px-4 py-2 text-sm text-gray-300 hover:bg-surface-600" @click="saveBypassPassword">
            <Save :size="14" /> Guardar contraseña
          </button>
        </div>
      </section>

      <!-- ═══ SECTION: Dollar Rate ═══ -->
      <section class="rounded-xl border border-surface-700/50 bg-surface-800 p-5">
        <h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-200">
          <DollarSign :size="16" class="text-green-400" /> Cotización del dólar
        </h2>
        <div class="mb-4 flex items-center gap-4 rounded-lg border border-surface-700/50 bg-surface-900/50 p-4">
          <div class="text-center">
            <p class="text-2xs text-gray-500">Valor actual</p>
            <p class="text-2xl font-bold text-green-400">${{ Math.round(dollarForm.value).toLocaleString('es-AR') }}</p>
          </div>
          <div v-if="dollarRate" class="flex-1 space-y-1 text-2xs text-gray-500">
            <p>Tipo: <span class="text-gray-300">{{ dollarRate.rate_type_display }}</span></p>
            <p>Última actualización: <span class="text-gray-300">{{ fmtTimeSince(dollarRate.updated_at) }}</span></p>
            <p v-if="dollarRate.updated_by_name">Por: <span class="text-gray-300">{{ dollarRate.updated_by_name }}</span></p>
          </div>
        </div>
        <div class="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-2xs text-amber-400">
          <AlertTriangle :size="12" class="mr-1 inline" />
          La tasa de dólar afecta los precios de todos los productos en USD.
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Método</label>
            <div class="flex gap-2">
              <label v-for="opt in ([['blue', 'Blue'], ['official', 'Oficial'], ['manual', 'Manual']] as [DollarRateType, string][])" :key="opt[0]"
                class="flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-colors"
                :class="dollarForm.rateType === opt[0] ? 'border-primary-500/50 bg-primary-500/10 text-primary-400' : 'border-surface-700/50 text-gray-400 hover:bg-surface-700'"
              >
                <input type="radio" :value="opt[0]" v-model="dollarForm.rateType" class="sr-only" />
                {{ opt[1] }}
              </label>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Valor ($)</label>
            <input v-model.number="dollarForm.value" type="number" step="0.01" min="0" :disabled="dollarForm.rateType !== 'manual'"
              class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 disabled:opacity-50 focus:border-primary-500/50 focus:outline-none" />
          </div>
          <div class="flex items-end gap-2">
            <button
              v-if="dollarForm.rateType !== 'manual'"
              class="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-400 hover:bg-blue-500/20"
              :disabled="dollarLoading"
              @click="refreshDollarFromAPI"
            >
              <RefreshCw :size="14" :class="dollarLoading ? 'animate-spin' : ''" />
              Actualizar API
            </button>
            <button
              class="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
              :disabled="dollarLoading"
              @click="saveDollarRate"
            >
              <Save :size="14" /> Guardar
            </button>
          </div>
        </div>
      </section>

      <!-- ═══ SECTION: General config ═══ -->
      <section class="rounded-xl border border-surface-700/50 bg-surface-800 p-5">
        <h2 class="mb-4 text-sm font-semibold text-gray-200">Configuración general</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Monto mínimo de compra ($)</label>
            <input v-model.number="siteForm.min_purchase_amount" type="number" step="0.01" min="0"
              class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
            <p class="mt-1 text-2xs text-gray-600">0 para deshabilitar</p>
          </div>
          <div class="flex items-end">
            <button
              class="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
              :disabled="saving"
              @click="saveSiteConfig"
            >
              <Save :size="14" /> {{ saving ? 'Guardando…' : 'Guardar configuración' }}
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- Maintenance toggle confirmation -->
    <ConfirmDialog
      v-model:open="maintenanceConfirmOpen"
      :title="maintenance.maintenance_mode ? 'Desactivar mantenimiento' : 'Activar mantenimiento'"
      :message="maintenance.maintenance_mode
        ? 'El sitio volverá a estar disponible para todos los usuarios.'
        : 'Los usuarios no administradores no podrán acceder al sitio. ¿Continuar?'"
      :variant="maintenance.maintenance_mode ? 'info' : 'warning'"
      confirm-label="Confirmar"
      @confirm="doToggleMaintenance"
    />
  </div>
</template>
