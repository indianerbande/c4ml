import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const template = await readFile(
  new URL("../src/app/app.component.html", import.meta.url),
  "utf8",
);

describe("Source Control workbench area", () => {
  it("places Source Control with the primary work areas and Help above Settings", () => {
    const files = template.indexOf('data-activity="files"');
    const sourceControl = template.indexOf('data-activity="source-control"');
    const diagrams = template.indexOf('data-activity="diagrams"');
    const output = template.indexOf('data-activity="export"');
    const spacer = template.indexOf('class="activity-spacer"');
    const help = template.indexOf('data-activity="help"');
    const settings = template.indexOf("#settingsButton");

    expect(files).toBeLessThan(sourceControl);
    expect(sourceControl).toBeLessThan(diagrams);
    expect(diagrams).toBeLessThan(output);
    expect(output).toBeLessThan(spacer);
    expect(spacer).toBeLessThan(help);
    expect(help).toBeLessThan(settings);
  });

  it("provides explicit staging, commit, refresh, and push controls", () => {
    expect(template).toContain('(click)="sourceControl.refresh()"');
    expect(template).toContain('(click)="sourceControl.stage(change)"');
    expect(template).toContain('(click)="sourceControl.unstage(change)"');
    expect(template).toContain('(click)="sourceControl.commit()"');
    expect(template).toContain('(click)="sourceControl.push()"');
    expect(template).toContain("projectDirty() ||");
  });
});
