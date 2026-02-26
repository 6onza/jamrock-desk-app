<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { invoke } from '@tauri-apps/api/core'
import {
  getBaseUrl,
  updateApiBaseUrl,
  checkApiConnection,
} from '@/services/apiClient'
import {
  checkForUpdates,
  downloadAndInstall,
  type UpdateCheckResult,
  type UpdateProgress,
} from '@/services/updater'
import {
  ArrowLeft, Wifi, WifiOff, Save, RotateCw, Download, CheckCircle,
  AlertTriangle, RefreshCw,
} from 'lucide-vue-next'
import type { ConnectionTestResult } from '@/types/api'

const router = useRouter()
const toast = useToast()

// ─── Form state ───
const apiUrl = ref('')
const testing = ref(false)
const saving = ref(false)
const connectionResult = ref<ConnectionTestResult | null>(null)
const appVersion = ref('')

// ─── Update state ───
const updateResult = ref<UpdateCheckResult | null>(null)
const updateChecking = ref(false)
const updateProgress = ref<UpdateProgress | null>(null)
const updateError = ref('')

onMounted(async () => {
  // Load current API URL
  const current = getBaseUrl()
  if (current) {
    apiUrl.value = current
  } else {
    try {
      apiUrl.value = await invoke<string>('get_api_url')
    } catch {
      apiUrl.value = 'https://jamrock-api.up.railway.app/api'
    }
  }

  // Load app version
  try {
    const info = await invoke<{ version: string }>('get_app_version')
    appVersion.value = info.version
  } catch {
    appVersion.value = '0.1.0'
  }
})

// ─── Test connectivity to the entered URL ───
async function testConnection() {
  testing.value = true
  connectionResult.value = null

  try {
    const cleanUrl = apiUrl.value.replace(/\/+$/, '')
    connectionResult.value = await checkApiConnection(cleanUrl)
  } catch {
    connectionResult.value = {
      connected: false,
      latency: null,
      message: 'Error inesperado al testear la conexión',
    }
  } finally {
    testing.value = false
  }
}

