import { describe, expect, it } from "vitest";

import {
  dismissSourceEditorSuggestions,
  sourceEditorDismissSuggestionsCommand,
  sourceEditorSuggestionShortcut,
} from "../src/app/source-editor-shortcut.js";

describe("source editor suggestion shortcut", () => {
  it("uses Monaco's unreserved macOS shortcut", () => {
    expect(
      sourceEditorSuggestionShortcut(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      ),
    ).toBe("⌘I");
  });

  it.each([
    ["Windows", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"],
    ["Linux", "Mozilla/5.0 (X11; Linux x86_64)"],
  ])("keeps Ctrl+Space on %s", (_platform, userAgent) => {
    expect(sourceEditorSuggestionShortcut(userAgent)).toBe("Ctrl+Space");
  });

  it("dismisses an open popup through Monaco's registered Suggest command", () => {
    const calls: Array<{
      source: string;
      handlerId: string;
      payload: unknown;
    }> = [];
    const registeredCommands = new Set(["hideSuggestWidget"]);

    expect(() =>
      dismissSourceEditorSuggestions({
        trigger(source, handlerId, payload) {
          if (!registeredCommands.has(handlerId)) {
            throw new Error(`Command '${handlerId}' is not registered.`);
          }
          calls.push({ source, handlerId, payload });
        },
      }),
    ).not.toThrow();

    expect(sourceEditorDismissSuggestionsCommand).toBe("hideSuggestWidget");
    expect(calls).toEqual([
      {
        source: "c4ml.localization",
        handlerId: "hideSuggestWidget",
        payload: undefined,
      },
    ]);
  });

  it("does nothing while the lazy Monaco editor is not ready", () => {
    expect(() => dismissSourceEditorSuggestions(undefined)).not.toThrow();
  });
});
