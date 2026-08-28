import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  net,
  protocol,
  session,
  type IpcMainEvent,
  type IpcMainInvokeEvent,
} from "electron";
import electronSquirrelStartup from "electron-squirrel-startup";
import { readFile, stat, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  desktopIpcChannels,
  isDesktopDocumentState,
  isDesktopSaveRequest,
  maxDesktopSourceBytes,
  type DesktopCommand,
  type DesktopDocumentState,
  type DesktopOpenResult,
  type DesktopOperationFailure,
  type DesktopSaveResult,
} from "@c4ml/desktop-contract";

import {
  DesktopDocumentRegistry,
  ensureC4mlExtension,
  safeSuggestedSourceName,
} from "./document-registry.js";
import {
  editorEntryUrl,
  editorProtocolScheme,
  resolveEditorAssetPath,
} from "./editor-protocol.js";
import { createDesktopWebPreferences } from "./window-options.js";

const applicationId = "org.c4ml.desktop";
const smokeArgument = "--c4ml-smoke";
const currentDirectory = __dirname;
const preloadPath = join(currentDirectory, "preload.cjs");
const documents = new DesktopDocumentRegistry();
const documentStates = new WeakMap<BrowserWindow, DesktopDocumentState>();

let mainWindow: BrowserWindow | undefined;
const trustedEditorUrl = editorEntryUrl;

protocol.registerSchemesAsPrivileged([
  {
    scheme: editorProtocolScheme,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      codeCache: true,
    },
  },
]);

if (electronSquirrelStartup) {
  app.quit();
} else {
  void startDesktopApplication();
}

async function startDesktopApplication(): Promise<void> {
  app.setName("C4ML");
  if (process.platform === "win32") {
    app.setAppUserModelId(applicationId);
  }

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });

  await app.whenReady();
  registerEditorProtocol();
  denyRendererPermissions();
  registerDesktopIpc();
  installApplicationMenu();
  await createMainWindow();
}

async function createMainWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    show: false,
    backgroundColor: "#eef3f8",
    title: "architecture.c4ml — C4ML",
    webPreferences: createDesktopWebPreferences(preloadPath),
  });
  mainWindow = window;
  documentStates.set(window, {
    displayName: "architecture.c4ml",
    dirty: false,
  });

  protectWindowNavigation(window);
  protectUnsavedDocument(window);
  window.once("ready-to-show", () => window.show());
  window.on("closed", () => {
    if (mainWindow === window) {
      mainWindow = undefined;
    }
  });

  try {
    await window.loadURL(editorEntryUrl);
    if (process.argv.includes(smokeArgument)) {
      await runDesktopSmoke(window);
    }
  } catch (error) {
    console.error("C4ML desktop failed to load its bundled editor.", error);
    if (process.argv.includes(smokeArgument)) {
      app.exit(1);
    }
  }
}

function resolveEditorRoot(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, "browser");
  }
  return resolve(app.getAppPath(), "../../build/editor/browser");
}

function registerEditorProtocol(): void {
  const editorRoot = resolveEditorRoot();
  protocol.handle(editorProtocolScheme, async (request) => {
    const assetPath = resolveEditorAssetPath(editorRoot, request.url);
    if (assetPath === undefined) {
      return new Response(null, { status: 404 });
    }
    try {
      return await net.fetch(pathToFileURL(assetPath).href);
    } catch {
      return new Response(null, { status: 404 });
    }
  });
}

function protectWindowNavigation(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (url !== trustedEditorUrl) {
      event.preventDefault();
    }
  });
}

function denyRendererPermissions(): void {
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => callback(false),
  );
}

