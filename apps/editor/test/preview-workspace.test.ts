import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const mainTemplate = await readFile(
  new URL("../src/app/app.component.html", import.meta.url),
  "utf8",
);
const previewTemplate = await readFile(
  new URL("../src/app/detached-preview.component.html", import.meta.url),
  "utf8",
);
const bootstrap = await readFile(
  new URL("../src/main.ts", import.meta.url),
  "utf8",
);
const globalStyles = await readFile(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);
const mainStyles = await readFile(
  new URL("../src/app/app.component.css", import.meta.url),
  "utf8",
);
const previewStyles = await readFile(
  new URL("../src/app/detached-preview.component.css", import.meta.url),
  "utf8",
);

describe("preview workspace boundaries", () => {
  it("keeps focus, detach, and redock actions in the main workbench", () => {
    expect(mainTemplate).toContain('data-preview-action="focus"');
    expect(mainTemplate).toContain('data-preview-action="detach"');
    expect(mainTemplate).toContain('data-preview-action="redock"');
  });

  it("bootstraps the detached preview without the workbench root", () => {
    expect(bootstrap).toContain('searchParams.get("mode") === "preview"');
    expect(bootstrap).toContain('import("./app/detached-preview.component.js")');
    expect(previewTemplate).toContain("preview-stage");
    expect(previewTemplate).not.toContain("source-editor");
    expect(previewTemplate).not.toContain("workbench");
  });

  it("uses the canonical blue-theme canvas in main and detached previews", () => {
    expect(globalStyles).toContain("--preview-stage: #f5f8fb;");
    expect(globalStyles.match(/--preview-stage:/gu)).toHaveLength(1);
    expect(globalStyles).not.toContain("--preview-grid-dot");

    for (const styles of [mainStyles, previewStyles]) {
      expect(styles).toContain("background-color: var(--preview-stage);");
      expect(styles).not.toContain("background-image: radial-gradient");
      expect(styles).not.toContain("filter: drop-shadow");
    }
  });
});
