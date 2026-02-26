// ─── Manual Updater Service ───
// Custom update flow for unsigned Windows builds:
//   1. Check backend for latest version
//   2. Compare against local version (semver)
//   3. Download new .exe to temp folder via Tauri FS
//   4. Launch the NSIS installer
//   5. Close the current app
//
// Does NOT use @tauri-apps/plugin-updater (requires code signing).

import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-shell'
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

// ─── Helpers ───

/** Get the current app version from the Rust side. */
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
 * The NSIS installer will handle the rest (overwrite files, restart).
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

  try {
    // ── Step 1: Download ──
    notify('downloading', 0, 'Descargando actualización...')

    const response = await fetch(downloadUrl)
    if (!response.ok) {
      throw new Error(`Error de descarga: HTTP ${response.status}`)
    }

    const contentLength = Number(response.headers.get('content-length') || 0)
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No se pudo iniciar la descarga')

    const chunks: Uint8Array[] = []
    let received = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.length
      if (contentLength > 0) {
        const pct = Math.min(95, Math.round((received / contentLength) * 95))
        notify('downloading', pct, `Descargando... ${pct}%`)
      }
    }

    // Combine chunks into a single Uint8Array
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
    const bytes = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.length
    }

    notify('downloading', 95, 'Guardando instalador...')

    // ── Step 2: Write to temp via Rust ──
    // We use the Tauri FS plugin to write the downloaded bytes
    // to the system's temp directory.
    const { writeFile, BaseDirectory } = await import('@tauri-apps/plugin-fs')
    const fileName = `JamrockAdmin-update-${Date.now()}.exe`
    
    await writeFile(fileName, bytes, { baseDir: BaseDirectory.Temp })

    notify('launching', 98, 'Iniciando instalador...')

    // ── Step 3: Launch the installer ──
    // Build the full path in the temp directory
    const { tempDir } = await import('@tauri-apps/api/path')
    const tempPath = await tempDir()
    const installerPath = `${tempPath}${fileName}`

    // Open the installer using the shell plugin
    await open(installerPath)

    notify('launching', 100, 'Cerrando aplicación...')

    // ── Step 4: Close the current app ──
    // Give a small delay so the installer has time to start
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await exit(0)
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Error desconocido durante la actualización'
    notify('error', 0, message)
    throw new Error(message)
  }
}
