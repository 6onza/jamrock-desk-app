<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { checkApiConnection } from '@/services/apiClient'
import { Wifi, WifiOff, Loader2 } from 'lucide-vue-next'

const connected = ref<boolean | null>(null) // null = checking
const latency = ref<number | null>(null)
let intervalId: ReturnType<typeof setInterval> | null = null

async function ping() {
  try {
    const result = await checkApiConnection()
    connected.value = result.connected
    latency.value = result.latency
  } catch {
    connected.value = false
    latency.value = null
  }
}

onMounted(() => {
  ping()
  intervalId = setInterval(ping, 30_000) // Ping every 30 seconds
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

<template>
  <div
    class="flex items-center gap-1.5 rounded-md px-2 py-1 text-2xs font-medium transition-colors"
    :class="
      connected === null
        ? 'text-gray-500'
        : connected
          ? 'text-green-400'
          : 'text-red-400'
    "
    :title="
      connected === null
        ? 'Verificando conexión…'
        : connected
          ? `API conectada (${latency}ms)`
          : 'API desconectada'
    "
  >
    <Loader2 v-if="connected === null" :size="12" class="animate-spin" />
    <Wifi v-else-if="connected" :size="12" />
    <WifiOff v-else :size="12" />

    <span v-if="connected && latency !== null">Conectado</span>
    <span v-else-if="connected === false">Sin conexión</span>
  </div>
</template>