function registerDesktopIpc(): void {
  ipcMain.removeHandler(desktopIpcChannels.openDocument);
  ipcMain.removeHandler(desktopIpcChannels.saveDocument);
  ipcMain.handle(
    desktopIpcChannels.openDocument,
    async (event): Promise<DesktopOpenResult> => {
      if (!isTrustedSender(event)) {
        return invalidIpcResult();
      }
      const owner = BrowserWindow.fromWebContents(event.sender);
      const options = {
        title: "Open C4ML source",
        properties: ["openFile" as const],
        filters: [
          { name: "C4ML source", extensions: ["c4ml"] },
          { name: "All files", extensions: ["*"] },
        ],
      };
      const selection =
        owner === null
          ? await dialog.showOpenDialog(options)
          : await dialog.showOpenDialog(owner, options);
      const path = selection.filePaths[0];
      if (selection.canceled || path === undefined) {
        return { status: "canceled" };
      }
      try {
        const metadata = await stat(path);
        if (!metadata.isFile() || metadata.size > maxDesktopSourceBytes) {
          return {
            status: "failed",
            code: "C4ML-DESKTOP-FILE-001",
            message: "The selected source is not a readable C4ML file below 8 MiB.",
          };
        }
        const source = await readFile(path, "utf8");
        return {
          status: "opened",
          document: {
            handle: documents.register(path),
            displayName: basename(path),
            source,
          },
        };
      } catch {
        return fileReadFailure();
      }
    },
  );
  ipcMain.handle(
    desktopIpcChannels.saveDocument,
    async (event, value: unknown): Promise<DesktopSaveResult> => {
      if (!isTrustedSender(event) || !isDesktopSaveRequest(value)) {
        return invalidIpcResult();
      }
      if (Buffer.byteLength(value.source, "utf8") > maxDesktopSourceBytes) {
        return {
          status: "failed",
          code: "C4ML-DESKTOP-FILE-002",
          message: "The C4ML source is larger than the 8 MiB desktop limit.",
        };
      }

      const existingPath = documents.resolve(value.handle);
      let targetPath = value.mode === "save" ? existingPath : undefined;
      if (targetPath === undefined) {
        const owner = BrowserWindow.fromWebContents(event.sender);
        const options = {
          title: "Save C4ML source",
          defaultPath: safeSuggestedSourceName(value.suggestedName),
          filters: [{ name: "C4ML source", extensions: ["c4ml"] }],
        };
        const selection =
          owner === null
            ? await dialog.showSaveDialog(options)
            : await dialog.showSaveDialog(owner, options);
        if (selection.canceled || selection.filePath === undefined) {
          return { status: "canceled" };
        }
        targetPath = ensureC4mlExtension(selection.filePath);
      }

      try {
        await writeFile(targetPath, value.source, {
          encoding: "utf8",
          mode: 0o600,
        });
        const handle =
          value.mode === "save" && existingPath !== undefined && value.handle
            ? value.handle
            : documents.register(targetPath);
        return {
          status: "saved",
          handle,
          displayName: basename(targetPath),
        };
      } catch {
        return {
          status: "failed",
          code: "C4ML-DESKTOP-FILE-002",
          message: "The C4ML source could not be saved at the selected location.",
        };
      }
    },
  );
  ipcMain.on(
    desktopIpcChannels.setDocumentState,
    (event, value: unknown) => {
      if (!isTrustedSender(event) || !isDesktopDocumentState(value)) {
        return;
      }
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window === null) {
        return;
      }
      documentStates.set(window, value);
      window.setTitle(`${value.displayName}${value.dirty ? " •" : ""} — C4ML`);
      if (process.platform === "darwin") {
        window.setDocumentEdited(value.dirty);
        const path = documents.resolve(value.handle);
        window.setRepresentedFilename(path ?? "");
      }
    },
  );
}

function isTrustedSender(event: IpcMainEvent | IpcMainInvokeEvent): boolean {
  return event.senderFrame?.url === trustedEditorUrl;
}

function invalidIpcResult(): DesktopOperationFailure {
  return {
    status: "failed",
    code: "C4ML-DESKTOP-IPC-001",
    message: "The desktop request was rejected by the application boundary.",
  };
}

