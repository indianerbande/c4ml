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
const globalStyles = await readFile(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);

describe("Problems panel", () => {
  it("stacks diagnostics in one readable column", () => {
    const diagnosticsListRule = styles.match(/\.diagnostics ol\s*\{([^}]*)\}/u)?.[1];

    expect(diagnosticsListRule).toBeDefined();
    expect(diagnosticsListRule).toMatch(/grid-template-columns:\s*1fr/u);
    expect(diagnosticsListRule).not.toContain("auto-fill");
  });

  it("keeps diagnostics inset from every panel edge", () => {
    const diagnosticsRule = styles.match(/\.diagnostics\s*\{([^}]*)\}/u)?.[1];

    expect(diagnosticsRule).toBeDefined();
    expect(diagnosticsRule).toMatch(/box-sizing:\s*border-box/u);
    expect(diagnosticsRule).toMatch(/padding:\s*8px/u);
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
    expect(statusBar).not.toContain(`i18n.t("status.diagrams")`);
    expect(statusBar).not.toContain("activeViewTitle()");
  });

  it("keeps the status bar at the same interface size as tabs", () => {
    const statusBarRule = styles.match(/\.status-bar\s*\{([^}]*)\}/u)?.[1];
    expect(statusBarRule).toMatch(/font-size:\s*1rem/u);
  });

  it("keeps compiler health in the status bar with subtle theme-aware dividers", () => {
    const titleBar = template.match(
      /<header class="title-bar">[\s\S]*?<\/header>/u,
    )?.[0];
    const statusBar = template.match(
      /<footer class="status-bar">[\s\S]*?<\/footer>/u,
    )?.[0];
    const dividerRule = styles.match(
      /\.status-divider\s*\{([^}]*)\}/u,
    )?.[1];

    expect(titleBar).not.toContain("workerStatusPhase()");
    expect(titleBar).not.toContain("statusLabel()");
    expect(statusBar).toContain('class="compiler-status"');
    expect(statusBar).toContain("workerStatusPhase()");
    expect(statusBar).toContain("statusLabel()");
    expect(statusBar?.match(/class="status-divider"/gu)).toHaveLength(3);
    expect(dividerRule).toMatch(/width:\s*1px/u);
    expect(dividerRule).toMatch(/height:\s*12px/u);
    expect(dividerRule).toContain("var(--status-divider)");
    expect(globalStyles).toContain("--status-divider: rgba(0, 0, 0, 0.25)");
    expect(globalStyles).toContain("--status-divider: rgba(255, 255, 255, 0.25)");
  });

  it("disables contextual authoring actions when they have no valid target", () => {
    expect(template).toContain('[disabled]="!canEditArchitecture()"');
    expect(template).toContain('[disabled]="!canStartWizard()"');
  });
});
