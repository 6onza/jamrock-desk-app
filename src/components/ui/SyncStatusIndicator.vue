<script setup lang="ts">
/**
 * SyncStatusIndicator — small badge that shows in the topbar/sidebar.
 * Shows: connection status, pending count, and allows manual sync.
 */
import { onMounted } from 'vue'
import {
  Wifi, WifiOff, AlertTriangle, Loader2, Cloud,
} from 'lucide-vue-next'
import { useOfflineStore } from '@/stores/offline'

const offline = useOfflineStore()

onMounted(() => {
  offline.init()
})
</script>

<template>
  <div class="relative">
    <button
      class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
      :class="{
        'bg-green-500/10 text-green-400 hover:bg-green-500/20': offline.statusColor === 'green',
        'bg-red-500/10 text-red-400 hover:bg-red-500/20': offline.statusColor === 'red',
        'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20': offline.statusColor === 'yellow',
        'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20': offline.statusColor === 'orange',
        'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20': offline.statusColor === 'blue',
      }"
      :title="offline.statusLabel"
      @click="offline.triggerSync()"
    >
      <!-- Icon based on state -->
      <template v-if="offline.state.isSyncing">
        <Loader2 :size="14" class="animate-spin" />
      </template>
      <template v-else-if="offline.isOffline">
        <WifiOff :size="14" />
      </template>
      <template v-else-if="offline.hasProblems">
        <AlertTriangle :size="14" />
      </template>
      <template v-else-if="offline.hasPending">
        <Cloud :size="14" />
      </template>
      <template v-else>
        <Wifi :size="14" />
      </template>

      <!-- Label -->
      <span class="hidden sm:inline">{{ offline.statusLabel }}</span>

      <!-- Pending count badge -->
      <span
        v-if="offline.state.pendingCount > 0 && !offline.state.isSyncing"
        class="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white"
      >
        {{ offline.state.pendingCount }}
      </span>
    </button>

    <!-- Tooltip details (shown on hover via group) -->
    <div class="pointer-events-none absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-surface-700/50 bg-surface-800 p-3 opacity-0 shadow-xl transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
      <div class="space-y-2 text-xs">
        <div class="flex items-center justify-between">
          <span class="text-gray-500">Estado</span>
          <span :class="{
            'text-green-400': offline.isOnline && !offline.hasPending,
            'text-red-400': offline.isOffline,
            'text-yellow-400': offline.hasProblems,
            'text-orange-400': offline.hasPending,
          }">
            {{ offline.statusLabel }}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-gray-500">Pendientes</span>
          <span class="text-gray-300">{{ offline.state.pendingCount }}</span>
        </div>
        <div v-if="offline.state.failedCount > 0" class="flex items-center justify-between">
          <span class="text-gray-500">Con error</span>
          <span class="text-red-400">{{ offline.state.failedCount }}</span>
        </div>
        <div v-if="offline.state.conflictCount > 0" class="flex items-center justify-between">
          <span class="text-gray-500">Conflictos</span>
          <span class="text-yellow-400">{{ offline.state.conflictCount }}</span>
        </div>
        <div v-if="offline.state.lastSyncTimestamp" class="flex items-center justify-between">
          <span class="text-gray-500">Último sync</span>
          <span class="text-gray-300">{{ new Date(offline.state.lastSyncTimestamp).toLocaleTimeString('es-AR') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
