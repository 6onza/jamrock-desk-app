// ─── Custom Updater Commands ───
// Downloads the .exe installer from a URL using reqwest (no CORS issues),
// saves it to the system temp directory, and launches it.

use serde::Serialize;
use std::io::Write;
use tauri::{AppHandle, Emitter};

/// Progress payload emitted to the frontend during download.
#[derive(Clone, Serialize)]
pub struct DownloadProgress {
    pub percent: u32,
    pub downloaded: u64,
    pub total: u64,
    pub message: String,
}

/// Download the installer .exe to the system TEMP directory.
///
/// Emits `update-download-progress` events for the UI progress bar.
/// Returns the full path to the saved file.
#[tauri::command]
pub async fn download_update(app: AppHandle, url: String) -> Result<String, String> {
    // ── Build the destination path ──
    let temp_dir = std::env::temp_dir();
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let filename = format!("JamrockAdmin-update-{}.exe", timestamp);
    let file_path = temp_dir.join(&filename);

    // ── HTTP GET with reqwest (no CORS restrictions) ──
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300)) // 5 min max
        .build()
        .map_err(|e| format!("Error al crear cliente HTTP: {}", e))?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Error de conexión al descargar: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Error HTTP {} al descargar el instalador",
            response.status()
        ));
    }

    let total_size = response.content_length().unwrap_or(0);

    // ── Stream the response body to disk ──
    let mut file = std::fs::File::create(&file_path)
        .map_err(|e| format!("Error al crear archivo temporal: {}", e))?;

    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    use futures_util::StreamExt;
    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Error durante la descarga: {}", e))?;

        file.write_all(&chunk)
            .map_err(|e| format!("Error al escribir en disco: {}", e))?;

        downloaded += chunk.len() as u64;

        // Calculate percentage (cap at 95% — the last 5% is for launching)
        let percent = if total_size > 0 {
            ((downloaded as f64 / total_size as f64) * 95.0) as u32
        } else {
            0
        };

        // Emit progress to the frontend (best-effort, ignore errors)
        let _ = app.emit(
            "update-download-progress",
            DownloadProgress {
                percent,
                downloaded,
                total: total_size,
                message: format!("Descargando... {}%", percent),
            },
        );
    }

    file.flush()
        .map_err(|e| format!("Error al finalizar escritura: {}", e))?;

    // Explicitly drop the file handle so it's fully closed before we return
    drop(file);

    Ok(file_path.to_string_lossy().to_string())
}

/// Launch the NSIS installer .exe from the given path.
///
/// Uses `std::process::Command` which is more reliable than shell `open()`
/// for running executables on Windows.
#[tauri::command]
pub async fn launch_installer(path: String) -> Result<(), String> {
    // Verify the file exists before trying to launch
    if !std::path::Path::new(&path).exists() {
        return Err(format!("El instalador no existe en: {}", path));
    }

    std::process::Command::new(&path)
        .spawn()
        .map_err(|e| format!("Error al iniciar el instalador: {}", e))?;

    Ok(())
}
