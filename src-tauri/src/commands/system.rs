use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct AppVersionInfo {
    pub version: String,
    pub name: String,
    pub os: String,
    pub arch: String,
}

/// Return the current application version and system info.
#[tauri::command]
pub async fn get_app_version() -> Result<AppVersionInfo, String> {
    Ok(AppVersionInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        name: env!("CARGO_PKG_NAME").to_string(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
    })
}
