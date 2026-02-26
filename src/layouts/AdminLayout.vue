<script setup lang="ts">
import AppSidebar from '@/components/ui/AppSidebar.vue'
import AppTopbar from '@/components/ui/AppTopbar.vue'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'

// Register global keyboard shortcuts
useKeyboardShortcuts()
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-surface-900">
    <!-- Sidebar -->
    <AppSidebar />

    <!-- Main area -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Top bar -->
      <AppTopbar />

      <!-- Page content -->
      <main class="flex-1 overflow-auto p-6">
        <router-view v-slot="{ Component, route }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="route.path" />
          </Transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
.page-enter-active,
.page-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
