"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { App } from "@capacitor/app";

/**
 * Initializes Capacitor native plugins when running inside a native shell.
 * Import this in your root layout or providers — it's a no-op on web.
 */
export function useCapacitorBootstrap() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Status bar
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    StatusBar.setBackgroundColor({ color: "#000000" }).catch(() => {});

    // Keyboard — resize webview when keyboard opens (Android)
    Keyboard.setResizeMode({ mode: KeyboardResize.Body }).catch(() => {});

    // Hide splash screen after content is ready
    SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});

    // Back button handling (Android)
    const backHandler = App.addListener("backButton", ({ canGoBack }) => {
      if (!canGoBack) {
        App.exitApp();
      } else {
        window.history.back();
      }
    });

    return () => {
      backHandler.then((h) => h.remove());
    };
  }, []);
}
