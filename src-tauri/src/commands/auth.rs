use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::Value;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const STORE_FILENAME: &str = "secure-tokens.json";
const ACCESS_TOKEN_KEY: &str = "access_token";
const REFRESH_TOKEN_KEY: &str = "refresh_token";

/// Store JWT access and refresh tokens securely via tauri-plugin-store.
#[tauri::command]
pub async fn store_tokens(
    app: AppHandle,
    access_token: String,
    refresh_token: String,
) -> Result<(), String> {
    let store = app
        .store(STORE_FILENAME)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    store.set(ACCESS_TOKEN_KEY, Value::String(access_token));
    store.set(REFRESH_TOKEN_KEY, Value::String(refresh_token));
    store
        .save()
        .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}

/// Retrieve the stored access token, if any.
#[tauri::command]
pub async fn get_access_token(app: AppHandle) -> Result<Option<String>, String> {
    let store = app
        .store(STORE_FILENAME)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    let token = store
        .get(ACCESS_TOKEN_KEY)
        .and_then(|v| v.as_str().map(|s| s.to_string()));

    Ok(token)
}

/// Retrieve the stored refresh token, if any.
#[tauri::command]
pub async fn get_refresh_token(app: AppHandle) -> Result<Option<String>, String> {
    let store = app
        .store(STORE_FILENAME)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    let token = store
        .get(REFRESH_TOKEN_KEY)
        .and_then(|v| v.as_str().map(|s| s.to_string()));

    Ok(token)
}

/// Clear both stored tokens (logout).
#[tauri::command]
pub async fn clear_tokens(app: AppHandle) -> Result<(), String> {
    let store = app
        .store(STORE_FILENAME)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    store.delete(ACCESS_TOKEN_KEY);
    store.delete(REFRESH_TOKEN_KEY);
    store
        .save()
        .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}

/// Check if the stored access token will expire within `buffer_minutes`.
/// Decodes the JWT payload (base64) and compares `exp` with current time.
#[tauri::command]
pub async fn is_token_expiring_soon(
    app: AppHandle,
    buffer_minutes: u64,
) -> Result<bool, String> {
    let store = app
        .store(STORE_FILENAME)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    let token = match store
        .get(ACCESS_TOKEN_KEY)
        .and_then(|v| v.as_str().map(|s| s.to_string()))
    {
        Some(t) => t,
        None => return Ok(true), // No token → treat as expired
    };

    // JWT structure: header.payload.signature
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return Ok(true);
    }

    // Decode the payload (second part) — JWT uses base64url, add padding if needed
    let payload_b64 = parts[1];
    let padded = match payload_b64.len() % 4 {
        2 => format!("{}==", payload_b64),
        3 => format!("{}=", payload_b64),
        _ => payload_b64.to_string(),
    };
    let padded = padded.replace('-', "+").replace('_', "/");

    let decoded = STANDARD
        .decode(&padded)
        .map_err(|e| format!("Failed to decode JWT payload: {}", e))?;

    let payload: Value = serde_json::from_slice(&decoded)
        .map_err(|e| format!("Failed to parse JWT payload: {}", e))?;

    let exp = payload
        .get("exp")
        .and_then(|v| v.as_u64())
        .ok_or_else(|| "Missing 'exp' claim in JWT".to_string())?;

    let now_secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| format!("System time error: {}", e))?
        .as_secs();

    let buffer_secs = buffer_minutes * 60;

    Ok(exp.saturating_sub(now_secs) < buffer_secs)
}
