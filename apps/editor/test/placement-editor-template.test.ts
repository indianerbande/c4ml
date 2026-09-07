import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const template = await readFile(
  new URL("../src/app/placement-editor.component.html", import.meta.url),
  "utf8",
);
const rootTemplate = await readFile(
  new URL("../src/app/app.component.html", import.meta.url),
  "utf8",
);
const styles = await readFile(
  new URL("../src/app/placement-editor.component.css", import.meta.url),
  "utf8",
);
const messages = await readFile(
  new URL("../src/app/workbench-messages.ts", import.meta.url),
  "utf8",
);

describe("graphical placement editor", () => {
  it("offers intent-first controls and keeps exact pinning as the fallback", () => {
    expect(template).toContain('<option value="relative">');
    expect(template).toContain('<option value="nudge">');
    expect(template).toContain('<option value="align">');
    expect(template).toContain('<option value="distribute">');
    expect(template).toContain('<option value="pin">');
    expect(template.indexOf('<option value="relative">')).toBeLessThan(
      template.indexOf('<option value="pin">'),
    );
    expect(template).toContain('i18n.t("placement.authority")');
  });

  it("opens from selected geometry and applies only the worker proposal", () => {
    expect(rootTemplate).toContain('(click)="openPlacementEditor()"');
    expect(rootTemplate).toContain("<c4ml-placement-editor");
    expect(rootTemplate).toContain('(applied)="applyPlacement($event)"');
    expect(rootTemplate).toContain('(click)="undoAuthoring()"');
    expect(rootTemplate).toContain('(click)="redoAuthoring()"');
  });

  it("identifies layout as a presentation-only change scope", () => {
    expect(template).toContain('class="placement-editor scope-layout"');
    expect(template).toContain('i18n.t("authoringScope.layout.title")');
    expect(template).toContain('i18n.t("authoringScope.layout.description")');
    expect(styles).toContain(".authoring-scope-mark");
    expect(styles).toContain(".scope-layout");
    expect(messages).toContain('"authoringScope.layout.title": "Diagram layout"');
    expect(messages).toContain('"authoringScope.layout.title": "Diagrammlayout"');
  });
});
