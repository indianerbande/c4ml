import type { WebPreferences } from "electron";

export function createDesktopWebPreferences(
  preloadPath: string,
): WebPreferences {
  return {
    preload: preloadPath,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    webviewTag: false,
  };
}
