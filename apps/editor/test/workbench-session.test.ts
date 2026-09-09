import { describe, expect, it } from "vitest";

import {
  defaultWorkbenchSession,
  loadWorkbenchSession,
  normalizePreviewWindowBounds,
  normalizePreviewZoom,
  parseWorkbenchSession,
  storeWorkbenchSession,
  toggleWorkbenchPanel,
} from "../src/app/workbench-session.js";

describe("workbench session", () => {
  it("uses non-document defaults when no session exists", () => {
    expect(parseWorkbenchSession(null)).toEqual(defaultWorkbenchSession);
  });

  it("starts in Files while restoring the remaining presentation state", () => {
    const storage = {
      getItem: () =>
        JSON.stringify({
          ...defaultWorkbenchSession,
          activeActivity: "diagrams",
          bottomPanel: "route",
          previewZoom: 1.6,
        }),
      setItem: () => undefined,
    };

    expect(loadWorkbenchSession(storage)).toMatchObject({
      activeActivity: "files",
      bottomPanel: "route",
      previewZoom: 1.6,
    });
  });

  it("does not persist a previously selected activity for the next start", () => {
    let serialized = "";
    const storage = {
      getItem: () => null,
      setItem: (_key: string, value: string) => {
        serialized = value;
      },
    };

    expect(
      storeWorkbenchSession(storage, {
        ...defaultWorkbenchSession,
        activeActivity: "diagrams",
      }),
    ).toBe(true);
    expect(JSON.parse(serialized)).toMatchObject({ activeActivity: "files" });
  });

  it("round-trips only validated presentation state", () => {
    const parsed = parseWorkbenchSession(
      JSON.stringify({
        version: 1,
        activeActivity: "diagrams",
        bottomPanel: "route",
        bottomPanelOpen: false,
        previewZoom: 1.6,
        routingDebugEnabled: false,
        previewWorkspaceMode: "focus",
        previewWindowBounds: { x: 80, y: 120, width: 1280, height: 820 },
        source: "must not survive",
        path: "/private/model.c4ml",
        repositoryPath: "/private/repository",
        beforeRef: "main",
        afterRef: "feature/private-work",
      }),
    );

    expect(parsed).toEqual({
      version: 1,
      activeActivity: "files",
      bottomPanel: "route",
      bottomPanelOpen: false,
      previewZoom: 1.6,
      routingDebugEnabled: false,
      previewWorkspaceMode: "focus",
      previewWindowBounds: { x: 80, y: 120, width: 1280, height: 820 },
    });
    expect(parsed).not.toHaveProperty("source");
    expect(parsed).not.toHaveProperty("path");
    expect(parsed).not.toHaveProperty("repositoryPath");
    expect(parsed).not.toHaveProperty("beforeRef");
    expect(parsed).not.toHaveProperty("afterRef");
  });

  it("does not restore the local Help activity on application start", () => {
    expect(
      parseWorkbenchSession(
        JSON.stringify({
          ...defaultWorkbenchSession,
          activeActivity: "help",
        }),
      ).activeActivity,
    ).toBe("files");
  });

  it("returns to Files without restoring Source Control repository details", () => {
    expect(
      parseWorkbenchSession(
        JSON.stringify({
          ...defaultWorkbenchSession,
          activeActivity: "source-control",
          repositoryPath: "/private/repository",
        }),
      ),
    ).toEqual({
      ...defaultWorkbenchSession,
      activeActivity: "files",
    });
  });

  it("uses the active panel tab as the panel toggle", () => {
    const closed = toggleWorkbenchPanel(defaultWorkbenchSession, "problems");
    expect(closed.bottomPanelOpen).toBe(false);
    const route = toggleWorkbenchPanel(closed, "route");
    expect(route).toMatchObject({ bottomPanel: "route", bottomPanelOpen: true });
    expect(toggleWorkbenchPanel(route, "route").bottomPanelOpen).toBe(false);
  });

  it("rejects unsupported values field by field", () => {
    expect(
      parseWorkbenchSession(
        JSON.stringify({
          version: 1,
          activeActivity: "extensions",
          bottomPanel: "terminal",
          bottomPanelOpen: "yes",
          previewZoom: 99,
          routingDebugEnabled: "yes",
          previewWorkspaceMode: "detached",
          previewWindowBounds: { x: "left", width: 40, height: 99_999 },
        }),
      ),
    ).toEqual({
      ...defaultWorkbenchSession,
      previewZoom: 2.5,
      previewWindowBounds: { width: 640, height: 10_000 },
    });
    expect(parseWorkbenchSession('{"version":2}')).toEqual(
      defaultWorkbenchSession,
    );
  });

  it("normalizes only finite, bounded detached-window geometry", () => {
    expect(
      normalizePreviewWindowBounds({
        x: 20.4,
        y: -12.6,
        width: 1280.2,
        height: 720.8,
      }),
    ).toEqual({ x: 20, y: -13, width: 1280, height: 721 });
    expect(normalizePreviewWindowBounds(null)).toEqual(
      defaultWorkbenchSession.previewWindowBounds,
    );
  });

  it("normalizes zoom to the supported fifth-step range", () => {
    expect(normalizePreviewZoom(0.1)).toBe(0.4);
    expect(normalizePreviewZoom(1.49)).toBe(1.4);
    expect(normalizePreviewZoom(5)).toBe(2.5);
  });

  it("continues when storage is unavailable", () => {
    const unavailable = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    expect(loadWorkbenchSession(unavailable)).toEqual(defaultWorkbenchSession);
    expect(storeWorkbenchSession(unavailable, defaultWorkbenchSession)).toBe(
      false,
    );
  });
});
