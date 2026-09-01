use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};
use tauri_plugin_positioner::{Position, WindowExt};

fn toggle_window(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
    } else {
        let _ = window.move_window(Position::TrayBottomCenter);
        let _ = window.show();
        let _ = window.set_focus();
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // Hide from Dock — menu bar only.
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // Auto-hide panel when it loses focus.
            let window = app.get_webview_window("main").unwrap();
            let win_clone = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Focused(false) = event {
                    let _ = win_clone.hide();
                }
            });

            // System tray icon — clicking toggles the panel.
            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .icon_as_template(true) // macOS: adapts to dark/light menu bar
                .tooltip("Mimi — password companion")
                .on_tray_icon_event(|tray, event| {
                    // Let positioner track tray position before we move the window.
                    tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_window(tray.app_handle());
                    }
                })
                .build(app)?;

            // Global keyboard shortcut: ⌥⌘M opens/closes the panel from anywhere.
            // on_shortcut both registers and sets the handler in one call.
            // Non-fatal: another app may already hold the hotkey.
            let shortcut = Shortcut::new(
                Some(Modifiers::SUPER | Modifiers::ALT),
                Code::KeyM,
            );
            let app_handle = app.handle().clone();
            if let Err(e) = app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, _event| {
                toggle_window(&app_handle);
            }) {
                eprintln!("Warning: could not register ⌥⌘M shortcut: {e}");
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Mimi");
}
