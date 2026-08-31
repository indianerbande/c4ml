import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const appSource = new URL("../src/app/", import.meta.url);

describe("wizard undo feedback", () => {
  it("keeps the one-step restoration contextual and confirmed", async () => {
    const [template, component, styles] = await Promise.all([
      readFile(new URL("app.component.html", appSource), "utf8"),
      readFile(new URL("app.component.ts", appSource), "utf8"),
      readFile(new URL("app.component.css", appSource), "utf8"),
    ]);

    expect(template).toContain('class="wizard-undo-notice"');
    expect(template).toContain('(click)="requestUndoWizard()"');
    expect(template).toContain('role="alertdialog"');
    expect(template).toContain('(click)="confirmUndoWizard()"');
    expect(template).not.toMatch(
      /class="title-action"[^>]*\(click\)="undoWizard\(\)"/u,
    );
    expect(component).toContain("this.wizardUndoConfirmationOpen.set(false)");
    expect(component).toContain("onWizardUndoConfirmationKeydown");
    expect(styles).toContain(".wizard-undo-notice");
    expect(styles).toContain(".confirmation-dialog");
  });
});
