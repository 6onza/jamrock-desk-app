use std::io::Write;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

/// Open a "Save As" dialog and write CSV content to the chosen file.
/// Returns the path where the file was saved, or None if cancelled.
#[tauri::command]
pub async fn export_csv(
    app: AppHandle,
    data: String,
    default_filename: String,
) -> Result<Option<String>, String> {
    let file_path = app
        .dialog()
        .file()
        .set_title("Exportar CSV")
        .set_file_name(&default_filename)
        .add_filter("CSV", &["csv"])
        .add_filter("Todos los archivos", &["*"])
        .blocking_save_file();

    match file_path {
        Some(path) => {
            let path_str = path.to_string();

            // Write with BOM for Excel UTF-8 compatibility
            let mut file = std::fs::File::create(&path_str)
                .map_err(|e| format!("Error al crear archivo: {}", e))?;

            // UTF-8 BOM
            file.write_all(&[0xEF, 0xBB, 0xBF])
                .map_err(|e| format!("Error al escribir BOM: {}", e))?;

            file.write_all(data.as_bytes())
                .map_err(|e| format!("Error al escribir datos: {}", e))?;

            Ok(Some(path_str))
        }
        None => Ok(None), // User cancelled
    }
}
