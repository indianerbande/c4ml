import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  net,
  protocol,
  screen,
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
  previewIpcChannels,
  isDesktopDocumentState,
  isDesktopOpenPreviewRequest,
  isDesktopPngExportRequest,
  isDesktopSvgExportRequest,
  isDesktopPreviewInteraction,
  isDesktopPreviewProjection,
  isDesktopSaveRequest,
  isDesktopSourceControlRequest,
  isDesktopUiLanguage,
  maxDesktopSourceBytes,
  maxDesktopSvgBytes,
  type DesktopCommand,
  type DesktopDocumentState,
  type DesktopOpenResult,
  type DesktopOpenProjectResult,
  type DesktopOpenPreviewResult,
  type DesktopOperationFailure,
  type DesktopPngExportResult,
  type DesktopSvgExportResult,
  type DesktopPreviewProjection,
  type DesktopPreviewWindowBounds,
  type DesktopSaveResult,
  type DesktopSourceControlRequest,
  type DesktopSourceControlResult,
  type DesktopUiLanguage,
} from "@c4ml/desktop-contract";
import { ibmPlexSansFamily } from "@c4ml/font-ibm-plex";
import { ResvgPngRenderer } from "@c4ml/render-resvg";
import {
  commitGitWorkingTreeChanges,
  loadArchitectureProject,
  pushGitWorkingTreeBranch,
  readGitWorkingTreeStatus,
  stageAllGitWorkingTreeChanges,
  stageGitWorkingTreePaths,
  unstageAllGitWorkingTreeChanges,
  unstageGitWorkingTreePaths,
} from "@c4ml/project-node";

import {
  DesktopDocumentRegistry,
  ensureC4mlExtension,
  safeSuggestedSourceName,
} from "./document-registry.js";
import {
  DesktopExternalDocumentQueue,
  externalC4mlDocumentPaths,
} from "./external-document-open.js";
import {
  ensurePngExtension,
  ensureSvgExtension,
  resolveDesktopPngFontFiles,
  safeSuggestedPngName,
  safeSuggestedSvgName,
} from "./diagram-export.js";
import { desktopMessage } from "./desktop-localization.js";
import {
  editorEntryUrl,
  editorProtocolScheme,
  resolveEditorAssetPath,
} from "./editor-protocol.js";
import { createDesktopWebPreferences } from "./window-options.js";
import {
  DesktopPreviewProjectionSequence,
  normalizePreviewWindowBounds,
} from "./preview-window.js";

const applicationId = "org.c4ml.desktop";
const productName = "C4thedral";
const legacyUserDataDirectoryName = "C4ML";
const smokeArgument = "--c4ml-smoke";
// The packaged smoke may name a project directory; Open Project then uses it
// instead of the native dialog so the multi-document authoring path can be
// exercised without a person at the keyboard.
const smokeProjectArgumentPrefix = "--c4ml-smoke-project=";
const smokeProjectPath = process.argv.includes(smokeArgument)
  ? process.argv
      .find((argument) => argument.startsWith(smokeProjectArgumentPrefix))
      ?.slice(smokeProjectArgumentPrefix.length)
  : undefined;
const currentDirectory = __dirname;
const preloadPath = join(currentDirectory, "preload.cjs");
const previewPreloadPath = join(currentDirectory, "preview-preload.cjs");
const documents = new DesktopDocumentRegistry();
const externalDocuments = new DesktopExternalDocumentQueue();
const documentStates = new WeakMap<BrowserWindow, DesktopDocumentState>();
const pngRenderer = new ResvgPngRenderer();

let mainWindow: BrowserWindow | undefined;
let previewWindow: BrowserWindow | undefined;
let latestPreviewProjection: DesktopPreviewProjection | undefined;
const previewProjectionSequence = new DesktopPreviewProjectionSequence();
let uiLanguage: DesktopUiLanguage = "en";
const trustedEditorUrl = editorEntryUrl;
const trustedPreviewUrl = `${editorEntryUrl}?mode=preview`;

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

app.on("open-file", (event, path) => {
  event.preventDefault();
  enqueueExternalDocuments([path], process.cwd());
  focusMainWindow();
});

