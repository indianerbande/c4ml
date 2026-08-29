import { describe, expect, it } from "vitest";

import {
  c4mlSyntaxThemePresets,
  c4mlSyntaxTokenRoles,
  resolveC4mlSyntaxTheme,
} from "../src/app/syntax-theme.js";

describe("C4ML syntax-theme contract", () => {
  it("defines five stable presets over the complete semantic role set", () => {
    expect(c4mlSyntaxThemePresets).toEqual([
      "balanced",
      "minimal",
      "vivid",
      "high-contrast",
      "color-safe",
    ]);

    for (const preset of c4mlSyntaxThemePresets) {
      for (const scheme of ["light", "dark"] as const) {
        const theme = resolveC4mlSyntaxTheme(preset, scheme, "#096D87");
        expect(Object.keys(theme.roles)).toEqual(c4mlSyntaxTokenRoles);
        for (const role of c4mlSyntaxTokenRoles) {
          expect(theme.roles[role].foreground).toMatch(/^#[0-9A-F]{6}$/u);
        }
      }
    }
  });

  it("uses the selected workbench family only for the declaration accent", () => {
    const blue = resolveC4mlSyntaxTheme("balanced", "light", "#096D87");
    const orange = resolveC4mlSyntaxTheme("balanced", "light", "#8C4D0E");

    expect(blue.roles.declaration.foreground).toBe("#096D87");
    expect(orange.roles.declaration.foreground).toBe("#8C4D0E");
    for (const role of c4mlSyntaxTokenRoles.filter(
      (candidate) => candidate !== "declaration",
    )) {
      expect(blue.roles[role]).toEqual(orange.roles[role]);
    }
  });

  it("keeps the minimal preset restrained and the high-contrast preset redundant", () => {
    const minimal = resolveC4mlSyntaxTheme("minimal", "light", "#096D87");
    const minimalColors = new Set(
      c4mlSyntaxTokenRoles.map((role) => minimal.roles[role].foreground),
    );
    expect(minimalColors.size).toBeLessThanOrEqual(6);
    expect(minimal.roles.comment.fontStyle).toBe("italic");
    expect(minimal.roles.declaration.fontStyle).toBe("bold");

    const highContrast = resolveC4mlSyntaxTheme(
      "high-contrast",
      "dark",
      "#7DD8E6",
    );
    expect(highContrast.roles.declaration.fontStyle).toContain("underline");
    expect(highContrast.roles.property.fontStyle).toBe("bold");
  });

  it("does not rely on red-versus-green encoding in the color-safe preset", () => {
    const colorSafe = resolveC4mlSyntaxTheme("color-safe", "light", "#096D87");
    const semanticColors = c4mlSyntaxTokenRoles.map(
      (role) => colorSafe.roles[role].foreground,
    );

    expect(semanticColors).not.toContain("#FF0000");
    expect(semanticColors).not.toContain("#008000");
    expect(colorSafe.roles.value.fontStyle).toBe("bold");
    expect(colorSafe.roles.comment.fontStyle).toBe("italic");
  });
});
