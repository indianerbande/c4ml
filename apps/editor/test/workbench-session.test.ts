import { describe, expect, it } from "vitest";

import {
  defaultWorkbenchSession,
  loadWorkbenchSession,
  normalizePreviewZoom,
  parseWorkbenchSession,
  storeWorkbenchSession,
} from "../src/app/workbench-session.js";

describe("workbench session", () => {
  it("uses non-document defaults when no session exists", () => {
    expect(parseWorkbenchSession(null)).toEqual(defaultWorkbenchSession);
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
        source: "must not survive",
        path: "/private/model.c4ml",
      }),
    );

    expect(parsed).toEqual({
      version: 1,
      activeActivity: "diagrams",
      bottomPanel: "route",
      bottomPanelOpen: false,
      previewZoom: 1.6,
      routingDebugEnabled: false,
    });
    expect(parsed).not.toHaveProperty("source");
    expect(parsed).not.toHaveProperty("path");
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
        }),
      ),
    ).toEqual({
      ...defaultWorkbenchSession,
      previewZoom: 2.5,
    });
    expect(parseWorkbenchSession('{"version":2}')).toEqual(
      defaultWorkbenchSession,
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
