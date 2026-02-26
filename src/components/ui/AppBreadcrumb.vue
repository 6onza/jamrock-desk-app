<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronRight, Home } from 'lucide-vue-next'

interface BreadcrumbItem {
  label: string
  to?: string
}

const route = useRoute()
const router = useRouter()

const crumbs = computed<BreadcrumbItem[]>(() => {
  const meta = route.meta.breadcrumb as BreadcrumbItem[] | undefined
  if (meta && meta.length > 0) return meta
  // Fallback: use route title
  const title = (route.meta.title as string) || 'Dashboard'
  return [{ label: title }]
})
</script>

<template>
  <nav class="flex items-center gap-1.5 text-xs">
    <!-- Home icon -->
    <button
      class="rounded p-0.5 text-gray-500 transition-colors hover:text-gray-300"
      title="Dashboard"
      @click="router.push('/dashboard')"
    >
      <Home :size="14" />
    </button>

    <template v-for="(crumb, i) in crumbs" :key="i">
      <ChevronRight :size="12" class="text-gray-600" />

      <button
        v-if="crumb.to && i < crumbs.length - 1"
        class="rounded px-1 py-0.5 text-gray-400 transition-colors hover:text-gray-200"
        @click="router.push(crumb.to)"
      >
        {{ crumb.label }}
      </button>
      <span v-else class="px-1 py-0.5 font-medium text-gray-200">
        {{ crumb.label }}
      </span>
    </template>
  </nav>
</template>
