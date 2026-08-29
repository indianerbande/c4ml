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
  desktopBridgeProtocolVersion,
  desktopIpcChannels,
  isDesktopDocumentState,
  isDesktopPngExportRequest,
  isDesktopSaveRequest,
  isDesktopUiLanguage,
  maxDesktopSourceBytes,
  maxDesktopSvgBytes,
  type DesktopCommand,
  type DesktopDocumentState,
  type DesktopOpenResult,
  type DesktopOpenProjectResult,
  type DesktopOperationFailure,
  type DesktopPngExportResult,
  type DesktopSaveResult,
  type DesktopUiLanguage,
} from "@c4ml/desktop-contract";
import { ibmPlexSansFamily } from "@c4ml/font-ibm-plex";
import { ResvgPngRenderer } from "@c4ml/render-resvg";
import { loadArchitectureProject } from "@c4ml/project-node";

import {
  DesktopDocumentRegistry,
  ensureC4mlExtension,
  safeSuggestedSourceName,
} from "./document-registry.js";
import {
  ensurePngExtension,
  resolveDesktopPngFontFiles,
  safeSuggestedPngName,
} from "./diagram-export.js";
import { desktopMessage } from "./desktop-localization.js";
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
const pngRenderer = new ResvgPngRenderer();

let mainWindow: BrowserWindow | undefined;
let uiLanguage: DesktopUiLanguage = "en";
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
  ipcMain.removeHandler(desktopIpcChannels.exportPng);
  ipcMain.removeHandler(desktopIpcChannels.openDocument);
  ipcMain.removeHandler(desktopIpcChannels.openProject);
  ipcMain.removeHandler(desktopIpcChannels.saveDocument);
  ipcMain.removeAllListeners(desktopIpcChannels.setUiLanguage);
  ipcMain.handle(
    desktopIpcChannels.exportPng,
    async (event, value: unknown): Promise<DesktopPngExportResult> => {
      if (!isTrustedSender(event) || !isDesktopPngExportRequest(value)) {
        return invalidIpcResult();
      }
      if (Buffer.byteLength(value.svg, "utf8") > maxDesktopSvgBytes) {
        return {
          status: "failed",
          code: "C4ML-DESKTOP-EXPORT-001",
          message: desktopMessage(uiLanguage, "error.svgTooLarge"),
        };
      }

      const owner = BrowserWindow.fromWebContents(event.sender);
      const options = {
        title: desktopMessage(uiLanguage, "dialog.exportPng"),
        defaultPath: safeSuggestedPngName(value.suggestedName),
        filters: [
          {
            name: desktopMessage(uiLanguage, "filter.png"),
            extensions: ["png"],
          },
        ],
      };
      const selection =
        owner === null
          ? await dialog.showSaveDialog(options)
          : await dialog.showSaveDialog(owner, options);
      if (selection.canceled || selection.filePath === undefined) {
        return { status: "canceled" };
      }

      let image: {
        readonly bytes: Uint8Array;
        readonly width: number;
        readonly height: number;
      };
      try {
        image = await pngRenderer.render(value.svg, {
          scale: value.scale,
          fontFiles: resolveDesktopPngFontFiles({
            appPath: app.getAppPath(),
            packaged: app.isPackaged,
            resourcesPath: process.resourcesPath,
          }),
          loadSystemFonts: false,
          defaultFontFamily: ibmPlexSansFamily,
        });
      } catch {
        return {
          status: "failed",
          code: "C4ML-DESKTOP-EXPORT-001",
          message: desktopMessage(uiLanguage, "error.pngRender"),
        };
      }

      const targetPath = ensurePngExtension(selection.filePath);
      try {
        await writeFile(targetPath, image.bytes, { mode: 0o600 });
        return {
          status: "exported",
          displayName: basename(targetPath),
          width: image.width,
          height: image.height,
        };
      } catch {
        return {
          status: "failed",
          code: "C4ML-DESKTOP-EXPORT-002",
          message: desktopMessage(uiLanguage, "error.pngSave"),
        };
      }
    },
  );
  ipcMain.handle(
    desktopIpcChannels.openDocument,
    async (event): Promise<DesktopOpenResult> => {
      if (!isTrustedSender(event)) {
        return invalidIpcResult();
      }
      const owner = BrowserWindow.fromWebContents(event.sender);
      const options = {
        title: desktopMessage(uiLanguage, "dialog.open"),
        properties: ["openFile" as const],
        filters: [
          {
            name: desktopMessage(uiLanguage, "filter.c4ml"),
            extensions: ["c4ml"],
          },
          {
            name: desktopMessage(uiLanguage, "filter.all"),
            extensions: ["*"],
          },
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
            message: desktopMessage(uiLanguage, "error.sourceUnreadable"),
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
    desktopIpcChannels.openProject,
    async (event): Promise<DesktopOpenProjectResult> => {
      if (!isTrustedSender(event)) {
        return invalidIpcResult();
      }
      const owner = BrowserWindow.fromWebContents(event.sender);
      const options = {
        title: desktopMessage(uiLanguage, "dialog.openProject"),
        properties: ["openDirectory" as const],
      };
      const selection =
        owner === null
          ? await dialog.showOpenDialog(options)
          : await dialog.showOpenDialog(owner, options);
      const path = selection.filePaths[0];
      if (selection.canceled || path === undefined) {
        return { status: "canceled" };
      }
      const loaded = await loadArchitectureProject(path);
      if (!loaded.valid) {
        return {
          status: "failed",
          code: "C4ML-DESKTOP-FILE-001",
          message: `${loaded.code}: ${loaded.message}`,
        };
      }
      if (
        loaded.project.documents.some(
          ({ text }) => Buffer.byteLength(text, "utf8") > maxDesktopSourceBytes,
        )
      ) {
        return {
          status: "failed",
          code: "C4ML-DESKTOP-FILE-001",
          message: desktopMessage(uiLanguage, "error.projectUnreadable"),
        };
      }
      const pathByUri = new Map(
        loaded.documentPaths.map(({ uri, path: documentPath }) => [uri, documentPath]),
      );
      return {
        status: "opened",
        project: {
          id: loaded.project.id,
          ...(loaded.project.name === undefined
            ? {}
            : { name: loaded.project.name }),
          ...(loaded.project.description === undefined
            ? {}
            : { description: loaded.project.description }),
          documents: loaded.project.documents.map(({ uri, text }) => {
            const documentPath = pathByUri.get(uri)!;
            return {
              handle: documents.register(documentPath),
              uri,
              displayName: basename(documentPath),
              source: text,
            };
          }),
        },
      };
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
          message: desktopMessage(uiLanguage, "error.sourceTooLarge"),
        };
      }

      const existingPath = documents.resolve(value.handle);
      let targetPath = value.mode === "save" ? existingPath : undefined;
      if (targetPath === undefined) {
        const owner = BrowserWindow.fromWebContents(event.sender);
        const options = {
          title: desktopMessage(uiLanguage, "dialog.save"),
          defaultPath: safeSuggestedSourceName(value.suggestedName),
          filters: [
            {
              name: desktopMessage(uiLanguage, "filter.c4ml"),
              extensions: ["c4ml"],
            },
          ],
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
          message: desktopMessage(uiLanguage, "error.sourceSave"),
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
  ipcMain.on(desktopIpcChannels.setUiLanguage, (event, value: unknown) => {
    if (!isTrustedSender(event) || !isDesktopUiLanguage(value)) {
      return;
    }
    if (uiLanguage !== value) {
      uiLanguage = value;
      installApplicationMenu();
    }
  });
}

function isTrustedSender(event: IpcMainEvent | IpcMainInvokeEvent): boolean {
  return event.senderFrame?.url === trustedEditorUrl;
}

function invalidIpcResult(): DesktopOperationFailure {
  return {
    status: "failed",
    code: "C4ML-DESKTOP-IPC-001",
    message: desktopMessage(uiLanguage, "error.ipc"),
  };
}

function fileReadFailure(): DesktopOperationFailure {
  return {
    status: "failed",
    code: "C4ML-DESKTOP-FILE-001",
    message: desktopMessage(uiLanguage, "error.sourceRead"),
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
                {
                  label: desktopMessage(uiLanguage, "menu.about"),
                  role: "about" as const,
                },
                { type: "separator" as const },
                {
                  label: desktopMessage(uiLanguage, "menu.settings"),
                  accelerator: "CmdOrCtrl+,",
                  click: () => send("open-settings"),
                },
                { type: "separator" as const },
                {
                  label: desktopMessage(uiLanguage, "menu.services"),
                  role: "services" as const,
                },
                { type: "separator" as const },
                {
                  label: desktopMessage(uiLanguage, "menu.hide"),
                  role: "hide" as const,
                },
                {
                  label: desktopMessage(uiLanguage, "menu.hideOthers"),
                  role: "hideOthers" as const,
                },
                {
                  label: desktopMessage(uiLanguage, "menu.showAll"),
                  role: "unhide" as const,
                },
                { type: "separator" as const },
                {
                  label: desktopMessage(uiLanguage, "menu.quit"),
                  role: "quit" as const,
                },
              ],
            },
          ]
        : []),
      {
        label: desktopMessage(uiLanguage, "menu.file"),
        submenu: [
          {
            label: desktopMessage(uiLanguage, "menu.open"),
            accelerator: "CmdOrCtrl+O",
            click: () => send("open-document"),
          },
          {
            label: desktopMessage(uiLanguage, "menu.openProject"),
            accelerator: "CmdOrCtrl+Alt+O",
            click: () => send("open-project"),
          },
          {
            label: desktopMessage(uiLanguage, "menu.save"),
            accelerator: "CmdOrCtrl+S",
            click: () => send("save-document"),
          },
          {
            label: desktopMessage(uiLanguage, "menu.saveAll"),
            accelerator: "CmdOrCtrl+Alt+S",
            click: () => send("save-all-documents"),
          },
          {
            label: desktopMessage(uiLanguage, "menu.saveAs"),
            accelerator: "CmdOrCtrl+Shift+S",
            click: () => send("save-as-document"),
          },
          { type: "separator" },
          {
            label: desktopMessage(uiLanguage, "menu.exportPng"),
            accelerator: "CmdOrCtrl+Alt+P",
            click: () => send("export-png"),
          },
          ...(process.platform === "darwin"
            ? []
            : [
                { type: "separator" as const },
                {
                  label: desktopMessage(uiLanguage, "menu.settings"),
                  accelerator: "CmdOrCtrl+,",
                  click: () => send("open-settings"),
                },
                { type: "separator" as const },
                {
                  label: desktopMessage(uiLanguage, "menu.quit"),
                  role: "quit" as const,
                },
              ]),
        ],
      },
      {
        label: desktopMessage(uiLanguage, "menu.edit"),
        submenu: [
          { label: desktopMessage(uiLanguage, "menu.undo"), role: "undo" },
          { label: desktopMessage(uiLanguage, "menu.redo"), role: "redo" },
          { type: "separator" },
          { label: desktopMessage(uiLanguage, "menu.cut"), role: "cut" },
          { label: desktopMessage(uiLanguage, "menu.copy"), role: "copy" },
          { label: desktopMessage(uiLanguage, "menu.paste"), role: "paste" },
          ...(process.platform === "darwin"
            ? [
                {
                  label: desktopMessage(uiLanguage, "menu.pasteMatch"),
                  role: "pasteAndMatchStyle" as const,
                },
              ]
            : []),
          { label: desktopMessage(uiLanguage, "menu.delete"), role: "delete" },
          { type: "separator" },
          {
            label: desktopMessage(uiLanguage, "menu.selectAll"),
            role: "selectAll",
          },
        ],
      },
      {
        label: desktopMessage(uiLanguage, "menu.view"),
        submenu: [
          { label: desktopMessage(uiLanguage, "menu.reload"), role: "reload" },
          {
            label: desktopMessage(uiLanguage, "menu.forceReload"),
            role: "forceReload",
          },
          {
            label: desktopMessage(uiLanguage, "menu.devTools"),
            role: "toggleDevTools",
          },
          { type: "separator" },
          {
            label: desktopMessage(uiLanguage, "menu.resetZoom"),
            role: "resetZoom",
          },
          { label: desktopMessage(uiLanguage, "menu.zoomIn"), role: "zoomIn" },
          {
            label: desktopMessage(uiLanguage, "menu.zoomOut"),
            role: "zoomOut",
          },
          { type: "separator" },
          {
            label: desktopMessage(uiLanguage, "menu.fullscreen"),
            role: "togglefullscreen",
          },
        ],
      },
      {
        label: desktopMessage(uiLanguage, "menu.window"),
        submenu: [
          {
            label: desktopMessage(uiLanguage, "menu.minimize"),
            role: "minimize",
          },
          ...(process.platform === "darwin"
            ? [
                {
                  label: desktopMessage(uiLanguage, "menu.zoom"),
                  role: "zoom" as const,
                },
                { type: "separator" as const },
                {
                  label: desktopMessage(uiLanguage, "menu.front"),
                  role: "front" as const,
                },
              ]
            : [
                {
                  label: desktopMessage(uiLanguage, "menu.close"),
                  role: "close" as const,
                },
              ]),
        ],
      },
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
        title: desktopMessage(uiLanguage, "close.title"),
        message: desktopMessage(uiLanguage, "close.message", {
          name: state.displayName,
        }),
        detail: desktopMessage(uiLanguage, "close.detail"),
        buttons: [
          desktopMessage(uiLanguage, "close.cancel"),
          desktopMessage(uiLanguage, "close.discard"),
        ],
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
      document.querySelector('button[data-activity="export"]')?.click();
      const check = () => {
        const bridgeReady = window.c4mlDesktop?.protocolVersion === ${desktopBridgeProtocolVersion} &&
          typeof window.c4mlDesktop?.exportPng === 'function' &&
          typeof window.c4mlDesktop?.openProject === 'function' &&
          typeof window.c4mlDesktop?.setUiLanguage === 'function';
        const editorReady = document.querySelector('.source-editor-host') !== null;
        const previewReady = document.querySelector('.diagram') !== null;
        const pngExportReady = document.querySelector('.png-export-button') !== null;
        const compilerReady = document.querySelector('.worker-state[data-phase="valid"]') !== null;
        const fontsReady = document.fonts.check('14px "IBM Plex Sans"') &&
          document.fonts.check('14px "IBM Plex Mono"');
        const language = document.documentElement.lang;
        const languageReady = language === 'en' || language === 'de';
        if (bridgeReady && editorReady && previewReady && pngExportReady && compilerReady && fontsReady && languageReady) {
          resolve({ ok: true, title: document.title, language });
        } else if (Date.now() >= deadline) {
          resolve({ ok: false, bridgeReady, editorReady, previewReady, pngExportReady, compilerReady, fontsReady, languageReady, language });
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    })`,
    true,
  )) as { readonly ok?: boolean };
  let pngReady = false;
  if (result.ok === true) {
    try {
      const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" viewBox="0 0 64 32">',
        '<rect width="64" height="32" fill="#ffffff"/>',
        '<text x="4" y="21" font-family="IBM Plex Sans" font-size="12">C4ML</text>',
        "</svg>",
      ].join("");
      const png = await pngRenderer.render(svg, {
        scale: 2,
        fontFiles: resolveDesktopPngFontFiles({
          appPath: app.getAppPath(),
          packaged: app.isPackaged,
          resourcesPath: process.resourcesPath,
        }),
        loadSystemFonts: false,
        defaultFontFamily: ibmPlexSansFamily,
      });
      pngReady =
        png.width > 0 &&
        png.height > 0 &&
        png.bytes[0] === 0x89 &&
        png.bytes[1] === 0x50 &&
        png.bytes[2] === 0x4e &&
        png.bytes[3] === 0x47;
    } catch (error) {
      console.error("C4ML desktop PNG smoke render failed.", error);
      pngReady = false;
    }
  }
  const smokeResult = { ...result, pngReady };
  console.log(`C4ML_DESKTOP_SMOKE ${JSON.stringify(smokeResult)}`);
  app.exit(result.ok === true && pngReady ? 0 : 1);
}
