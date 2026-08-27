import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  resolveSceneTheme,
  sceneElementRoles,
  sceneThemePresetIds,
  type SceneElementColors,
} from "../src/index.js";

describe("scene themes", () => {
  it("ships original accessible presets with semantic element roles", () => {
    expect(sceneThemePresetIds).toEqual(["c4ml-blue", "c4ml-garden"]);

    for (const preset of sceneThemePresetIds) {
      const theme = resolveSceneTheme(preset);
      expect(theme.id).toBe(preset);
      expect(contrastRatio(theme.canvas.foreground, theme.canvas.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(theme.canvas.muted, theme.canvas.background)).toBeGreaterThanOrEqual(4.5);

      for (const role of sceneElementRoles) {
        expectTextContrast(theme.elements[role].internal);
        expectTextContrast(theme.elements[role].external);
      }
      for (const boundary of Object.values(theme.boundaries)) {
        expect(contrastRatio(boundary.title, boundary.fill)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(boundary.metadata, boundary.fill)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("deeply overrides one semantic token without changing its preset", () => {
    const custom = resolveSceneTheme({
      id: "orchid-night",
      preset: "c4ml-blue",
      elements: {
        container: {
          internal: {
            fill: "#3B1F5A",
            border: "#241138",
            accent: "#D1A7F0",
          },
        },
      },
      routes: { guided: "#4A235A" },
    });
    const original = resolveSceneTheme("c4ml-blue");

    expect(custom.id).toBe("orchid-night");
    expect(custom.elements.container.internal.fill).toBe("#3B1F5A");
    expect(custom.elements.container.internal.title).toBe(
      original.elements.container.internal.title,
    );
    expect(custom.elements.component).toEqual(original.elements.component);
    expect(custom.routes.guided).toBe("#4A235A");
    expect(original.elements.container.internal.fill).toBe("#2B6F9F");
  });

  it("rejects unknown presets and malformed color tokens", () => {
    expect(() => resolveSceneTheme("not-a-theme")).toThrow(
      expect.objectContaining({ code: "C4ML-THEME-001" }),
    );
    expect(() =>
      resolveSceneTheme({ canvas: { background: "blue" } }),
    ).toThrow(expect.objectContaining({ code: "C4ML-THEME-003" }));
  });
});

function expectTextContrast(colors: SceneElementColors): void {
  for (const textColor of [colors.title, colors.metadata, colors.description]) {
    expect(contrastRatio(textColor, colors.fill)).toBeGreaterThanOrEqual(4.5);
  }
}
