<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { User, Save, KeyRound, Mail, Shield } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import { getProfile, updateProfile, changePassword } from '@/services/auth'
import type { User as UserType } from '@/types/auth'

// State
const user = ref<UserType | null>(null)
const loading = ref(true)

// Profile form
const profileForm = reactive({
  first_name: '',
  last_name: '',
  email: '',
})
const profileSaving = ref(false)

// Password form
const passwordForm = reactive({
  old_password: '',
  new_password: '',
  confirm_password: '',
})
const passwordSaving = ref(false)

// Messages
const profileMsg = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const passwordMsg = ref<{ type: 'success' | 'error'; text: string } | null>(null)

// ── Load ──
async function loadProfile() {
  loading.value = true
  try {
    const data = await getProfile()
    user.value = data
    profileForm.first_name = data.first_name || ''
    profileForm.last_name = data.last_name || ''
    profileForm.email = data.email || ''
  } finally { loading.value = false }
}

// ── Save profile ──
async function saveProfile() {
  profileSaving.value = true
  profileMsg.value = null
  try {
    const data = await updateProfile({
      first_name: profileForm.first_name,
      last_name: profileForm.last_name,
      email: profileForm.email,
    })
    user.value = data
    profileMsg.value = { type: 'success', text: 'Perfil actualizado correctamente' }
  } catch {
    profileMsg.value = { type: 'error', text: 'Error al actualizar el perfil' }
  } finally { profileSaving.value = false }
}

// ── Change password ──
async function doChangePassword() {
  passwordMsg.value = null
  if (passwordForm.new_password !== passwordForm.confirm_password) {
    passwordMsg.value = { type: 'error', text: 'Las contraseñas no coinciden' }
    return
  }
  if (passwordForm.new_password.length < 8) {
    passwordMsg.value = { type: 'error', text: 'La nueva contraseña debe tener al menos 8 caracteres' }
    return
  }
  passwordSaving.value = true
  try {
    await changePassword({
      old_password: passwordForm.old_password,
      new_password: passwordForm.new_password,
    })
    passwordMsg.value = { type: 'success', text: 'Contraseña cambiada correctamente' }
    passwordForm.old_password = ''
    passwordForm.new_password = ''
    passwordForm.confirm_password = ''
  } catch {
    passwordMsg.value = { type: 'error', text: 'Contraseña actual incorrecta o error del servidor' }
  } finally { passwordSaving.value = false }
}

function initials(u: UserType): string {
  const f = u.first_name?.[0] || ''
  const l = u.last_name?.[0] || ''
  return (f + l).toUpperCase() || u.username[0]?.toUpperCase() || 'A'
}

onMounted(() => loadProfile())
</script>

<template>
  <div>
    <PageHeader title="Mi perfil" subtitle="Configuración de la cuenta de administrador" />

    <div v-if="loading" class="flex justify-center py-20"><LoadingSpinner text="Cargando perfil…" /></div>
    <div v-else-if="user" class="space-y-6">

      <!-- Profile card -->
      <div class="rounded-xl border border-surface-700/50 bg-surface-800 p-6">
        <div class="flex items-center gap-4">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/15 text-xl font-bold text-primary-400">
            {{ initials(user) }}
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-100">{{ user.first_name || '' }} {{ user.last_name || '' }}</h2>
            <p class="text-sm text-gray-400">@{{ user.username }}</p>
            <div class="mt-1 flex items-center gap-2">
              <span v-if="user.is_superuser" class="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-2xs font-medium text-amber-400">
                <Shield :size="10" /> Superadmin
              </span>
              <span v-else-if="user.is_staff" class="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-2xs font-medium text-blue-400">
                <Shield :size="10" /> Staff
              </span>
              <span class="inline-flex items-center gap-1 rounded-full bg-surface-700 px-2 py-0.5 text-2xs text-gray-400">
                <Mail :size="10" /> {{ user.email }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Edit profile -->
      <section class="rounded-xl border border-surface-700/50 bg-surface-800 p-5">
        <h3 class="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-200">
          <User :size="16" class="text-blue-400" /> Información personal
        </h3>
        <Transition name="dialog">
          <div v-if="profileMsg"
            class="mb-3 rounded-lg border px-3 py-2 text-sm"
            :class="profileMsg.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-red-500/30 bg-red-500/10 text-red-400'"
          >{{ profileMsg.text }}</div>
        </Transition>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Nombre</label>
            <input v-model="profileForm.first_name" type="text"
              class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
          </div>
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Apellido</label>
            <input v-model="profileForm.last_name" type="text"
              class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-2xs font-medium text-gray-400">Email</label>
            <input v-model="profileForm.email" type="email"
              class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
          </div>
        </div>
        <div class="mt-4 flex justify-end">
          <button
            class="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
            :disabled="profileSaving"
            @click="saveProfile"
          >
            <Save :size="14" /> {{ profileSaving ? 'Guardando…' : 'Guardar cambios' }}
          </button>
        </div>
      </section>

      <!-- Change password -->
      <section class="rounded-xl border border-surface-700/50 bg-surface-800 p-5">
        <h3 class="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-200">
          <KeyRound :size="16" class="text-amber-400" /> Cambiar contraseña
        </h3>
        <Transition name="dialog">
          <div v-if="passwordMsg"
            class="mb-3 rounded-lg border px-3 py-2 text-sm"
            :class="passwordMsg.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-red-500/30 bg-red-500/10 text-red-400'"
          >{{ passwordMsg.text }}</div>
        </Transition>
        <div class="grid gap-4 sm:grid-cols-3">
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Contraseña actual</label>
            <input v-model="passwordForm.old_password" type="password"
              class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
          </div>
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Nueva contraseña</label>
            <input v-model="passwordForm.new_password" type="password"
              class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
          </div>
          <div>
            <label class="mb-1 block text-2xs font-medium text-gray-400">Confirmar contraseña</label>
            <input v-model="passwordForm.confirm_password" type="password"
              class="w-full rounded-lg border border-surface-700/50 bg-surface-900 px-3 py-2 text-sm text-gray-200 focus:border-primary-500/50 focus:outline-none" />
          </div>
        </div>
        <div class="mt-4 flex justify-end">
          <button
            class="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
            :disabled="passwordSaving || !passwordForm.old_password || !passwordForm.new_password"
            @click="doChangePassword"
          >
            <KeyRound :size="14" /> {{ passwordSaving ? 'Cambiando…' : 'Cambiar contraseña' }}
          </button>
        </div>
      </section>

    </div>
  </div>
</template>
