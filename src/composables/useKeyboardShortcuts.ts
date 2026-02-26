import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

/**
 * Global keyboard shortcuts for desktop-like UX.
 *
 * Shortcuts:
 *   Ctrl+D → Dashboard
 *   Ctrl+N → New sale
 *   Ctrl+P → Products
 *   Ctrl+, → Settings
 *   Escape → Go back / close
 */

export interface ShortcutOverride {
  onEscape?: () => boolean // return true to prevent default behaviour
}

export function useKeyboardShortcuts(overrides: ShortcutOverride = {}) {
  const router = useRouter()

  function handler(e: KeyboardEvent) {
    const ctrl = e.ctrlKey || e.metaKey
    const tag = (e.target as HTMLElement).tagName

    // Don't intercept when typing in inputs
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
      if (e.key === 'Escape') {
        ;(e.target as HTMLElement).blur()
      }
      return
    }

    if (ctrl) {
      switch (e.key.toLowerCase()) {
        case 'd':
          e.preventDefault()
          router.push('/dashboard')
          break
        case 'n':
          e.preventDefault()
          router.push('/orders/new')
          break
        case 'p':
          e.preventDefault()
          router.push('/products')
          break
        case ',':
          e.preventDefault()
          router.push('/settings')
          break
      }
      return
    }

    if (e.key === 'Escape') {
      if (overrides.onEscape?.()) return
      // Default: go back in history
      if (window.history.length > 1) {
        router.back()
      }
    }
  }

  onMounted(() => window.addEventListener('keydown', handler))
  onUnmounted(() => window.removeEventListener('keydown', handler))
}
