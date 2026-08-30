import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const styles = await readFile(
  new URL("../src/app/app.component.css", import.meta.url),
  "utf8",
);
const template = await readFile(
  new URL("../src/app/app.component.html", import.meta.url),
  "utf8",
);

describe("Problems panel", () => {
  it("stacks diagnostics in one readable column", () => {
    const diagnosticsListRule = styles.match(/\.diagnostics ol\s*\{([^}]*)\}/u)?.[1];

    expect(diagnosticsListRule).toBeDefined();
    expect(diagnosticsListRule).toMatch(/grid-template-columns:\s*1fr/u);
    expect(diagnosticsListRule).not.toContain("auto-fill");
  });

  it("uses Problems itself as the open and close control", () => {
    expect(template).not.toContain('class="panel-close"');
    expect(template).toContain(
      `[attr.aria-pressed]="bottomPanelOpen() && bottomPanel() === 'problems'"`,
    );
    expect(template).toContain(`(click)="showBottomPanel('problems')"`);
  });

  it("labels the status action by its destination instead of the active view", () => {
    const statusBar = template.match(
      /<footer class="status-bar">[\s\S]*?<\/footer>/u,
    )?.[0];
    expect(statusBar).toContain(`i18n.t("status.diagrams")`);
    expect(statusBar).not.toContain("activeViewTitle()");
  });
});
