use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct AppVersionInfo {
    pub version: String,
    pub name: String,
    pub os: String,
    pub arch: String,
}

/// Return the current application version and system info.
///
/// Reads the version from tauri.conf.json (via package_info) so it stays
/// in sync with the bundle version automatically.
#[tauri::command]
pub async fn get_app_version(app: tauri::AppHandle) -> Result<AppVersionInfo, String> {
    let pkg = app.package_info();
    Ok(AppVersionInfo {
        version: pkg.version.to_string(),
        name: pkg.name.to_string(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
    })
}
