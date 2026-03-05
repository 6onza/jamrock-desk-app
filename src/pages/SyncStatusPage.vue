<script setup lang="ts">
/**
 * SyncStatusPage — detailed view of the offline queue and sync status.
 * Shows all queued operations, allows manual sync, and displays conflicts.
 */
import { onMounted } from 'vue'
import {
  RefreshCw, Wifi, WifiOff, Check, X, AlertTriangle,
  Clock, Cloud, Loader2, Trash2, Info, Zap,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useOfflineStore } from '@/stores/offline'
import { clearQueue, clearRequestQueue } from '@/services/offlineDb'
import type { OfflineOperation, OfflineHttpRequest } from '@/types/offline'

const offline = useOfflineStore()

onMounted(() => {
  offline.init()
  offline.loadRecentOperations()
})

function statusIcon(op: OfflineOperation) {
  switch (op.status) {
    case 'pending': return Clock
    case 'syncing': return Loader2
    case 'synced': return Check
    case 'failed': return X
    case 'conflict': return AlertTriangle
    default: return Info
  }
}

function statusColor(op: OfflineOperation) {
  switch (op.status) {
    case 'pending': return 'text-orange-400'
    case 'syncing': return 'text-blue-400'
    case 'synced': return 'text-green-400'
    case 'failed': return 'text-red-400'
    case 'conflict': return 'text-yellow-400'
    default: return 'text-gray-400'
  }
}

function statusLabel(op: OfflineOperation) {
  switch (op.status) {
    case 'pending': return 'Pendiente'
    case 'syncing': return 'Sincronizando'
    case 'synced': return 'Sincronizado'
    case 'failed': return `Error (intento ${op.retryCount})`
    case 'conflict': return 'Conflicto'
    default: return op.status
  }
}

