import { describe, expect, it } from "vitest";

import {
  c4mlDaySuggestionColors,
  c4mlNightSuggestionColors,
  type MonacoColorTheme,
} from "../src/app/monaco-theme.js";

const foregroundPairs = [
  ["editorSuggestWidget.foreground", "editorSuggestWidget.background"],
  [
    "editorSuggestWidget.selectedForeground",
    "editorSuggestWidget.selectedBackground",
  ],
  [
    "editorSuggestWidget.highlightForeground",
    "editorSuggestWidget.background",
  ],
] as const;

describe("Monaco suggestion themes", () => {
  for (const [name, colors] of [
    ["day", c4mlDaySuggestionColors],
    ["night", c4mlNightSuggestionColors],
  ] as const) {
    it(`${name} defines readable normal, highlighted, and selected text`, () => {
      for (const [foreground, background] of foregroundPairs) {
        expect(colors[foreground]).toMatch(/^#[0-9A-F]{6}$/u);
        expect(colors[background]).toMatch(/^#[0-9A-F]{6}$/u);
        expect(contrast(colors, foreground, background)).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    });

    it(`${name} explicitly controls selected icons and keyboard focus`, () => {
      expect(colors["editorSuggestWidget.selectedIconForeground"]).toBeDefined();
      expect(colors["list.focusOutline"]).toBeDefined();
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
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}
