// ─── Auth Pinia Store ───
// Central authentication state for the Tauri admin app.
// Tokens live in Tauri's secure store — this store holds
// the reactive user object and derived getters.

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authService from '@/services/auth'
import * as secureStore from '@/services/secureStore'
import { initApiClient } from '@/services/apiClient'
import type { User } from '@/types/auth'

export const useAuthStore = defineStore('auth', () => {
  // ═══════ State ═══════
  const user = ref<User | null>(null)
  const isAdmin = ref(false)
  const initialized = ref(false)
  const loading = ref(false)

  // ═══════ Getters ═══════
  const isAuthenticated = computed(() => !!user.value)

  const currentUser = computed(() => user.value)

  const userDisplayName = computed(() => {
    if (!user.value) return ''
    if (user.value.first_name) {
      return `${user.value.first_name} ${user.value.last_name ?? ''}`.trim()
    }
    return user.value.username
  })

  // ═══════ Actions ═══════

  /**
   * Bootstrap auth state on app startup.
   * 1. Init the API client base URL
   * 2. Check for a valid token in the secure store
   * 3. Load user data (from store or from the API)
   */
  async function initialize(): Promise<void> {
    if (initialized.value) return

    try {
      loading.value = true

      // Make sure the axios baseURL is set from Tauri config
      await initApiClient()

      const token = await secureStore.getAccessToken()
      if (!token) return // No session — stay unauthenticated

      const expiring = await secureStore.isTokenExpiringSoon(5)
      if (expiring) {
        // Token expired / expiring — wipe everything
        await secureStore.clearAll()
        return
      }

      // Token is valid → try loading cached user data first
      const storedUser = await secureStore.getUserData()
      const storedAdmin = await secureStore.getIsAdmin()

      if (storedUser) {
        user.value = storedUser
        isAdmin.value = storedAdmin
      } else {
        // No cached user — fetch from API
        try {
          const profile = await authService.getProfile()
          user.value = profile
          isAdmin.value = profile.is_staff || profile.is_superuser
          await secureStore.saveUserData(profile)
        } catch {
          // Profile fetch failed — clear auth
          await secureStore.clearAll()
        }
      }
    } catch (err) {
      console.error('[AuthStore] Initialization failed:', err)
    } finally {
      initialized.value = true
      loading.value = false
    }
  }

  /**
   * Log in with username + password.
   * Throws on failure so callers can show error messages.
   */
  async function login(username: string, password: string): Promise<void> {
    loading.value = true
    try {
      const response = await authService.login({ username, password })
      user.value = response.user
      isAdmin.value = response.is_staff || response.is_admin
    } finally {
      loading.value = false
    }
  }

  /** Log out — clear all state and secure storage. */
  async function logout(): Promise<void> {
    await authService.logout()
    user.value = null
    isAdmin.value = false
  }

  /** Re-fetch the user profile from the server and update the store. */
  async function refreshProfile(): Promise<void> {
    try {
      const profile = await authService.getProfile()
      user.value = profile
      isAdmin.value = profile.is_staff || profile.is_superuser
      await secureStore.saveUserData(profile)
    } catch (err) {
      console.error('[AuthStore] Failed to refresh profile:', err)
    }
  }

  /** Quick check — is there a valid, non-expiring token? */
  async function checkAuth(): Promise<boolean> {
    const token = await secureStore.getAccessToken()
    if (!token) return false
    const expiring = await secureStore.isTokenExpiringSoon(2)
    return !expiring
  }

  return {
    // State
    user,
    isAdmin,
    initialized,
    loading,
    // Getters
    isAuthenticated,
    currentUser,
    userDisplayName,
    // Actions
    initialize,
    login,
    logout,
    refreshProfile,
    checkAuth,
  }
})
