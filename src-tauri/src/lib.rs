use tauri::{
    image::Image,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
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
        // Intentionally no set_focus() — that activates the app and pulls the
        // user out of whatever full-screen space they are in.
    }
}

/// Apply macOS-specific window settings that Tauri's config does not expose:
///  - NSWindowCollectionBehavior: CanJoinAllSpaces | Transient
///    → panel floats over full-screen spaces without stealing focus.
///  - NSStatusWindowLevel (25) → stays above regular app windows.
///  - CALayer corner radius on the content view → rounded panel corners
///    without needing the macOS private API.
#[cfg(target_os = "macos")]
fn configure_macos_window(window: &tauri::WebviewWindow) {
    use objc2::{msg_send, rc::Retained, runtime::AnyObject};
    use raw_window_handle::{HasWindowHandle, RawWindowHandle};

    let Ok(handle) = window.window_handle() else {
        return;
    };
    let RawWindowHandle::AppKit(h) = handle.as_raw() else {
        return;
    };

    // SAFETY: the ns_view pointer is valid for the lifetime of the window.
    unsafe {
        let ns_view = h.ns_view.as_ptr() as *const AnyObject;

        // Get NSWindow from the NSView.
        let ns_window: Option<Retained<AnyObject>> = msg_send![ns_view, window];
        let Some(ns_window) = ns_window else { return };
        let ns_window = &*ns_window;

        // NSWindowCollectionBehaviorCanJoinAllSpaces = 1 << 0 = 1
        // NSWindowCollectionBehaviorTransient       = 1 << 3 = 8
        let _: () = msg_send![ns_window, setCollectionBehavior: 9_u64];

        // NSStatusWindowLevel = 25
        let _: () = msg_send![ns_window, setLevel: 25_i64];

        // Rounded corners via the content view's CALayer (no private API).
        let content_view: *mut AnyObject = msg_send![ns_window, contentView];
        if !content_view.is_null() {
            let _: () = msg_send![content_view, setWantsLayer: true];
            let layer: *mut AnyObject = msg_send![content_view, layer];
            if !layer.is_null() {
                let _: () = msg_send![layer, setCornerRadius: 12.0_f64];
                let _: () = msg_send![layer, setMasksToBounds: true];
            }
        }
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

            let window = app.get_webview_window("main").unwrap();

            // macOS-specific window behaviour.
            #[cfg(target_os = "macos")]
            configure_macos_window(&window);

            // Auto-hide when the panel loses focus.
            let win_clone = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Focused(false) = event {
                    let _ = win_clone.hide();
                }
            });

            // Monochrome template tray icon embedded at compile time.
            // macOS inverts the black pixels automatically for dark menu bars.
            let icon_bytes = include_bytes!("../icons/tray-icon.png");
            let icon = Image::from_bytes(icon_bytes)
                .unwrap_or_else(|_| app.default_window_icon().unwrap().clone());

            TrayIconBuilder::new()
                .icon(icon)
                .icon_as_template(true)
                .tooltip("Mimi — password companion")
                .on_tray_icon_event(|tray, event| {
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

            // Global shortcut ⌥⌘M — only fires on key-down, not key-up.
            let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::ALT), Code::KeyM);
            let app_handle = app.handle().clone();
            if let Err(e) = app.global_shortcut().on_shortcut(
                shortcut,
                move |_app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        toggle_window(&app_handle);
                    }
                },
            ) {
                eprintln!("Warning: could not register ⌥⌘M shortcut: {e}");
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Mimi");
}
