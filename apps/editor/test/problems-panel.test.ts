import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const styles = await readFile(
  new URL("../src/app/app.component.css", import.meta.url),
  "utf8",
);

describe("Problems panel", () => {
  it("stacks diagnostics in one readable column", () => {
    const diagnosticsListRule = styles.match(/\.diagnostics ol\s*\{([^}]*)\}/u)?.[1];

    expect(diagnosticsListRule).toBeDefined();
    expect(diagnosticsListRule).toMatch(/grid-template-columns:\s*1fr/u);
    expect(diagnosticsListRule).not.toContain("auto-fill");
  });
});
