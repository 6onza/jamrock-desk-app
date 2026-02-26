<script setup lang="ts">
/**
 * Reusable page header with title + optional action buttons.
 *
 * Usage:
 *   <PageHeader title="Productos">
 *     <template #actions>
 *       <button class="btn-primary">Nuevo</button>
 *     </template>
 *   </PageHeader>
 */

defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold text-gray-100">{{ title }}</h1>
      <p v-if="subtitle" class="mt-0.5 text-sm text-gray-500">{{ subtitle }}</p>
    </div>
    <div class="flex items-center gap-3">
      <slot name="actions" />
    </div>
  </div>
</template>
