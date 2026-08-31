import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const appSource = new URL("../src/app/", import.meta.url);
const template = await readFile(
  new URL("semantic-editor.component.html", appSource),
  "utf8",
);
const styles = await readFile(
  new URL("semantic-editor.component.css", appSource),
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
    expect(template).toContain('"connectionEditor.architectureWarning"');
    expect(template).toContain('"semanticEditor.architectureWarning"');
    expect(messages).toContain("This changes architecture meaning");
    expect(messages).toContain("Dies ändert die Bedeutung der Architektur");
    expect(rootTemplate).toContain('(click)="openSemanticEditor()"');
    expect(rootTemplate).toContain('(click)="openConnectionEditor()"');
    expect(template).toContain('@if (mode() === "element")');
    expect(template).not.toContain('selectOperation($event)');
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
    expect(template).toContain('"semanticEditor.sourceChange"');
    expect(template).toContain('"connectionEditor.sourceChange"');
    expect(template).toContain('i18n.t("semanticEditor.conflicts")');
    expect(template).toContain('[disabled]="!canApply()"');
    expect(rootTemplate).toContain('(click)="openSemanticEditor()"');
    expect(rootTemplate).toContain("<c4ml-semantic-editor");
    expect(rootTemplate).toContain('(applied)="applySemantic($event)"');
    expect(rootTemplate).toContain('(click)="undoSemantic()"');
  });

  it("offers a directed diagram picker without creating hidden semantic state", () => {
    expect(template).toContain('(click)="requestDiagramSelection()"');
    expect(template).toContain('(click)="swapDirection()"');
    expect(template).toContain('[selected]="element.id === sourceId()"');
    expect(template).toContain('[selected]="element.id === targetId()"');
    expect(rootTemplate).toContain('[class.is-connection-picking]="semanticEditor.picking()"');
    expect(rootTemplate).toContain('i18n.t("connectionPicker.source")');
    expect(rootTemplate).toContain('i18n.t("connectionPicker.target"');
    expect(rootTemplate).toContain('(selectionRequested)="startConnectionPicking($event)"');
    expect(messages).toContain("von der Quelle zum Ziel");
    expect(messages).toContain("from source to target");
  });

  it("contains every operation form inside its column", () => {
    expect(styles).toContain(".semantic-editor .placement-form { overflow-x: hidden; overflow-y: auto; }");
    expect(styles).toContain("grid-template-columns: repeat(2, minmax(0, 1fr));");
    expect(styles).toContain("max-width: 100%;");
    expect(styles).toContain(".semantic-editor .placement-form textarea { resize: vertical; }");
  });
});
