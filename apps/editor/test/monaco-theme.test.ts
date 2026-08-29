import { describe, expect, it } from "vitest";

import {
  c4mlMonacoThemeName,
  c4mlMonacoThemes,
  type MonacoColorTheme,
} from "../src/app/monaco-theme.js";
import { workbenchColorPalettes } from "../src/app/workbench-preferences.js";
import { c4mlSyntaxThemePresets } from "../src/app/syntax-theme.js";

const foregroundPairs = [
  ["editorSuggestWidget.foreground", "editorSuggestWidget.background"],
  [
    "editorSuggestWidget.selectedForeground",
    "editorSuggestWidget.selectedBackground",
  ],
  ["editorSuggestWidget.highlightForeground", "editorSuggestWidget.background"],
] as const;

describe("Monaco suggestion themes", () => {
  it("defines every syntax preset for every light and dark color family", () => {
    expect(c4mlMonacoThemes.map(({ name }) => name)).toEqual(
      workbenchColorPalettes.flatMap((palette) =>
        c4mlSyntaxThemePresets.flatMap((syntaxTheme) => [
          c4mlMonacoThemeName("light", palette, syntaxTheme),
          c4mlMonacoThemeName("dark", palette, syntaxTheme),
        ]),
      ),
    );
    expect(c4mlMonacoThemes).toHaveLength(80);
  });

  for (const theme of c4mlMonacoThemes) {
    it(`${theme.name} keeps suggestions and syntax readable`, () => {
      const colors = theme.colors;
      for (const [foreground, background] of foregroundPairs) {
        expect(colors[foreground]).toMatch(/^#[0-9A-F]{6}$/u);
        expect(colors[background]).toMatch(/^#[0-9A-F]{6}$/u);
        expect(contrast(colors, foreground, background)).toBeGreaterThanOrEqual(
          4.5,
        );
      }
      expect(
        colors["editorSuggestWidget.selectedIconForeground"],
      ).toBeDefined();
      expect(colors["list.focusOutline"]).toBeDefined();

      const syntaxKinds = [
        "comment",
        "declaration",
        "property",
        "value",
        "keyword",
        "number",
        "operator",
        "string",
        "variable",
      ];
      expect(theme.rules.map(({ token }) => token)).toEqual(syntaxKinds);
      for (const rule of theme.rules) {
        expect(`#${rule.foreground}`).toMatch(/^#[0-9A-F]{6}$/u);
        expect(
          contrastValues(
            `#${rule.foreground}`,
            requiredColor(colors, "editor.background"),
          ),
        ).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

function contrast(
  colors: MonacoColorTheme,
  foreground: string,
  background: string,
): number {
  const lighter = Math.max(
    luminance(requiredColor(colors, foreground)),
    luminance(requiredColor(colors, background)),
  );
  const darker = Math.min(
    luminance(requiredColor(colors, foreground)),
    luminance(requiredColor(colors, background)),
  );
  return (lighter + 0.05) / (darker + 0.05);
}

function contrastValues(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function requiredColor(colors: MonacoColorTheme, key: string): string {
  const color = colors[key];
  if (color === undefined) {
    throw new Error(`Missing Monaco theme color: ${key}`);
  }
  return color;
}

function luminance(color: string): number {
  const channels = color
    .slice(1)
    .match(/.{2}/gu)
    ?.map((channel) => Number.parseInt(channel, 16) / 255);
  if (channels === undefined || channels.length !== 3) {
    throw new Error(`Unsupported color: ${color}`);
  }
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}
