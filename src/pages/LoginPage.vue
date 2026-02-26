<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from 'vue-toastification'
import { useVuelidate } from '@vuelidate/core'
import { required, minLength, helpers } from '@vuelidate/validators'
import { getLastUsername } from '@/services/secureStore'
import { Settings } from 'lucide-vue-next'
import logoUrl from '@/assets/jamrock-logo.png'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const toast = useToast()

// ─── Form state ───
const form = ref({
  username: '',
  password: '',
})
const loading = ref(false)
const error = ref('')

const showExpiredMessage = computed(() => route.query.expired === 'true')

// ─── Vuelidate rules ───
const rules = {
  username: {
    required: helpers.withMessage('Ingresá tu usuario o email', required),
  },
  password: {
    required: helpers.withMessage('Ingresá tu contraseña', required),
    minLength: helpers.withMessage('Mínimo 4 caracteres', minLength(4)),
  },
}

const v$ = useVuelidate(rules, form)

// ─── Pre-fill last username ───
onMounted(async () => {
  try {
    const lastUser = await getLastUsername()
    if (lastUser) form.value.username = lastUser
  } catch {
    // Ignore — first run or store not available yet
  }
})

// ─── Login handler ───
async function handleLogin() {
  const isValid = await v$.value.$validate()
  if (!isValid) return

  loading.value = true
  error.value = ''

  try {
    await auth.login(form.value.username, form.value.password)

    // Admin gate — only admins may use this desktop app
    if (!auth.isAdmin) {
      error.value = 'Acceso denegado. Solo administradores pueden usar esta aplicación.'
      await auth.logout()
      return
    }

    toast.success(`Bienvenido, ${auth.userDisplayName}`)

    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (err: unknown) {
    const axErr = err as Record<string, unknown>
    const resp = axErr?.response as Record<string, unknown> | undefined
    const status = resp?.status as number | undefined
    const data = resp?.data as Record<string, unknown> | undefined

    if (status === 401) {
      error.value = 'Credenciales inválidas'
    } else if (status === 403) {
      if (data?.error === 'email_not_verified') {
        error.value = 'Tu cuenta no está verificada. Revisá tu email.'
      } else {
        error.value = 'Acceso denegado'
      }
    } else if (
      (axErr as Record<string, unknown>).isNetworkError ||
      String((axErr as Record<string, unknown>).message ?? '').includes('conectar')
    ) {
      error.value =
        'No se pudo conectar con el servidor. Verificá la URL del API en Configuración.'
    } else {
      error.value =
        (data?.error as string) ??
        (axErr as Record<string, unknown>).message as string ??
        'Error al iniciar sesión'
    }
  } finally {
    loading.value = false
  }
}

function goToSettings() {
  router.push({ name: 'Settings' })
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-surface-900 p-4">
    <div class="w-full max-w-sm">
      <!-- Settings gear (top-right) -->
      <button
        class="fixed right-4 top-4 rounded-lg p-2 text-gray-600 transition hover:bg-surface-800 hover:text-gray-400"
        title="Configuración"
        @click="goToSettings"
      >
        <Settings :size="20" />
      </button>

      <!-- Logo / Brand -->
      <div class="mb-8 text-center">
        <img
          :src="logoUrl"
          alt="Jamrock GrowShop"
          class="mx-auto mb-4 h-20 w-20 rounded-2xl object-contain"
        />
        <h1 class="text-2xl font-bold text-gray-100">Jamrock Admin</h1>
        <p class="mt-1 text-sm text-gray-500">Panel de administración</p>
      </div>

      <!-- Login Card -->
      <div class="card">
        <form @submit.prevent="handleLogin" class="space-y-5">
          <!-- Session expired alert -->
          <div
            v-if="showExpiredMessage"
            class="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400"
          >
            Tu sesión expiró. Por favor ingresá nuevamente.
          </div>

          <!-- Error alert -->
          <div
            v-if="error"
            class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {{ error }}
          </div>

          <!-- Username -->
          <div>
            <label for="username" class="mb-1.5 block text-sm font-medium text-gray-400">
              Usuario o email
            </label>
            <input
              id="username"
              v-model="form.username"
              type="text"
              autocomplete="username"
              class="input-field"
              :class="{ '!border-red-500/60': v$.username.$error }"
              placeholder="admin"
              :disabled="loading"
              @blur="v$.username.$touch()"
            />
            <p
              v-if="v$.username.$error"
              class="mt-1 text-xs text-red-400"
            >
              {{ v$.username.$errors[0]?.$message }}
            </p>
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="mb-1.5 block text-sm font-medium text-gray-400">
              Contraseña
            </label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              class="input-field"
              :class="{ '!border-red-500/60': v$.password.$error }"
              placeholder="••••••••"
              :disabled="loading"
              @blur="v$.password.$touch()"
            />
            <p
              v-if="v$.password.$error"
              class="mt-1 text-xs text-red-400"
            >
              {{ v$.password.$errors[0]?.$message }}
            </p>
          </div>

          <!-- Submit -->
          <button type="submit" class="btn-primary w-full" :disabled="loading">
            <svg
              v-if="loading"
              class="h-4 w-4 animate-spin"
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
            {{ loading ? 'Ingresando...' : 'Ingresar' }}
          </button>
        </form>
      </div>

      <!-- Footer -->
      <p class="mt-6 text-center text-xs text-gray-600">
        Jamrock GrowShop &copy; {{ new Date().getFullYear() }}
      </p>
    </div>
  </div>
</template>
