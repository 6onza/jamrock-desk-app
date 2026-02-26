use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const STORE_FILENAME: &str = "app-config.json";
const CONFIG_KEY: &str = "config";
const API_URL_KEY: &str = "api_url";

/// Application configuration persisted locally.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub api_url: String,
    pub theme: String,
    pub sidebar_collapsed: bool,
    pub auto_refresh_interval: u64,
    pub last_username: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            api_url: String::from("https://jamrock-api.up.railway.app/api"),
            theme: String::from("dark"),
            sidebar_collapsed: false,
            auto_refresh_interval: 30,
            last_username: String::new(),
        }
    }
}

/// Retrieve the full application configuration. Returns defaults if nothing is stored.
#[tauri::command]
pub async fn get_config(app: AppHandle) -> Result<AppConfig, String> {
    let store = app
        .store(STORE_FILENAME)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    let config = store
        .get(CONFIG_KEY)
        .and_then(|v| serde_json::from_value::<AppConfig>(v.clone()).ok())
        .unwrap_or_default();

    Ok(config)
}

/// Save the full application configuration.
#[tauri::command]
pub async fn set_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    let store = app
        .store(STORE_FILENAME)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    let value = serde_json::to_value(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    store.set(CONFIG_KEY, value);
    store
        .save()
        .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}

/// Quick accessor — get only the API base URL.
#[tauri::command]
pub async fn get_api_url(app: AppHandle) -> Result<String, String> {
    let store = app
        .store(STORE_FILENAME)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    let url = store
        .get(API_URL_KEY)
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .or_else(|| {
            store
                .get(CONFIG_KEY)
                .and_then(|v| {
                    serde_json::from_value::<AppConfig>(v.clone())
                        .ok()
                        .map(|c| c.api_url)
                })
        })
        .unwrap_or_else(|| AppConfig::default().api_url);

    Ok(url)
}

/// Quick setter — update only the API base URL (also updates the full config if present).
#[tauri::command]
pub async fn set_api_url(app: AppHandle, url: String) -> Result<(), String> {
    let store = app
        .store(STORE_FILENAME)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    // Update the standalone key
    store.set(API_URL_KEY, Value::String(url.clone()));

    // Also update inside the full config if it exists
    if let Some(existing) = store.get(CONFIG_KEY) {
        if let Ok(mut config) = serde_json::from_value::<AppConfig>(existing.clone()) {
            config.api_url = url;
            if let Ok(value) = serde_json::to_value(&config) {
                store.set(CONFIG_KEY, value);
            }
        }
    }

    store
        .save()
        .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}
