<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Wifi, WifiOff, Loader2, Cloud, AlertTriangle } from 'lucide-vue-next'
import { useOfflineStore } from '@/stores/offline'

const offline = useOfflineStore()
const router = useRouter()

onMounted(() => {
  offline.init()
})
</script>

<template>
  <button
    class="flex items-center gap-1.5 rounded-md px-2 py-1 text-2xs font-medium transition-colors"
    :class="{
      'text-green-400 hover:bg-green-500/10': offline.statusColor === 'green',
      'text-red-400 hover:bg-red-500/10': offline.statusColor === 'red',
      'text-yellow-400 hover:bg-yellow-500/10': offline.statusColor === 'yellow',
      'text-orange-400 hover:bg-orange-500/10': offline.statusColor === 'orange',
      'text-blue-400 hover:bg-blue-500/10': offline.statusColor === 'blue',
    }"
    :title="offline.statusLabel"
    @click="router.push('/sync-status')"
  >
    <!-- Icon based on state -->
    <Loader2 v-if="offline.state.isSyncing" :size="12" class="animate-spin" />
    <WifiOff v-else-if="offline.isOffline" :size="12" />
    <AlertTriangle v-else-if="offline.hasProblems" :size="12" />
    <Cloud v-else-if="offline.hasPending" :size="12" />
    <Wifi v-else :size="12" />

    <span>{{ offline.statusLabel }}</span>

    <!-- Pending count badge -->
    <span
      v-if="offline.state.pendingCount > 0 && !offline.state.isSyncing"
      class="flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white"
    >
      {{ offline.state.pendingCount }}
    </span>
  </button>
</template>