function operationLabel(type: string) {
  switch (type) {
    case 'create_order': return 'Nueva venta'
    case 'update_order': return 'Actualizar orden'
    case 'update_stock': return 'Actualizar stock'
    case 'create_payment': return 'Registrar pago'
    default: return type
  }
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

async function handleClearQueue() {
  if (confirm('¿Borrar toda la cola de operaciones? Solo se borran las ya sincronizadas y fallidas.')) {
    await clearQueue()
    await offline.loadRecentOperations()
  }
}

// ─── HTTP Request queue helpers ───

function reqStatusIcon(req: OfflineHttpRequest) {
  switch (req.status) {
    case 'pending': return Clock
    case 'replaying': return Loader2
    case 'replayed': return Check
    case 'failed': return X
    default: return Info
  }
}

function reqStatusColor(req: OfflineHttpRequest) {
  switch (req.status) {
    case 'pending': return 'text-orange-400'
    case 'replaying': return 'text-blue-400'
    case 'replayed': return 'text-green-400'
    case 'failed': return 'text-red-400'
    default: return 'text-gray-400'
  }
}

function reqStatusLabel(req: OfflineHttpRequest) {
  switch (req.status) {
    case 'pending': return 'Pendiente'
    case 'replaying': return 'Reenviando'
    case 'replayed': return 'Aplicado'
    case 'failed': return `Error (intento ${req.retryCount})`
    default: return req.status
  }
}

async function handleClearRequests() {
  if (confirm('¿Borrar la cola de solicitudes HTTP? Las pendientes NO se sincronizarán.')) {
    await clearRequestQueue()
    await offline.loadRecentOperations()
  }
}
</script>

<template>
  <div>
    <PageHeader title="Estado de sincronización" subtitle="Cola offline y estado de la conexión">
      <template #actions>
        <button
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-2 text-xs font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          :disabled="offline.state.isSyncing || offline.isOffline"
          @click="offline.triggerSync()"
        >
          <RefreshCw :size="14" :class="{ 'animate-spin': offline.state.isSyncing }" />
          {{ offline.state.isSyncing ? 'Sincronizando…' : 'Sincronizar ahora' }}
        </button>
      </template>
    </PageHeader>

    <!-- Status cards -->
    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Connection -->
      <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg"
            :class="offline.isOnline ? 'bg-green-500/10' : 'bg-red-500/10'"
          >
            <Wifi v-if="offline.isOnline" :size="20" class="text-green-400" />
            <WifiOff v-else :size="20" class="text-red-400" />
          </div>
          <div>
            <p class="text-xs text-gray-500">Conexión</p>
            <p class="text-sm font-semibold" :class="offline.isOnline ? 'text-green-400' : 'text-red-400'">
              {{ offline.isOnline ? 'Conectado' : 'Sin conexión' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Pending -->
      <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
            <Cloud :size="20" class="text-orange-400" />
          </div>
          <div>
            <p class="text-xs text-gray-500">Pendientes</p>
            <p class="text-sm font-semibold text-orange-400">{{ offline.state.pendingCount }}</p>
          </div>
        </div>
      </div>

      <!-- Errors -->
      <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg"
            :class="offline.state.failedCount > 0 ? 'bg-red-500/10' : 'bg-surface-700'"
          >
            <X :size="20" :class="offline.state.failedCount > 0 ? 'text-red-400' : 'text-gray-600'" />
          </div>
          <div>
            <p class="text-xs text-gray-500">Con error</p>
            <p class="text-sm font-semibold" :class="offline.state.failedCount > 0 ? 'text-red-400' : 'text-gray-400'">
              {{ offline.state.failedCount }}
            </p>
          </div>
        </div>
      </div>

      <!-- Last sync -->
      <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
            <Clock :size="20" class="text-blue-400" />
          </div>
          <div>
            <p class="text-xs text-gray-500">Último sync</p>
            <p class="text-sm font-semibold text-blue-400">
              {{ offline.state.lastSyncTimestamp ? fmtTime(offline.state.lastSyncTimestamp) : 'Nunca' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Operations queue -->
    <div class="mt-6 rounded-xl border border-surface-700/50 bg-surface-800 p-5">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-200">
          <Zap :size="16" class="text-primary-400" /> Cola de operaciones
        </h3>
        <button
          v-if="offline.recentOperations.length > 0"
          class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-2xs text-gray-500 hover:bg-surface-700 hover:text-gray-300"
          @click="handleClearQueue"
        >
          <Trash2 :size="12" /> Limpiar
        </button>
      </div>

      <div v-if="offline.recentOperations.length === 0" class="py-8 text-center text-sm text-gray-500">
        No hay operaciones en la cola
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="op in offline.recentOperations" :key="op.clientOperationId"
          class="rounded-lg border border-surface-700/30 p-3"
        >
          <div class="flex items-center gap-3">
            <!-- Status icon -->
            <component
              :is="statusIcon(op)" :size="16"
              :class="[statusColor(op), op.status === 'syncing' ? 'animate-spin' : '']"
            />
            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-200">{{ operationLabel(op.operationType) }}</span>
                <span class="rounded bg-surface-700 px-1.5 py-0.5 text-2xs text-gray-400">
                  {{ op.clientOperationId.slice(0, 8) }}…
                </span>
              </div>
              <p class="text-2xs text-gray-500 mt-0.5">{{ fmtTime(op.clientTimestamp) }}</p>
            </div>
            <!-- Status label -->
            <div class="text-right">
              <span class="text-xs font-medium" :class="statusColor(op)">{{ statusLabel(op) }}</span>
              <p v-if="op.serverId" class="text-2xs text-gray-500">Server #{{ op.serverId }}</p>
            </div>
          </div>
          <!-- Error details -->
          <div v-if="op.lastError" class="mt-2 rounded-md bg-red-500/5 px-3 py-2 text-2xs text-red-400">
            {{ op.lastError }}
          </div>
          <!-- Conflict details -->
          <div v-if="op.conflictDetails" class="mt-2 rounded-md bg-yellow-500/5 px-3 py-2 text-2xs text-yellow-400">
            <pre class="whitespace-pre-wrap">{{ JSON.stringify(op.conflictDetails, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- HTTP Request Queue (generic offline requests) -->
    <div class="mt-6 rounded-xl border border-surface-700/50 bg-surface-800 p-5">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-200">
          <Cloud :size="16" class="text-blue-400" /> Solicitudes guardadas offline
        </h3>
        <button
          v-if="offline.queuedRequests.length > 0"
          class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-2xs text-gray-500 hover:bg-surface-700 hover:text-gray-300"
          @click="handleClearRequests"
        >
          <Trash2 :size="12" /> Limpiar
        </button>
      </div>

      <div v-if="offline.queuedRequests.length === 0" class="py-8 text-center text-sm text-gray-500">
        No hay solicitudes guardadas
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="req in offline.queuedRequests" :key="req.id"
          class="rounded-lg border border-surface-700/30 p-3"
        >
          <div class="flex items-center gap-3">
            <!-- Status icon -->
            <component
              :is="reqStatusIcon(req)" :size="16"
              :class="[reqStatusColor(req), req.status === 'replaying' ? 'animate-spin' : '']"
            />
            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-200">{{ req.label }}</span>
                <span class="rounded bg-surface-700 px-1.5 py-0.5 text-2xs text-gray-400 uppercase">
                  {{ req.method }}
                </span>
              </div>
              <p class="text-2xs text-gray-500 mt-0.5 truncate">{{ req.url }} · {{ fmtTime(req.createdAt) }}</p>
            </div>
            <!-- Status label -->
            <div class="text-right">
              <span class="text-xs font-medium" :class="reqStatusColor(req)">{{ reqStatusLabel(req) }}</span>
            </div>
          </div>
          <!-- Error details -->
          <div v-if="req.lastError" class="mt-2 rounded-md bg-red-500/5 px-3 py-2 text-2xs text-red-400">
            {{ req.lastError }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