if (electronSquirrelStartup) {
  app.quit();
} else if (!app.requestSingleInstanceLock()) {
  if (process.argv.includes(smokeArgument)) {
    // A smoke that silently hands its arguments to an already running
    // instance would report nothing and exit 0; make that a visible failure.
    console.log(
      `C4ML_DESKTOP_SMOKE ${JSON.stringify({ ok: false, reason: "another C4thedral instance is running; quit it and rerun the smoke" })}`,
    );
    app.exit(1);
  } else {
    app.quit();
  }
} else {
  app.on("second-instance", (_event, commandLine, workingDirectory) => {
    enqueueExternalDocuments(commandLine, workingDirectory);
    focusMainWindow();
  });
  enqueueExternalDocuments(process.argv, process.cwd());
  void startDesktopApplication();
}

async function startDesktopApplication(): Promise<void> {
  // Keep the established application-data directory so the product rename
  // does not strand local workbench settings or safe presentation state.
  app.setPath(
    "userData",
    join(app.getPath("appData"), legacyUserDataDirectoryName),
  );
  app.setName(productName);
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
    title: productName,
    webPreferences: createDesktopWebPreferences(preloadPath),
  });
  mainWindow = window;
  documentStates.set(window, {
    displayName: productName,
    dirty: false,
    hasOpenDocument: false,
    projectMode: false,
  });

  protectWindowNavigation(window, trustedEditorUrl);
  protectUnsavedDocument(window);
  window.once("ready-to-show", () => window.show());
  window.on("closed", () => {
    if (mainWindow === window) {
      mainWindow = undefined;
      previewWindow?.close();
    }
  });

  try {
    await window.loadURL(editorEntryUrl);
    notifyPendingDocument();
    if (process.argv.includes(smokeArgument)) {
      await runDesktopSmoke(window);
    }
  } catch (error) {
    console.error("C4thedral desktop failed to load its bundled editor.", error);
    if (process.argv.includes(smokeArgument)) {
      app.exit(1);
    }
  }
}

function enqueueExternalDocuments(
  commandLine: readonly string[],
  workingDirectory: string,
): void {
  const paths = externalC4mlDocumentPaths(commandLine, workingDirectory);
  if (paths.length === 0) return;
  externalDocuments.enqueue(paths);
  if (app.isReady() && (mainWindow === undefined || mainWindow.isDestroyed())) {
    void createMainWindow();
    return;
  }
  notifyPendingDocument();
}

function notifyPendingDocument(): void {
  const window = mainWindow;
  if (
    !externalDocuments.pending ||
    window === undefined ||
    window.isDestroyed() ||
    window.webContents.isLoading()
  ) {
    return;
  }
  window.webContents.send(
    desktopIpcChannels.command,
    "open-pending-document" satisfies DesktopCommand,
  );
}