function fileReadFailure(): DesktopOperationFailure {
  return {
    status: "failed",
    code: "C4ML-DESKTOP-FILE-001",
    message: "The selected C4ML source could not be read.",
  };
}

function installApplicationMenu(): void {
  const send = (command: DesktopCommand): void => {
    const window = BrowserWindow.getFocusedWindow() ?? mainWindow;
    if (window !== undefined && !window.isDestroyed()) {
      window.webContents.send(desktopIpcChannels.command, command);
    }
  };
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(process.platform === "darwin"
        ? [
            {
              label: "C4ML",
              submenu: [
                { role: "about" as const },
                { type: "separator" as const },
                {
                  label: "Settings…",
                  accelerator: "CmdOrCtrl+,",
                  click: () => send("open-settings"),
                },
                { type: "separator" as const },
                { role: "services" as const },
                { type: "separator" as const },
                { role: "hide" as const },
                { role: "hideOthers" as const },
                { role: "unhide" as const },
                { type: "separator" as const },
                { role: "quit" as const },
              ],
            },
          ]
        : []),
      {
        label: "File",
        submenu: [
          {
            label: "Open…",
            accelerator: "CmdOrCtrl+O",
            click: () => send("open-document"),
          },
          {
            label: "Save",
            accelerator: "CmdOrCtrl+S",
            click: () => send("save-document"),
          },
          {
            label: "Save As…",
            accelerator: "CmdOrCtrl+Shift+S",
            click: () => send("save-as-document"),
          },
          ...(process.platform === "darwin"
            ? []
            : [
                { type: "separator" as const },
                {
                  label: "Settings…",
                  accelerator: "CmdOrCtrl+,",
                  click: () => send("open-settings"),
                },
                { type: "separator" as const },
                { role: "quit" as const },
              ]),
        ],
      },
      { role: "editMenu" },
      { role: "viewMenu" },
      { role: "windowMenu" },
    ]),
  );
}

function protectUnsavedDocument(window: BrowserWindow): void {
  let forceClose = false;
  let confirmationOpen = false;
  window.on("close", (event) => {
    const state = documentStates.get(window);
    if (forceClose || state?.dirty !== true) {
      return;
    }
    event.preventDefault();
    if (confirmationOpen) {
      return;
    }
    confirmationOpen = true;
    void dialog
      .showMessageBox(window, {
        type: "warning",
        title: "Unsaved C4ML source",
        message: `Discard changes to ${state.displayName}?`,
        detail: "The source contains changes that have not been saved.",
        buttons: ["Cancel", "Discard changes"],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
      })
      .then(({ response }) => {
        confirmationOpen = false;
        if (response === 1) {
          forceClose = true;
          window.close();
        }
      });
  });
}

async function runDesktopSmoke(window: BrowserWindow): Promise<void> {
  const result = (await window.webContents.executeJavaScript(
    `new Promise((resolve) => {
      const deadline = Date.now() + 20000;
      const check = () => {
        const bridgeReady = window.c4mlDesktop?.protocolVersion === 1;
        const editorReady = document.querySelector('.source-editor-host') !== null;
        const previewReady = document.querySelector('.diagram') !== null;
        const compilerReady = document.querySelector('.worker-state[data-phase="valid"]') !== null;
        const fontsReady = document.fonts.check('14px "IBM Plex Sans"') &&
          document.fonts.check('14px "IBM Plex Mono"');
        if (bridgeReady && editorReady && previewReady && compilerReady && fontsReady) {
          resolve({ ok: true, title: document.title });
        } else if (Date.now() >= deadline) {
          resolve({ ok: false, bridgeReady, editorReady, previewReady, compilerReady, fontsReady });
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    })`,
    true,
  )) as { readonly ok?: boolean };
  console.log(`C4ML_DESKTOP_SMOKE ${JSON.stringify(result)}`);
  app.exit(result.ok === true ? 0 : 1);
}