// ─── Persist the new URL ───
async function saveSettings() {
  saving.value = true
  try {
    await updateApiBaseUrl(apiUrl.value)
    toast.success('URL del API guardada correctamente')
  } catch {
    toast.error('Error al guardar la configuración')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.back()
}

// ─── Check for updates ───
async function handleCheckUpdates() {
  updateChecking.value = true
  updateResult.value = null
  updateError.value = ''
  updateProgress.value = null

  try {
    const result = await checkForUpdates()
    updateResult.value = result

    if (result.error) {
      updateError.value = result.error
      toast.warning('No se pudo verificar actualizaciones')
    } else if (result.available) {
      toast.info(`Nueva versión disponible: v${result.version}`)
    } else {
      toast.success('Tu app está actualizada')
    }
  } catch (err) {
    updateError.value = err instanceof Error ? err.message : 'Error desconocido'
    toast.error('Error al buscar actualizaciones')
  } finally {
    updateChecking.value = false
  }
}

// ─── Download and install update ───
async function handleInstallUpdate() {
  if (!updateResult.value?.downloadUrl) return

  updateError.value = ''
  try {
    await downloadAndInstall(updateResult.value.downloadUrl, (progress) => {
      updateProgress.value = progress
    })
  } catch (err) {
    updateError.value = err instanceof Error ? err.message : 'Error durante la actualización'
    updateProgress.value = null
    toast.error('La actualización falló. Intentá nuevamente.')
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-950 p-4">
    <div class="w-full max-w-md">
      <!-- Header -->
      <div class="mb-6 flex items-center gap-3">
        <button
          class="rounded-lg p-2 text-gray-400 transition hover:bg-gray-800 hover:text-gray-200"
          title="Volver"
          @click="goBack"
        >
          <ArrowLeft :size="20" />
        </button>
        <h1 class="text-xl font-bold text-gray-100">Configuración</h1>
      </div>

      <!-- Settings Card -->
      <div class="card space-y-6">
        <!-- API URL -->
        <div>
          <label for="apiUrl" class="mb-1.5 block text-sm font-medium text-gray-400">
            URL del API
          </label>
          <input
            id="apiUrl"
            v-model="apiUrl"
            type="url"
            class="input-field"
            placeholder="https://jamrock-api.up.railway.app/api"
          />
          <p class="mt-1 text-xs text-gray-600">
            URL base de la API de Jamrock (sin barra final)
          </p>
        </div>

        <!-- Action buttons -->
        <div class="flex gap-3">
          <button
            class="btn-secondary flex items-center gap-2"
            :disabled="testing || !apiUrl"
            @click="testConnection"
          >
            <RotateCw v-if="testing" :size="16" class="animate-spin" />
            <Wifi v-else :size="16" />
            {{ testing ? 'Testeando…' : 'Probar conexión' }}
          </button>

          <button
            class="btn-primary flex items-center gap-2"
            :disabled="saving || !apiUrl"
            @click="saveSettings"
          >
            <Save :size="16" />
            {{ saving ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>

        <!-- Connection result -->
        <div
          v-if="connectionResult"
          class="rounded-lg border px-4 py-3 text-sm"
          :class="
            connectionResult.connected
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          "
        >
          <div class="flex items-center gap-2">
            <Wifi v-if="connectionResult.connected" :size="16" />
            <WifiOff v-else :size="16" />
            <span>{{ connectionResult.message }}</span>
          </div>
        </div>
      </div>

      <!-- App info -->
      <div class="mt-6 space-y-1 text-center text-xs text-gray-600">
        <p>Jamrock Admin v{{ appVersion }}</p>
        <p>Tauri Desktop App</p>
      </div>

      <!-- Updates section -->
      <div class="card mt-6 space-y-4">
        <h3 class="text-sm font-semibold text-gray-200">Actualizaciones</h3>

        <!-- Check button -->
        <button
          class="btn-secondary flex w-full items-center justify-center gap-2"
          :disabled="updateChecking || !!updateProgress"
          @click="handleCheckUpdates"
        >
          <RefreshCw v-if="updateChecking" :size="16" class="animate-spin" />
          <Download v-else :size="16" />
          {{ updateChecking ? 'Verificando…' : 'Buscar actualizaciones' }}
        </button>

        <!-- Result: up to date -->
        <div
          v-if="updateResult && !updateResult.available && !updateResult.error"
          class="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400"
        >
          <CheckCircle :size="16" />
          <span>Estás en la última versión (v{{ updateResult.currentVersion }})</span>
        </div>

        <!-- Result: update available -->
        <div
          v-if="updateResult?.available && !updateProgress"
          class="space-y-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-blue-300">
                Nueva versión disponible: v{{ updateResult.version }}
              </p>
              <p v-if="updateResult.fileSizeDisplay" class="text-xs text-gray-500">
                Tamaño: {{ updateResult.fileSizeDisplay }}
              </p>
            </div>
            <span
              v-if="updateResult.isMandatory"
              class="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-400"
            >
              Obligatoria
            </span>
          </div>

          <p
            v-if="updateResult.releaseNotes"
            class="whitespace-pre-line text-xs text-gray-400"
          >
            {{ updateResult.releaseNotes }}
          </p>

          <button
            class="btn-primary flex w-full items-center justify-center gap-2"
            @click="handleInstallUpdate"
          >
            <Download :size="16" />
            Descargar e instalar
          </button>
        </div>

        <!-- Progress bar -->
        <div v-if="updateProgress" class="space-y-2">
          <div class="flex items-center justify-between text-xs text-gray-400">
            <span>{{ updateProgress.message }}</span>
            <span>{{ updateProgress.percent }}%</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-surface-700">
            <div
              class="h-full rounded-full bg-primary-500 transition-all duration-300"
              :style="{ width: `${updateProgress.percent}%` }"
            />
          </div>
        </div>

        <!-- Error -->
        <div
          v-if="updateError"
          class="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          <AlertTriangle :size="16" />
          <span>{{ updateError }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