function focusMainWindow(): void {
  const window = mainWindow;
  if (window === undefined || window.isDestroyed()) return;
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

async function createPreviewWindow(
  requestedBounds?: DesktopPreviewWindowBounds,
): Promise<BrowserWindow> {
  if (previewWindow !== undefined && !previewWindow.isDestroyed()) {
    previewWindow.show();
    previewWindow.focus();
    return previewWindow;
  }
  const bounds = visiblePreviewBounds(requestedBounds);
  const window = new BrowserWindow({
    ...bounds,
    minWidth: 640,
    minHeight: 480,
    show: false,
    backgroundColor: "#eef3f8",
    title: "C4thedral Preview",
    webPreferences: createDesktopWebPreferences(previewPreloadPath),
  });
  previewWindow = window;
  protectWindowNavigation(window, trustedPreviewUrl);
  let lastBounds = window.getBounds();
  const publishState = (): void => {
    lastBounds = window.getBounds();
    sendPreviewWindowState(true, lastBounds);
  };
  window.on("move", publishState);
  window.on("resize", publishState);
  window.once("ready-to-show", () => {
    window.show();
    publishState();
  });
  window.on("closed", () => {
    if (previewWindow === window) {
      previewWindow = undefined;
      sendPreviewWindowState(false, lastBounds);
    }
  });
  await window.loadURL(trustedPreviewUrl);
  return window;
}

function visiblePreviewBounds(
  requested?: DesktopPreviewWindowBounds,
): DesktopPreviewWindowBounds {
  const display =
    requested?.x === undefined || requested.y === undefined
      ? screen.getPrimaryDisplay()
      : screen.getDisplayMatching({
          x: requested.x,
          y: requested.y,
          width: requested.width,
          height: requested.height,
        });
  const workArea = display.workArea;
  return normalizePreviewWindowBounds(requested, workArea);
}

function sendPreviewWindowState(
  open: boolean,
  bounds: DesktopPreviewWindowBounds,
): void {
  if (mainWindow === undefined || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send(desktopIpcChannels.previewWindowState, {
    open,
    bounds: {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    },
  });
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

function protectWindowNavigation(window: BrowserWindow, trustedUrl: string): void {
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (url !== trustedUrl) {
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
  ipcMain.removeHandler(desktopIpcChannels.claimPendingDocument);
  ipcMain.removeHandler(desktopIpcChannels.exportPng);
  ipcMain.removeHandler(desktopIpcChannels.exportSvg);
  ipcMain.removeHandler(desktopIpcChannels.openDocument);
  ipcMain.removeHandler(desktopIpcChannels.openProject);
  ipcMain.removeHandler(desktopIpcChannels.openPreviewWindow);
  ipcMain.removeHandler(desktopIpcChannels.previewWindowState);
  ipcMain.removeHandler(previewIpcChannels.projection);
  ipcMain.removeHandler(desktopIpcChannels.saveDocument);
  ipcMain.removeHandler(desktopIpcChannels.sourceControl);
  ipcMain.removeAllListeners(desktopIpcChannels.closePreviewWindow);
  ipcMain.removeAllListeners(previewIpcChannels.interaction);
  ipcMain.removeAllListeners(previewIpcChannels.projectionChanged);
  ipcMain.removeAllListeners(desktopIpcChannels.setUiLanguage);
  ipcMain.handle(
    desktopIpcChannels.claimPendingDocument,
    async (event): Promise<DesktopOpenResult | undefined> => {
      if (!isTrustedSender(event)) {
        return invalidIpcResult();
      }
      const path = externalDocuments.take();
      if (path === undefined) return undefined;
      // Several documents may arrive in one Open With gesture. The renderer
      // claims one at a time, so announce the next one once this claim has
      // been delivered instead of leaving it in the queue until some later,
      // unrelated external open happens to flush it.
      if (externalDocuments.pending) {
        setImmediate(notifyPendingDocument);
      }
      return openDesktopDocument(path);
    },
  );
  ipcMain.handle(
    desktopIpcChannels.openPreviewWindow,
    async (event, value: unknown): Promise<DesktopOpenPreviewResult> => {
      const trusted = isTrustedSender(event);
      const valid = isDesktopOpenPreviewRequest(value);
      if (!trusted || !valid) {
        console.error(
          `C4ML preview-window request rejected (trusted=${trusted}, valid=${valid}).`,
        );
        return invalidIpcResult();
      }
      latestPreviewProjection = previewProjectionSequence.accept(
        value.projection,
      );
      try {
        const window = await createPreviewWindow(value.bounds);
        window.webContents.send(
          previewIpcChannels.projectionChanged,
          latestPreviewProjection,
        );
        return { status: "opened" };
      } catch (error) {
        console.error("C4ML preview window failed to open.", error);
        return invalidIpcResult();
      }
    },
  );
  ipcMain.handle(desktopIpcChannels.previewWindowState, (event) => {
    if (!isTrustedSender(event)) {
      return { open: false, bounds: undefined };
    }
    const window = previewWindow;
    return window === undefined || window.isDestroyed()
      ? { open: false, bounds: undefined }
      : { open: true, bounds: window.getBounds() };
  });
  ipcMain.handle(previewIpcChannels.projection, (event) => {
    return isTrustedPreviewSender(event) ? latestPreviewProjection : undefined;
  });
  ipcMain.on(desktopIpcChannels.closePreviewWindow, (event) => {
    if (isTrustedSender(event)) {
      previewWindow?.close();
    }
  });
  ipcMain.on(
    previewIpcChannels.projectionChanged,
    (event, value: unknown) => {
      if (!isTrustedSender(event) || !isDesktopPreviewProjection(value)) {
        return;
      }
      latestPreviewProjection = previewProjectionSequence.accept(value);
      if (previewWindow !== undefined && !previewWindow.isDestroyed()) {
        previewWindow.webContents.send(
          previewIpcChannels.projectionChanged,
          latestPreviewProjection,
        );
      }
    },
  );
  ipcMain.on(
    previewIpcChannels.interaction,
    (event, value: unknown) => {
      if (!isTrustedPreviewSender(event) || !isDesktopPreviewInteraction(value)) {
        return;
      }
      if (mainWindow !== undefined && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(previewIpcChannels.interaction, value);
      }
      if (value.type === "redock") {
        previewWindow?.close();
      }
    },
  );
  ipcMain.handle(
    desktopIpcChannels.exportSvg,
    async (event, value: unknown): Promise<DesktopSvgExportResult> => {
      if (!isTrustedSender(event) || !isDesktopSvgExportRequest(value)) {
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
        title: desktopMessage(uiLanguage, "dialog.exportSvg"),
        defaultPath: safeSuggestedSvgName(value.suggestedName),
        filters: [
          {
            name: desktopMessage(uiLanguage, "filter.svg"),
            extensions: ["svg"],
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

      const targetPath = ensureSvgExtension(selection.filePath);
      try {
        await writeFile(targetPath, value.svg, {
          encoding: "utf8",
          mode: 0o600,
        });
        return {
          status: "exported",
          displayName: basename(targetPath),
        };
      } catch {
        return {
          status: "failed",
          code: "C4ML-DESKTOP-EXPORT-002",
          message: desktopMessage(uiLanguage, "error.svgSave"),
        };
      }
    },
  );
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
      return openDesktopDocument(path);
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
        smokeProjectPath !== undefined
          ? { canceled: false, filePaths: [smokeProjectPath] }
          : owner === null
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
        ) ||
        (loaded.project.policy !== undefined &&
          Buffer.byteLength(loaded.project.policy.source, "utf8") >
            maxDesktopSourceBytes) ||
        (loaded.project.observations !== undefined &&
          Buffer.byteLength(loaded.project.observations.source, "utf8") >
            maxDesktopSourceBytes) ||
        (loaded.project.glossary !== undefined &&
          Buffer.byteLength(loaded.project.glossary.source, "utf8") >
            maxDesktopSourceBytes) ||
        (loaded.project.narratives ?? []).some((resource) =>
          Buffer.byteLength(resource.source, "utf8") > maxDesktopSourceBytes
        ) ||
        (loaded.project.narratives ?? []).reduce(
          (total, resource) => total + Buffer.byteLength(resource.source, "utf8"),
          0,
        ) > maxDesktopSourceBytes ||
        (loaded.project.publication !== undefined &&
          Buffer.byteLength(loaded.project.publication.source, "utf8") > maxDesktopSourceBytes) ||
        (loaded.project.theme !== undefined &&
          Buffer.byteLength(loaded.project.theme.source, "utf8") > maxDesktopSourceBytes) ||
        (loaded.project.shapes !== undefined &&
          Buffer.byteLength(loaded.project.shapes.source, "utf8") > maxDesktopSourceBytes) ||
        (loaded.project.assets !== undefined &&
          (Buffer.byteLength(loaded.project.assets.source, "utf8") +
            loaded.project.assets.files.reduce((total, file) => total + Buffer.byteLength(file.content, "utf8"), 0)) > maxDesktopSourceBytes)
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
          ...(loaded.project.policy === undefined
            ? {}
            : {
                policy: {
                  uri: loaded.project.policy.uri,
                  source: loaded.project.policy.source,
                },
              }),
          ...(loaded.project.observations === undefined
            ? {}
            : {
                observations: {
                  uri: loaded.project.observations.uri,
                  source: loaded.project.observations.source,
                },
              }),
          ...(loaded.project.glossary === undefined
            ? {}
            : {
                glossary: {
                  uri: loaded.project.glossary.uri,
                  source: loaded.project.glossary.source,
                },
              }),
          ...(loaded.project.narratives === undefined
            ? {}
            : { narratives: loaded.project.narratives.map((resource) => ({ ...resource })) }),
          ...(loaded.project.publication === undefined
            ? {}
            : { publication: { ...loaded.project.publication } }),
          ...(loaded.project.theme === undefined ? {} : { theme: { ...loaded.project.theme } }),
          ...(loaded.project.shapes === undefined ? {} : { shapes: { ...loaded.project.shapes } }),
          ...(loaded.project.assets === undefined ? {} : { assets: { ...loaded.project.assets, files: loaded.project.assets.files.map((file) => ({ ...file })) } }),
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
  ipcMain.handle(
    desktopIpcChannels.sourceControl,
    async (event, value: unknown): Promise<DesktopSourceControlResult> => {
      if (!isTrustedSender(event) || !isDesktopSourceControlRequest(value)) {
        return invalidIpcResult();
      }
      const path = documents.resolve(value.handle);
      if (path === undefined) {
        return {
          status: "failed",
          code: "C4ML-DESKTOP-GIT-001",
          message: "The selected document handle is no longer available.",
        };
      }
      const result = await performSourceControl(path, value);
      return result.valid
        ? { status: "ok", snapshot: result.value }
        : {
            status: "failed",
            code:
              result.code === "C4ML-GIT-WORKTREE-001"
                ? "C4ML-DESKTOP-GIT-001"
                : "C4ML-DESKTOP-GIT-002",
            message: result.message,
          };
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
      const previousState = documentStates.get(window);
      documentStates.set(window, value);
      window.setTitle(
        value.displayName === productName
          ? productName
          : `${value.displayName}${value.dirty ? " •" : ""} — ${productName}`,
      );
      if (
        previousState?.projectMode !== value.projectMode ||
        previousState?.hasOpenDocument !== value.hasOpenDocument
      ) {
        installApplicationMenu();
      }
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

function performSourceControl(
  path: string,
  request: DesktopSourceControlRequest,
) {
  switch (request.action) {
    case "refresh":
      return readGitWorkingTreeStatus(path);
    case "stage":
      return stageGitWorkingTreePaths(path, request.paths!);
    case "stage-all":
      return stageAllGitWorkingTreeChanges(path);
    case "unstage":
      return unstageGitWorkingTreePaths(path, request.paths!);
    case "unstage-all":
      return unstageAllGitWorkingTreeChanges(path);
    case "commit":
      return commitGitWorkingTreeChanges(path, request.message!);
    case "push":
      return pushGitWorkingTreeBranch(path);
  }
}

function isTrustedSender(event: IpcMainEvent | IpcMainInvokeEvent): boolean {
  return event.senderFrame?.url === trustedEditorUrl;
}

function isTrustedPreviewSender(
  event: IpcMainEvent | IpcMainInvokeEvent,
): boolean {
  return event.senderFrame?.url === trustedPreviewUrl;
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

async function openDesktopDocument(path: string): Promise<DesktopOpenResult> {
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
}

function installApplicationMenu(): void {
  const send = (command: DesktopCommand): void => {
    const window = mainWindow ?? BrowserWindow.getFocusedWindow();
    if (window !== undefined && window !== null && !window.isDestroyed()) {
      window.webContents.send(desktopIpcChannels.command, command);
    }
  };
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(process.platform === "darwin"
        ? [
            {
              label: productName,
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
          {
            label: desktopMessage(
              uiLanguage,
              documentStates.get(mainWindow!)?.projectMode === true
                ? "menu.closeProject"
                : "menu.closeDocument",
            ),
            enabled:
              documentStates.get(mainWindow!)?.hasOpenDocument === true,
            accelerator: "CmdOrCtrl+W",
            click: () => send("close-workspace"),
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
          {
            label: desktopMessage(uiLanguage, "menu.previewFocus"),
            accelerator: "CmdOrCtrl+Shift+Enter",
            click: () => send("toggle-preview-focus"),
          },
          {
            label: desktopMessage(uiLanguage, "menu.previewWindow"),
            click: () => send("open-preview-window"),
          },
          { type: "separator" },
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
  window.setSize(1100, 640);
  window.show();
  window.focus();
  window.webContents.focus();
  const editorInputReady = (await window.webContents.executeJavaScript(
    `new Promise((resolve) => {
      const deadline = Date.now() + 10000;
      const check = () => {
        const input = document.querySelector('.monaco-editor textarea.inputarea');
        if (input instanceof HTMLTextAreaElement) {
          input.focus();
          resolve(true);
        } else if (Date.now() >= deadline) {
          resolve(false);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    })`,
    true,
  )) as boolean;
  if (!editorInputReady) {
    console.log(
      `C4ML_DESKTOP_SMOKE ${JSON.stringify({ ok: false, editorInputReady })}`,
    );
    app.exit(1);
    return;
  }
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  await window.webContents.insertText(`c4ml draft-1

model {
  system smoke-system {
    name = "Smoke System"
    responsibility = "Validates the packaged desktop compiler and preview."
    classification = internal
  }
}

view smoke-context {
  type = system-context
  scope = smoke-system
  title = "System Context — Smoke System"
  purpose = "Validates the packaged desktop compiler and preview."
  audience = default
  legend = generated
}
`);
  const result = (await window.webContents.executeJavaScript(
    `new Promise((resolve) => {
      const deadline = Date.now() + 20000;
      document.querySelector('button[data-activity="export"]')?.click();
      const check = () => {
        const bridgeReady = window.c4mlDesktop?.protocolVersion === ${desktopBridgeProtocolVersion} &&
          typeof window.c4mlDesktop?.exportPng === 'function' &&
          typeof window.c4mlDesktop?.exportSvg === 'function' &&
          typeof window.c4mlDesktop?.claimPendingDocument === 'function' &&
          typeof window.c4mlDesktop?.openDocument === 'function' &&
          typeof window.c4mlDesktop?.openProject === 'function' &&
          typeof window.c4mlDesktop?.openPreviewWindow === 'function' &&
          typeof window.c4mlDesktop?.getPreviewWindowState === 'function' &&
          typeof window.c4mlDesktop?.sourceControl === 'function' &&
          typeof window.c4mlDesktop?.updatePreviewProjection === 'function' &&
          typeof window.c4mlDesktop?.onPreviewInteraction === 'function' &&
          typeof window.c4mlDesktop?.setUiLanguage === 'function';
        const editorReady = document.querySelector('.source-editor-host') !== null;
        const editorDirty = document.querySelector('.dirty-indicator') !== null;
        const previewReady = document.querySelector('.diagram') !== null;
        const pngExportReady = document.querySelector('.png-export-button') !== null;
        if (!pngExportReady) {
          document.querySelector('button[data-activity="export"]')?.click();
        }
        const compilerReady = document.querySelector('.worker-state[data-phase="valid"]') !== null;
        const fontsReady = document.fonts.check('14px "IBM Plex Sans"') &&
          document.fonts.check('14px "IBM Plex Mono"');
        const language = document.documentElement.lang;
        const languageReady = language === 'en' || language === 'de';
        const detachButtonReady = document.querySelector('button[data-preview-action="detach"]') !== null;
        const statusBar = document.querySelector('.status-bar');
        const statusBarBounds = statusBar?.getBoundingClientRect();
        const viewportReady = document.documentElement.scrollHeight <= document.documentElement.clientHeight &&
          document.body.scrollHeight <= document.body.clientHeight &&
          statusBarBounds !== undefined &&
          statusBarBounds.bottom <= window.innerHeight + 0.5 &&
          statusBarBounds.right <= window.innerWidth + 0.5;
        if (bridgeReady && editorReady && previewReady && pngExportReady && compilerReady && fontsReady && languageReady && detachButtonReady && viewportReady) {
          resolve({ ok: true, title: document.title, language, detachButtonReady, viewportReady, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight });
        } else if (Date.now() >= deadline) {
          resolve({ ok: false, bridgeReady, editorReady, editorDirty, previewReady, pngExportReady, compilerReady, fontsReady, languageReady, detachButtonReady, viewportReady, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight, documentScrollHeight: document.documentElement.scrollHeight, bodyScrollHeight: document.body.scrollHeight, language });
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    })`,
    true,
  )) as { readonly ok?: boolean };
  let detachedPreviewReady = false;
  if (result.ok === true) {
    await window.webContents.executeJavaScript(
      `document.querySelector('button[data-preview-action="detach"]')?.click()`,
      true,
    );
    const detachedWindow = await waitForDetachedPreviewWindow();
    if (detachedWindow !== undefined) {
      detachedPreviewReady = (await detachedWindow.webContents.executeJavaScript(
        `new Promise((resolve) => {
          const deadline = Date.now() + 10000;
          const check = () => {
            const bridgeReady = window.c4mlPreview?.protocolVersion === ${desktopBridgeProtocolVersion} &&
              typeof window.c4mlPreview?.requestProjection === 'function' &&
              window.c4mlDesktop === undefined;
            const shellReady = document.querySelector('.detached-preview-shell') !== null;
            const previewReady = document.querySelector('.diagram') !== null;
            const sourceAbsent = document.querySelector('.source-editor-host') === null;
            if (bridgeReady && shellReady && previewReady && sourceAbsent) {
              resolve(true);
            } else if (Date.now() >= deadline) {
              resolve(false);
            } else {
              setTimeout(check, 100);
            }
          };
          check();
        })`,
        true,
      )) as boolean;
      detachedWindow.close();
    }
  }
  let pngReady = false;
  if (result.ok === true) {
    try {
      const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" viewBox="0 0 64 32">',
        '<rect width="64" height="32" fill="#ffffff"/>',
        '<text x="4" y="21" font-family="IBM Plex Sans" font-size="12">C4thedral</text>',
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
      console.error("C4thedral desktop PNG smoke render failed.", error);
      pngReady = false;
    }
  }
  let authoring: DesktopAuthoringSmokeResult | undefined;
  if (result.ok === true && smokeProjectPath !== undefined) {
    authoring = await runMultiDocumentAuthoringSmoke(window);
  }
  const smokeResult = { ...result, detachedPreviewReady, pngReady, authoring };
  console.log(`C4ML_DESKTOP_SMOKE ${JSON.stringify(smokeResult)}`);
  app.exit(
    result.ok === true &&
      detachedPreviewReady &&
      pngReady &&
      (authoring === undefined || authoring.ok)
      ? 0
      : 1,
  );
}

interface DesktopAuthoringSmokeResult {
  readonly ok: boolean;
  readonly [step: string]: boolean | string | undefined;
}

const smokeStepHelpers = `
  const wait = (predicate, timeout = 15000) => new Promise((settle) => {
    const deadline = Date.now() + timeout;
    const check = () => {
      let value;
      try { value = predicate(); } catch { value = undefined; }
      if (value) settle(value);
      else if (Date.now() >= deadline) settle(undefined);
      else setTimeout(check, 100);
    };
    check();
  });
  const documentTabs = () => [...document.querySelectorAll('.editor-tab[title]')];
  const activeDocument = () => documentTabs().find((tab) => tab.classList.contains('is-active'))?.title;
  const dirtyDocuments = () => documentTabs().filter((tab) => tab.querySelector('.dirty-indicator') !== null).map((tab) => tab.title);
  const compiled = () => document.querySelector('.worker-state[data-phase="valid"]') !== null;
  const undoButton = () => document.querySelector('.title-actions .title-action:not(.architecture-action):not(.connection-action)');
  const editorText = () => document.querySelector('.monaco-editor .view-lines')?.textContent ?? '';
`;

/**
 * Drives the real workbench through the multi-document authoring path that
 * unit tests cannot reach: the Monaco model swap happens in Angular's next
 * change-detection tick, and the compiler runs in a Web Worker.
 *
 * Opens the smoke project, selects an element through the source editor,
 * applies a placement change whose edit belongs to a document other than
 * the active one, checks that only that document became dirty and was
 * presented, switches back, undoes from the other tab, and finally reveals
 * a finding declared in another document from the Output area.
 */
async function runMultiDocumentAuthoringSmoke(
  window: BrowserWindow,
): Promise<DesktopAuthoringSmokeResult> {
  const steps: Record<string, boolean | string | undefined> = {};
  const run = async (script: string): Promise<Record<string, boolean | string | undefined>> =>
    (await window.webContents.executeJavaScript(
      `new Promise(async (resolve) => { const steps = {}; ${smokeStepHelpers} ${script} resolve(steps); })`,
      true,
    )) as Record<string, boolean | string | undefined>;
  const pause = (milliseconds: number): Promise<void> =>
    new Promise((settle) => setTimeout(settle, milliseconds));
  const key = async (keyCode: string, modifiers: string[] = []): Promise<void> => {
    window.webContents.sendInputEvent({ type: "keyDown", keyCode, modifiers } as never);
    window.webContents.sendInputEvent({ type: "keyUp", keyCode, modifiers } as never);
    await pause(150);
  };
  const findModifier = process.platform === "darwin" ? "meta" : "control";

  // The scratch document typed earlier is dirty; opening a project would wait
  // for a person to confirm discarding it.
  // The expression's value travels back over IPC and must be cloneable, so
  // the assignment (whose value would be the function) ends in a boolean.
  await window.webContents.executeJavaScript(
    `(window.confirm = () => true, true);`,
    true,
  );
  window.webContents.send(
    desktopIpcChannels.command,
    "open-project" satisfies DesktopCommand,
  );
  Object.assign(steps, await run(`
    steps.projectOpened = (await wait(() => documentTabs().length === 3 && activeDocument() === 'model/systems.c4ml')) !== undefined;
    steps.projectCompiled = (await wait(() => compiled() && document.querySelector('img.diagram') !== null, 30000)) !== undefined;
    document.querySelector('.monaco-editor textarea.inputarea')?.focus();
  `));

  // Select the element through Monaco's find widget: the cursor lands on the
  // declaration, and the workbench selects the matching preview node.
  await key("F", [findModifier]);
  await window.webContents.insertText("system sensor-post");
  await pause(300);
  await key("Escape");
  Object.assign(steps, await run(`
    // The find match moves the cursor onto the declaration; the workbench
    // answers by selecting the preview node, which makes the geometry tab
    // appear. That tab is the observable proof of the selection.
    document.querySelector('.status-bar button[aria-pressed]')?.click();
    const geometryTab = await wait(() => [...document.querySelectorAll('.bottom-panel .panel-tabs button')][1]);
    steps.elementSelectedFromSource = geometryTab !== undefined;
    steps.selectedElementLabel = document.querySelector('.geometry-inspector strong')?.textContent?.trim() ?? document.querySelector('.selection-note')?.textContent?.trim() ?? '';
    geometryTab?.click();
    steps.geometryInspectorOpen = (await wait(() => document.querySelector('.geometry-inspector .inspector-source'))) !== undefined;
    document.querySelector('.geometry-inspector .inspector-source')?.click();
    steps.placementEditorOpen = (await wait(() => document.querySelector('.placement-editor select'))) !== undefined;
    const operation = document.querySelector('.placement-editor select');
    if (operation instanceof HTMLSelectElement) {
      operation.value = 'nudge';
      operation.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const previewButton = await wait(() => {
      const button = document.querySelector('.placement-editor .preview-button');
      return button instanceof HTMLButtonElement && !button.disabled ? button : undefined;
    });
    previewButton?.click();
    const applyButton = await wait(() => {
      const button = document.querySelector('.placement-editor .apply-button');
      return button instanceof HTMLButtonElement && !button.disabled ? button : undefined;
    }, 30000);
    steps.placementPreviewed = applyButton !== undefined;
    steps.modelActiveBeforeApply = activeDocument() === 'model/systems.c4ml';
    applyButton?.click();
    steps.editLandedInViewDocument = (await wait(() =>
      document.querySelector('.placement-editor') === null &&
      activeDocument() === 'views/context.c4ml' &&
      undoButton() !== null,
    )) !== undefined;
    steps.onlyViewDocumentDirty = JSON.stringify(dirtyDocuments()) === JSON.stringify(['views/context.c4ml']);
    steps.recompiledAfterEdit = (await wait(() => compiled(), 30000)) !== undefined;
    documentTabs().find((tab) => tab.title === 'model/systems.c4ml')?.click();
    steps.switchedAwayBeforeUndo = (await wait(() => activeDocument() === 'model/systems.c4ml')) !== undefined;
    undoButton()?.click();
    steps.undoRestoredViewDocument = (await wait(() =>
      activeDocument() === 'views/context.c4ml' &&
      dirtyDocuments().length === 0 &&
      undoButton() === null,
    )) !== undefined;
    steps.recompiledAfterUndo = (await wait(() => compiled(), 30000)) !== undefined;
    // Cross-document reveal: the Output area lists a policy finding located in
    // the model document while the view document is active.
    document.querySelector('button[data-activity="export"]')?.click();
    const finding = await wait(() => [...document.querySelectorAll('.quality-findings button')].find((button) => !button.disabled));
    steps.findingListed = finding !== undefined;
    finding?.click();
    steps.crossDocumentRevealed = (await wait(() =>
      activeDocument() === 'model/systems.c4ml' && editorText().includes('garden-pulse'),
    )) !== undefined;
  `));
  // Strings are diagnostics for the reader; only boolean steps decide.
  const ok = Object.values(steps).every(
    (value) => typeof value !== "boolean" || value,
  );
  return { ...steps, ok };
}

async function waitForDetachedPreviewWindow(): Promise<BrowserWindow | undefined> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (previewWindow !== undefined && !previewWindow.isDestroyed()) {
      return previewWindow;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  return undefined;
}
