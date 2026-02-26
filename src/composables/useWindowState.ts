// ─── Window Management Composable ───
// Handles window state persistence (position, size, maximized)
// and sidebar collapsed state via Tauri Rust commands.

import { ref, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'

export interface WindowState {
  x: number
  y: number
  width: number
  height: number
  maximized: boolean
}

/**
 * Save current window bounds to the Rust backend.
 */
export async function saveWindowState(): Promise<void> {
  try {
    const win = getCurrentWindow()
    const pos = await win.outerPosition()
    const size = await win.outerSize()
    const maximized = await win.isMaximized()

    await invoke('save_window_state', {
      state: {
        x: pos.x,
        y: pos.y,
        width: size.width,
        height: size.height,
        maximized,
      },
    })
  } catch {
    // Silently ignore — window state is a nice-to-have
  }
}

/**
 * Composable that auto-saves window state on resize/move events.
 * Debounced to avoid excessive writes.
 */
export function useWindowState() {
  let saveTimer: ReturnType<typeof setTimeout>
  let unlisten: (() => void) | null = null

  function debounceSave() {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(saveWindowState, 1000)
  }

  onMounted(async () => {
    try {
      const win = getCurrentWindow()
      // Listen to resize and move events
      const unlistenResize = await win.onResized(() => debounceSave())
      const unlistenMove = await win.onMoved(() => debounceSave())

      unlisten = () => {
        unlistenResize()
        unlistenMove()
      }
    } catch {
      // Not in Tauri context (e.g., dev in browser)
    }
  })

  onUnmounted(() => {
    clearTimeout(saveTimer)
    unlisten?.()
  })
}

/**
 * Sidebar collapsed state, persisted in Tauri config store.
 */
const _sidebarCollapsed = ref(false)
let _sidebarLoaded = false

export function useSidebarState() {
  async function loadSidebarState() {
    if (_sidebarLoaded) return
    try {
      const config = await invoke<{ sidebar_collapsed?: boolean }>('get_config')
      _sidebarCollapsed.value = config.sidebar_collapsed ?? false
      _sidebarLoaded = true
    } catch {
      // Defaults to false
    }
  }

  async function toggleSidebar() {
    _sidebarCollapsed.value = !_sidebarCollapsed.value
    try {
      const config = await invoke<Record<string, unknown>>('get_config')
      await invoke('set_config', {
        config: { ...config, sidebar_collapsed: _sidebarCollapsed.value },
      })
    } catch {
      // Ignore persistence failures
    }
  }

  return {
    collapsed: _sidebarCollapsed,
    toggle: toggleSidebar,
    load: loadSidebarState,
  }
}
