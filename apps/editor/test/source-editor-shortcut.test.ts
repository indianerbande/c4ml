import { describe, expect, it } from "vitest";

import { sourceEditorSuggestionShortcut } from "../src/app/source-editor-shortcut.js";

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
});
