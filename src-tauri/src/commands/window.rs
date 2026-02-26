use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const STORE_FILENAME: &str = "app-config.json";
const WINDOW_STATE_KEY: &str = "window_state";

/// Persisted window position and size.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowState {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub maximized: bool,
}

/// Save current window state (position + size + maximized).
#[tauri::command]
pub async fn save_window_state(
    app: AppHandle,
    state: WindowState,
) -> Result<(), String> {
    let store = app
        .store(STORE_FILENAME)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    let value = serde_json::to_value(&state)
        .map_err(|e| format!("Failed to serialize window state: {}", e))?;

    store.set(WINDOW_STATE_KEY, value);
    store
        .save()
        .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}

/// Retrieve the last saved window state.
#[tauri::command]
pub async fn get_window_state(app: AppHandle) -> Result<Option<WindowState>, String> {
    let store = app
        .store(STORE_FILENAME)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    let state = store
        .get(WINDOW_STATE_KEY)
        .and_then(|v| serde_json::from_value::<WindowState>(v.clone()).ok());

    Ok(state)
}
