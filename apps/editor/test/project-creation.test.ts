// @vitest-environment happy-dom
import "@angular/compiler";
import { provideZonelessChangeDetection, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { BrowserTestingModule, platformBrowserTesting } from "@angular/platform-browser/testing";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { desktopBridgeProtocolVersion, type DesktopOpenProjectResult } from "@c4ml/desktop-contract";
import { WorkbenchDocumentFacade } from "../src/app/workbench-document.facade.js";
import { WorkbenchLocalizationService } from "../src/app/workbench-localization.js";
import { WorkbenchPreferencesService } from "../src/app/workbench-preferences.service.js";

beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); vi.restoreAllMocks(); Reflect.deleteProperty(window, "confirm"); });
afterAll(() => TestBed.resetTestEnvironment());

function setup(result: DesktopOpenProjectResult) {
  window.confirm = vi.fn(() => true);
  const createProject = vi.fn(async () => result);
  const noop = () => undefined;
  vi.stubGlobal("c4mlDesktop", {
    protocolVersion: desktopBridgeProtocolVersion, platform: "win32",
    createProject, openProject: noop, openDocument: noop, claimPendingDocument: noop,
    exportPng: noop, exportSvg: noop, openPreviewWindow: noop, getPreviewWindowState: noop,
    closePreviewWindow: noop, updatePreviewProjection: noop, saveDocument: noop,
    sourceControl: noop, setDocumentState: noop, setUiLanguage: noop,
    onCommand: () => noop, onPreviewInteraction: () => noop, onPreviewWindowState: () => noop,
  });
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(),
    { provide: WorkbenchLocalizationService, useValue: { t: (key: string) => key } },
    { provide: WorkbenchPreferencesService, useValue: { uiLanguage: signal("en") } },
  ] });
  const documents = TestBed.inject(WorkbenchDocumentFacade);
  documents.resetAsGeneratedDocument("c4ml draft-1\nmodel {}\n");
  return { documents, createProject };
}

describe("project creation workspace transition", () => {
  it("does not invoke native creation if replacing unsaved work is declined", async () => {
    const { documents, createProject } = setup({ status: "canceled" });
    const before = documents.captureState();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    expect(await documents.openProject({ name: "Garden" })).toBe(false);
    expect(createProject).not.toHaveBeenCalled();
    expect(documents.captureState()).toEqual(before);
  });

  it.each<DesktopOpenProjectResult>([
    { status: "canceled" },
    { status: "failed", code: "C4ML-DESKTOP-PROJECT-001", message: "Already exists" },
  ])("retains the entire workspace on $status", async result => {
    const { documents } = setup(result);
    const before = documents.captureState();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    expect(await documents.openProject({ name: "Garden" })).toBe(false);
    expect(documents.captureState()).toEqual(before);
    if (result.status === "failed") expect(documents.fileOperationLabel()).toContain(result.message);
  });

  it("opens the created source set with clean dirty states and opaque handles", async () => {
    const result: DesktopOpenProjectResult = { status: "opened", project: {
      id: "persisted-project-id", name: "Garden", documents: [
        { uri: "model/architecture.c4ml", displayName: "architecture.c4ml", source: "c4ml draft-1\nmodel {}\n", handle: "opaque-model" },
        { uri: "relations/relationships.c4ml", displayName: "relationships.c4ml", source: "c4ml draft-1\nrelations {}\n", handle: "opaque-relations" },
        { uri: "views/views.c4ml", displayName: "views.c4ml", source: "c4ml draft-1\n", handle: "opaque-views" },
      ],
    } };
    const { documents, createProject } = setup(result);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    expect(await documents.openProject({ name: "Garden" })).toBe(true);
    expect(createProject).toHaveBeenCalledWith({ name: "Garden" });
    expect(documents.projectMode()).toBe(true);
    expect(documents.projectId()).toBe("persisted-project-id");
    expect(documents.projectDirty()).toBe(false);
    expect(documents.activeDocumentUri()).toBe("model/architecture.c4ml");
    expect(documents.projectDocuments()).toEqual(result.project.documents.map(d => ({ ...d, dirty: false })));
  });
});
