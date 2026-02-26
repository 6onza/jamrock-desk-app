<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from 'vue-toastification'
import AppBreadcrumb from './AppBreadcrumb.vue'
import ConnectionStatus from './ConnectionStatus.vue'
import { Settings, LogOut, UserCog } from 'lucide-vue-next'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

async function handleLogout() {
  await auth.logout()
  toast.info('Sesión cerrada')
  router.push('/login')
}
</script>

<template>
  <header
    class="flex h-12 flex-shrink-0 items-center justify-between border-b border-white/10 bg-surface-800/80 px-5 backdrop-blur-sm"
  >
    <!-- Left: breadcrumb -->
    <AppBreadcrumb />

    <!-- Right: status + user info + actions -->
    <div class="flex items-center gap-3">
      <ConnectionStatus />

      <!-- Divider -->
      <div class="h-5 w-px bg-surface-700/60" />

      <!-- User info -->
      <button
        class="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-gray-400 transition-colors hover:bg-surface-700/50 hover:text-gray-200"
        title="Mi perfil"
        @click="router.push('/profile')"
      >
        <div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500/10">
          <UserCog :size="14" class="text-primary-400" />
        </div>
        <span class="max-w-[120px] truncate text-xs font-medium">
          {{ auth.userDisplayName || 'Admin' }}
        </span>
      </button>

      <!-- Settings button -->
      <button
        class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-surface-700/50 hover:text-gray-300"
        title="Configuración del servidor (Ctrl+,)"
        @click="router.push('/settings')"
      >
        <Settings :size="16" />
      </button>

      <!-- Logout button -->
      <button
        class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
        title="Cerrar sesión"
        @click="handleLogout"
      >
        <LogOut :size="16" />
      </button>
    </div>
  </header>
</template>
