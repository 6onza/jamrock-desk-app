<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'

const route = useRoute()

const useAdminLayout = computed(() => route.meta.layout === 'admin')

onMounted(() => {
  // Ensure dark mode class is present on the root html element
  document.documentElement.classList.add('dark')
})
</script>

<template>
  <div class="min-h-screen bg-surface-900 text-gray-100 antialiased">
    <!-- Admin layout wraps pages that declare meta.layout = 'admin' -->
    <AdminLayout v-if="useAdminLayout" />

    <!-- Standalone pages (login, settings, print) render directly -->
    <router-view v-else />
  </div>
</template>

<style>
/* Global overrides for toastification in dark mode */
:root {
  --toastification-color-success: #22c55e;
  --toastification-color-error: #ef4444;
  --toastification-color-warning: #f59e0b;
  --toastification-color-info: #3b82f6;
}
</style>
