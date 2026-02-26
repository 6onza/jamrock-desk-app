<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-vue-next'
import { createCustomer } from '@/services/customers'

const router = useRouter()

const form = ref({ username: '', email: '', password: '', password2: '', dni: '' })
const showPassword = ref(false)
const saving = ref(false)
const error = ref('')

const isValid = computed(() =>
  form.value.username.length >= 4 &&
  form.value.email.includes('@') &&
  form.value.password.length >= 6 &&
  form.value.password === form.value.password2,
)

async function submit() {
  if (!isValid.value) return
  saving.value = true
  error.value = ''
  try {
    await createCustomer(form.value)
    router.push('/customers')
  } catch (e: unknown) {
    const err = e as { response?: { data?: Record<string, unknown> }; message?: string }
    if (err?.response?.data) {
      const d = err.response.data
      const fieldErrors = Object.entries(d)
        .filter(([k]) => !['detail', 'message'].includes(k))
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      if (fieldErrors.length) { error.value = fieldErrors.join(' · '); return }
      error.value = String(d.detail || d.message || 'Error al crear cliente')
    } else {
      error.value = err?.message || 'Error al crear cliente'
    }
  } finally { saving.value = false }
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center gap-3">
      <button class="rounded-lg p-1.5 text-gray-400 hover:bg-surface-800 hover:text-gray-200" @click="router.push('/customers')">
        <ArrowLeft :size="20" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-gray-100">Nuevo cliente</h1>
        <p class="text-sm text-gray-500">Crear una nueva cuenta de cliente</p>
      </div>
    </div>

    <div class="mx-auto max-w-lg rounded-xl border border-surface-700/50 bg-surface-800 p-6">
      <form @submit.prevent="submit" class="space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-300">Username <span class="text-red-400">*</span></label>
          <input v-model="form.username" required minlength="4"
            class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-primary-500/50 focus:outline-none"
            placeholder="usuario123" />
          <p class="mt-0.5 text-2xs text-gray-600">Mínimo 4 caracteres</p>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-300">Email <span class="text-red-400">*</span></label>
          <input v-model="form.email" type="email" required
            class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-primary-500/50 focus:outline-none"
            placeholder="cliente@email.com" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-300">DNI <span class="text-gray-600">(opcional)</span></label>
          <input v-model="form.dni"
            class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-primary-500/50 focus:outline-none"
            placeholder="12345678" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-300">Contraseña <span class="text-red-400">*</span></label>
          <div class="relative">
            <input v-model="form.password" :type="showPassword ? 'text' : 'password'" required minlength="6"
              class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 pr-10 text-sm text-gray-200 placeholder-gray-600 focus:border-primary-500/50 focus:outline-none"
              placeholder="Mínimo 6 caracteres" />
            <button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300" @click="showPassword = !showPassword">
              <component :is="showPassword ? EyeOff : Eye" :size="16" />
            </button>
          </div>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-300">Confirmar contraseña <span class="text-red-400">*</span></label>
          <input v-model="form.password2" :type="showPassword ? 'text' : 'password'" required
            class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-primary-500/50 focus:outline-none"
            placeholder="Repetir contraseña" />
          <p v-if="form.password2 && form.password !== form.password2" class="mt-0.5 text-2xs text-red-400">Las contraseñas no coinciden</p>
        </div>

        <div v-if="error" class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{{ error }}</div>

        <div class="flex justify-end gap-3 pt-2">
          <button type="button" class="rounded-lg border border-surface-700/50 px-4 py-2 text-sm text-gray-400 hover:bg-surface-700" @click="router.push('/customers')">Cancelar</button>
          <button type="submit" :disabled="!isValid || saving"
            class="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50">
            <Save :size="16" /> {{ saving ? 'Creando…' : 'Crear cuenta' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
