mod commands;

use commands::auth;
use commands::config;
use commands::export;
use commands::system;
use commands::updater;
use commands::window;

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    Manager, WindowEvent,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // ── Plugins ──
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        // ── IPC Commands ──
        .invoke_handler(tauri::generate_handler![
            // Auth / Secure token storage
            auth::store_tokens,
            auth::get_access_token,
            auth::get_refresh_token,
            auth::clear_tokens,
            auth::is_token_expiring_soon,
            // Config
            config::get_config,
            config::set_config,
            config::get_api_url,
            config::set_api_url,
            // System
            system::get_app_version,
            // Export
            export::export_csv,
            // Updater
            updater::download_update,
            updater::launch_installer,
            // Window
            window::save_window_state,
            window::get_window_state,
        ])
        .setup(|app| {
            // ── System Tray ──
            let show_item = MenuItemBuilder::with_id("show", "Abrir JamRock Admin")
                .build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Salir")
                .build(app)?;
            let tray_menu = MenuBuilder::new(app)
                .item(&show_item)
                .separator()
                .item(&quit_item)
                .build()?;

            let tray_icon = app
                .default_window_icon()
                .cloned()
                .expect("No window icon configured — check tauri.conf.json bundle.icon");

            let _tray = TrayIconBuilder::new()
                .icon(tray_icon)
                .menu(&tray_menu)
                .tooltip("JamRock Admin")
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(win) = app.get_webview_window("main") {
                                let _ = win.show();
                                let _ = win.unminimize();
                                let _ = win.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                        if let Some(win) = tray.app_handle().get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.unminimize();
                            let _ = win.set_focus();
                        }
                    }
                })
                .build(app)?;

            // ── Restore window state ──
            if let Some(win) = app.get_webview_window("main") {
                let app_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    if let Ok(Some(state)) = window::get_window_state(app_handle).await {
                        if state.maximized {
                            let _ = win.maximize();
                        } else {
                            let pos = tauri::PhysicalPosition::new(state.x, state.y);
                            let size = tauri::PhysicalSize::new(state.width, state.height);
                            let _ = win.set_position(pos);
                            let _ = win.set_size(size);
                        }
                    }
                });
            }

            Ok(())
        })
        // ── Save window state on close ──
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                if let (Ok(pos), Ok(size), Ok(maximized)) =
                    (window.outer_position(), window.outer_size(), window.is_maximized())
                {
                    let state = window::WindowState {
                        x: pos.x,
                        y: pos.y,
                        width: size.width,
                        height: size.height,
                        maximized,
                    };
                    let app_handle = window.app_handle().clone();
                    tauri::async_runtime::spawn(async move {
                        let _ = window::save_window_state(app_handle, state).await;
                    });
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

