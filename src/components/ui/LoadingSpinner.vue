<script setup lang="ts">
/**
 * Simple loading spinner with optional text.
 *
 * Usage:
 *   <LoadingSpinner />
 *   <LoadingSpinner text="Cargando productos…" size="lg" />
 */

withDefaults(
  defineProps<{
    text?: string
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { size: 'md' },
)

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
}
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <svg
      :class="['animate-spin text-primary-500', sizeMap[size]]"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
    <span v-if="text" class="text-sm text-gray-500">{{ text }}</span>
  </div>
</template>
