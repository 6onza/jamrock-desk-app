<script setup lang="ts">
import type { Component } from 'vue'
import { Package as DefaultIcon } from 'lucide-vue-next'

/**
 * Empty-state placeholder with icon, message, and optional action button.
 *
 * Usage:
 *   <EmptyState
 *     :icon="Package"
 *     title="Sin productos"
 *     message="Todavía no hay productos cargados."
 *   >
 *     <template #action>
 *       <button class="btn-primary">Agregar producto</button>
 *     </template>
 *   </EmptyState>
 */

withDefaults(
  defineProps<{
    icon?: Component
    title: string
    message?: string
  }>(),
  {
    icon: () => DefaultIcon,
    message: '',
  },
)
</script>

<template>
  <div class="flex flex-col items-center justify-center px-4 text-center">
    <div class="mb-3 flex justify-center text-gray-500">
      <component :is="icon" :size="40" :stroke-width="1.5" />
    </div>
    <h3 class="text-base font-semibold text-gray-300">{{ title }}</h3>
    <p v-if="message" class="mt-1 max-w-sm text-sm text-gray-500">{{ message }}</p>
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>
