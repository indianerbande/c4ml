import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const appSource = new URL("../src/app/", import.meta.url);
const template = await readFile(
  new URL("semantic-editor.component.html", appSource),
  "utf8",
);
const rootTemplate = await readFile(
  new URL("app.component.html", appSource),
  "utf8",
);
const messages = await readFile(
  new URL("workbench-messages.ts", appSource),
  "utf8",
);

describe("semantic graphical authoring", () => {
  it("separates architecture changes from placement and routing controls", () => {
    expect(template).toContain('i18n.t("semanticEditor.architectureWarning")');
    expect(template).toContain('i18n.t("semanticEditor.architectureWarningText")');
    expect(messages).toContain("This changes architecture meaning");
    expect(messages).toContain("Dies ändert die Bedeutung der Architektur");
    expect(template).toContain('<option value="create-element"');
    expect(template).toContain('<option value="create-relationship"');
    expect(template).not.toContain('<option value="pin"');
    expect(template).not.toContain("source-port");
  });

  it("uses familiar questions while retaining stable C4-owned source identities", () => {
    expect(template).toContain('i18n.t("semanticEditor.name")');
    expect(template).toContain('i18n.t("semanticEditor.responsibility")');
    expect(template).toContain('i18n.t("semanticEditor.from")');
    expect(template).toContain('i18n.t("semanticEditor.to")');
    expect(template).toContain('i18n.t("semanticEditor.connectionIntent")');
    expect(template).toContain('i18n.t("semanticEditor.stableId")');
    expect(template).toContain("selectedCreateAction()?.ownerLabel");
    expect(template).toContain('i18n.t("semanticEditor.contextVisibilityHint")');
  });

  it("previews worker-owned source and supports one explicit undo", () => {
    expect(template).toContain("buildPreview()");
    expect(template).toContain('i18n.t("semanticEditor.sourceChange")');
    expect(template).toContain('i18n.t("semanticEditor.conflicts")');
    expect(template).toContain('[disabled]="!canApply()"');
    expect(rootTemplate).toContain('(click)="openSemanticEditor()"');
    expect(rootTemplate).toContain("<c4ml-semantic-editor");
    expect(rootTemplate).toContain('(applied)="applySemantic($event)"');
    expect(rootTemplate).toContain('(click)="undoSemantic()"');
  });
});
