import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const template = await readFile(
  new URL("../src/app/route-editor.component.html", import.meta.url),
  "utf8",
);
const rootTemplate = await readFile(
  new URL("../src/app/app.component.html", import.meta.url),
  "utf8",
);

describe("graphical route editor", () => {
  it("offers graphical Port choice and bounded guidance operations", () => {
    expect(template).toContain('class="port-compass"');
    expect(template).toContain("setPort($any(role), 'north')");
    expect(template).toContain("setPort($any(role), 'east')");
    expect(template).toContain("setPort($any(role), 'south')");
    expect(template).toContain("setPort($any(role), 'west')");
    expect(template).toContain('<option value="add-waypoint">');
    expect(template).toContain('<option value="label-offset">');
    expect(template).toContain("setLabelOffset('x', $event)");
    expect(template).toContain("setLabelOffset('y', $event)");
    expect(template).toContain('<option value="move-waypoint"');
    expect(template).toContain('<option value="remove-waypoint"');
    expect(template).toContain('<option value="clear-guidance">');
  });

  it("shows repairs and blocking diagnostics before applying source", () => {
    expect(template).toContain('i18n.t("routeEditor.safeRepairs")');
    expect(template).toContain('i18n.t("routeEditor.conflicts")');
    expect(template).toContain("issue.correction");
    expect(template).toContain('i18n.t("routeEditor.authority")');
  });

  it("opens from the selected Route and exposes one-step undo", () => {
    expect(rootTemplate).toContain('(click)="openRouteEditor()"');
    expect(rootTemplate).toContain("<c4ml-route-editor");
    expect(rootTemplate).toContain('(applied)="applyRoute($event)"');
    expect(rootTemplate).toContain('(click)="undoRoute()"');
  });
});
