<script setup lang="ts">
/**
 * Confirmation dialog using Tauri's native dialog API with a Vue fallback.
 *
 * Usage:
 *   <ConfirmDialog
 *     v-model:open="showDialog"
 *     title="Eliminar producto"
 *     message="¿Estás seguro? Esta acción no se puede deshacer."
 *     confirm-label="Eliminar"
 *     variant="danger"
 *     @confirm="deleteProduct"
 *     @cancel="showDialog = false"
 *   />
 */
import { watch } from 'vue'
import { AlertTriangle, Info, X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'danger' | 'warning' | 'info'
    loading?: boolean
  }>(),
  {
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    variant: 'danger',
    loading: false,
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
  cancel: []
}>()

function close() {
  emit('update:open', false)
  emit('cancel')
}

function confirm() {
  emit('confirm')
}

// Close on Escape
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') close()
      }
      window.addEventListener('keydown', handler)
      // Cleanup when dialog closes
      const stop = watch(
        () => props.open,
        (v) => {
          if (!v) {
            window.removeEventListener('keydown', handler)
            stop()
          }
        },
      )
    }
  },
)

const iconColor = {
  danger: 'text-red-400 bg-red-500/10',
  warning: 'text-amber-400 bg-amber-500/10',
  info: 'text-blue-400 bg-blue-500/10',
}

const confirmBtnClass = {
  danger: 'btn-danger',
  warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20',
  info: 'btn-primary',
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="close"
        />

        <!-- Dialog card -->
        <div class="relative w-full max-w-md animate-fade-in rounded-xl border border-surface-700 bg-surface-800 p-6 shadow-2xl">
          <!-- Close button -->
          <button
            class="absolute right-3 top-3 rounded-lg p-1 text-gray-500 transition-colors hover:bg-surface-700/50 hover:text-gray-300"
            @click="close"
          >
            <X :size="16" />
          </button>

          <!-- Icon -->
          <div
            class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            :class="iconColor[variant]"
          >
            <AlertTriangle v-if="variant === 'danger' || variant === 'warning'" :size="24" />
            <Info v-else :size="24" />
          </div>

          <!-- Content -->
          <h3 class="text-center text-lg font-semibold text-gray-100">{{ title }}</h3>
          <p class="mt-2 text-center text-sm text-gray-400">{{ message }}</p>

          <!-- Actions -->
          <div class="mt-6 flex items-center justify-center gap-3">
            <button
              class="btn-secondary px-5 text-sm"
              :disabled="loading"
              @click="close"
            >
              {{ cancelLabel }}
            </button>
            <button
              :class="[confirmBtnClass[variant], 'px-5 text-sm inline-flex items-center justify-center gap-2 font-medium rounded-lg py-2 transition-colors disabled:opacity-50']"
              :disabled="loading"
              @click="confirm"
            >
              <svg
                v-if="loading"
                class="h-3.5 w-3.5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.15s ease;
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}
</style>
