// ─── Router Navigation Guards ───
// Extracted into its own module for clarity.

import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Install global navigation guards on the given router.
 *
 * Rules:
 * 1. On the first navigation, initialise the auth store (loads tokens + user).
 * 2. Routes with `meta.requiresAuth !== false` redirect to Login if unauthenticated.
 * 3. Authenticated users landing on the Login page are sent to Dashboard.
 */
export function setupGuards(router: Router): void {
  router.beforeEach(async (to, _from, next) => {
    const auth = useAuthStore()

    // Bootstrap auth on the very first navigation
    if (!auth.initialized) {
      await auth.initialize()
    }

    const requiresAuth = to.meta.requiresAuth !== false

    if (requiresAuth && !auth.isAuthenticated) {
      // Not logged in → redirect to login, preserving intended destination
      next({ name: 'Login', query: { redirect: to.fullPath } })
    } else if (to.name === 'Login' && auth.isAuthenticated) {
      // Already logged in → skip login page
      next({ name: 'Dashboard' })
    } else {
      next()
    }
  })
}
