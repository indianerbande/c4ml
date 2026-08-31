import { describe, expect, it } from "vitest";

import { parseArchitectureThemeResource } from "../src/index.js";

describe("portable project theme resource", () => {
  it("resolves a preset with deep semantic token overrides", () => {
    const result = parseArchitectureThemeResource(JSON.stringify({
      version: 1,
      id: "garden-review",
      preset: "c4ml-garden",
      canvas: { background: "#F2F7EE" },
      routes: { automatic: "#356859" },
    }));
    expect(result).toMatchObject({
      valid: true,
      theme: {
        resolved: {
          id: "garden-review",
          canvas: { background: "#F2F7EE" },
          routes: { automatic: "#356859" },
        },
      },
    });
  });

  it("rejects invalid presets, colors, and unknown top-level properties", () => {
    for (const value of [
      { version: 1, id: "bad", preset: "unknown" },
      { version: 1, id: "bad", canvas: { background: "red" } },
      { version: 1, id: "bad", script: "alert(1)" },
    ]) {
      expect(parseArchitectureThemeResource(JSON.stringify(value))).toMatchObject({
        valid: false,
        error: { code: "C4ML-THEME-RESOURCE-001" },
      });
    }
  });
});
