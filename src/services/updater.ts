// ─── Manual Updater Service ───
// Custom update flow for unsigned Windows builds:
//   1. Check backend for latest version
//   2. Compare against local version (semver)
//   3. Download new .exe via Rust command (reqwest — bypasses CORS)
//   4. Launch the NSIS installer from Rust
//   5. Close the current app
//
// Does NOT use @tauri-apps/plugin-updater (requires code signing).
// Does NOT use browser fetch() for downloads (blocked by CORS).

import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { exit } from '@tauri-apps/plugin-process'
import apiClient from './apiClient'

// ─── Types ───

export interface UpdateCheckResult {
  available: boolean
  version?: string
  currentVersion?: string
  downloadUrl?: string
  releaseNotes?: string
  fileSize?: number
  fileSizeDisplay?: string
  isMandatory?: boolean
  error?: string
}

export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'launching'
  | 'error'

export interface UpdateProgress {
  phase: UpdatePhase
  percent: number
  message: string
}

/** Shape of the progress event emitted by the Rust download_update command. */
interface RustDownloadProgress {
  percent: number
  downloaded: number
  total: number
  message: string
}

// ─── Helpers ───

/** Get the current app version from the Rust side (reads tauri.conf.json). */
async function getCurrentVersion(): Promise<string> {
  try {
    const info = await invoke<{ version: string }>('get_app_version')
    return info.version
  } catch {
    return '0.0.0'
  }
}

// ─── Public API ───

/**
 * Get the app version string for display in the UI.
 */
export async function getAppVersion(): Promise<string> {
  return getCurrentVersion()
}

/**
 * Check if a newer version is available on the backend.
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  try {
    const currentVersion = await getCurrentVersion()
    const { data } = await apiClient.get('/desktop/releases/latest/', {
      params: { current_version: currentVersion, platform: 'windows' },
      timeout: 10_000,
    })

    if (!data.update_available) {
      return {
        available: false,
        currentVersion,
        version: data.latest_version ?? currentVersion,
      }
    }

    const release = data.release
    return {
      available: true,
      currentVersion,
      version: release.version,
      downloadUrl: release.download_url,
      releaseNotes: release.release_notes || undefined,
      fileSize: release.file_size || undefined,
      fileSizeDisplay: release.file_size_display || undefined,
      isMandatory: release.is_mandatory ?? false,
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Error desconocido al verificar actualizaciones'
    console.warn('[Updater] Check failed:', message)
    return { available: false, error: message }
  }
}

/**
 * Download the .exe installer and launch it, then close the current app.
 *
 * The download happens entirely on the Rust side via reqwest, which
 * bypasses CORS restrictions that block browser fetch() in the webview.
 * Progress is reported via Tauri events.
 *
 * @param downloadUrl - Direct URL to the .exe installer
 * @param onProgress  - Optional callback for UI progress updates
 */
export async function downloadAndInstall(
  downloadUrl: string,
  onProgress?: (progress: UpdateProgress) => void,
): Promise<void> {
  const notify = (phase: UpdatePhase, percent: number, message: string) => {
    onProgress?.({ phase, percent, message })
  }

  let unlisten: UnlistenFn | null = null

  try {
    // ── Step 1: Listen for download progress from Rust ──
    notify('downloading', 0, 'Iniciando descarga...')

    unlisten = await listen<RustDownloadProgress>(
      'update-download-progress',
      (event) => {
        notify('downloading', event.payload.percent, event.payload.message)
      },
    )

    // ── Step 2: Download via Rust (reqwest — no CORS) ──
    // This invokes the Rust command that streams the file to %TEMP%
    // and returns the full path to the saved .exe.
    const installerPath = await invoke<string>('download_update', {
      url: downloadUrl,
    })

    notify('launching', 96, 'Descarga completa. Iniciando instalador...')

    // ── Step 3: Launch the NSIS installer via Rust ──
    // Uses std::process::Command — more reliable than shell open() for .exe
    await invoke('launch_installer', { path: installerPath })

    notify('launching', 100, 'Cerrando aplicación...')

    // ── Step 4: Close the current app ──
    // Small delay so the installer process has time to initialize
    await new Promise((resolve) => setTimeout(resolve, 2000))
    await exit(0)
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Error desconocido durante la actualización'
    notify('error', 0, message)
    throw new Error(message)
  } finally {
    // Always clean up the event listener
    if (unlisten) {
      unlisten()
    }
  }
}
