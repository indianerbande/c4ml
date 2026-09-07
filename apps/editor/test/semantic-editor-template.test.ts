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
const component = await readFile(
  new URL("semantic-editor.component.ts", appSource),
  "utf8",
);
const rootTemplate = await readFile(
  new URL("app.component.html", appSource),
  "utf8",
);
const rootComponent = await readFile(
  new URL("app.component.ts", appSource),
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
    expect(template).toContain('if (mode() === "element")');
    expect(template).not.toContain('selectOperation($event)');
    expect(template).not.toContain('<option value="pin"');
    expect(template).not.toContain("source-port");
  });

  it("names architecture-model and active-diagram scope without relying on color", () => {
    expect(template).toContain("changeScope() === 'architecture'");
    expect(template).toContain("changeScope() === 'diagram'");
    expect(template).toContain("changeScopeTitleKey()");
    expect(template).toContain("changeScopeDescriptionKey()");
    expect(component).toContain('computed<"architecture" | "diagram">');
    expect(component).toContain('"viewEditor.authority"');
    expect(template).toContain("authorityKey()");
    expect(messages).toContain('"authoringScope.architecture.title": "Architecture model"');
    expect(messages).toContain('"authoringScope.diagram.title": "Active diagram"');
    expect(messages).toContain('"authoringScope.architecture.title": "Architekturmodell"');
    expect(messages).toContain('"authoringScope.diagram.title": "Aktives Diagramm"');
    expect(messages).toContain("Applying changes only the active diagram source");
    expect(styles).toContain(".semantic-editor");
  });

  it("uses familiar questions while retaining stable C4-owned source identities", () => {
    expect(template).toContain('i18n.t("semanticEditor.name")');
    expect(template).toContain('i18n.t("semanticEditor.responsibility")');
    expect(template).toContain('i18n.t("semanticEditor.from")');
    expect(template).toContain('i18n.t("semanticEditor.to")');
    expect(template).toContain('i18n.t("semanticEditor.connectionIntent")');
    expect(template).toContain('i18n.t("semanticEditor.stableId")');
    expect(template).toContain("selectedCreateAction()?.ownerLabel");
    expect(template).toContain("i18n.t('viewEditor.showInView')");
    expect(template).toContain('i18n.t("semanticEditor.componentContextHint")');
    expect(template).toContain('i18n.t("semanticEditor.codeContextHint")');
    expect(template).toContain("serviceGuidanceKey()");
    expect(template).toContain('i18n.t("semanticEditor.serviceHint.title")');
    expect(messages).toContain("Looking for a service?");
    expect(messages).toContain("Du möchtest einen Service anlegen?");
    expect(messages).toContain("open Diagrams on the left");
    expect(messages).toContain("öffne links Diagramme");
  });

  it("separates model creation, diagram membership, and model deletion actions", () => {
    expect(template).toContain('mode() === "hide-element"');
    expect(template).toContain('mode() === "delete-element"');
    expect(component).toContain("viewEditor.applyRemove");
    expect(component).toContain("modelDelete.apply");
    expect(component).toContain("semanticEditor.applyElement");
    expect(template).toContain("cancelActionKey()");
    expect(template).toContain("resultKey()");
    expect(template).toContain("noPreviewKey()");
    expect(messages).toContain("Remove from this diagram…");
    expect(messages).toContain("Aus diesem Diagramm entfernen…");
    expect(messages).toContain("Delete from architecture model…");
    expect(messages).toContain("Aus dem Architekturmodell löschen…");
    expect(messages).toContain("Cancel diagram change");
    expect(messages).toContain("Löschen aus dem Modell abbrechen");
    expect(rootTemplate).toContain('[removeFromDiagramAvailable]="canRemoveElementFromDiagram()"');
  });

  it("explains first and additional diagrams without hiding view selection", () => {
    expect(rootTemplate).toContain("i18n.t('starter.firstDiagram')");
    expect(rootTemplate).toContain("i18n.t('starter.diagramPath')");
    expect(rootTemplate).toContain("i18n.t('diagrams.selectionHint')");
    expect(rootTemplate).toContain("compiler.state().views.length === 0");
    expect(rootTemplate).toContain("compiler.state().modelElementCount === 0");
    expect(rootTemplate).toContain("'diagrams.createAnother'");
    expect(rootTemplate).toContain('(click)="selectView(view.id)"');
    expect(rootTemplate).toContain('(change)="onViewSelection($event)"');
    expect(rootTemplate).toContain(
      '[selected]="compiler.state().activeViewId === view.id"',
    );
    expect(messages).toContain("You can create several diagrams");
    expect(messages).toContain("Du kannst mehrere Diagramme");
    expect(messages).toContain("Das Modell ist noch leer");
    expect(messages).toContain("Noch kein Diagramm");
  });

  it("activates and manages diagrams with reader-facing names", () => {
    expect(rootTemplate).toContain('[attr.aria-pressed]="compiler.state().activeViewId === view.id"');
    expect(rootTemplate).toContain("diagramKindLabel(view.kind)");
    expect(rootTemplate).toContain('(click)="editActiveDiagram()"');
    expect(rootTemplate).toContain('(click)="editActiveDiagramContent()"');
    expect(rootTemplate).toContain('(click)="deleteActiveDiagram()"');
    expect(template).toContain('mode() === "diagram-edit"');
    expect(template).toContain('mode() === "diagram-content"');
    expect(template).toContain('mode() === "diagram-delete"');
    expect(component).toContain('{ kind: "update-view"');
    expect(component).toContain('{ kind: "delete-view" }');
    expect(messages).toContain("Step-by-step interaction");
    expect(messages).toContain("Laufende Instanzen und Infrastruktur");
    expect(messages).toContain("Titel und Zweck bearbeiten…");
  });

  it("uses dedicated context forms for Deployment topology and Dynamic interactions", () => {
    expect(template).toContain('@if (editorKind() === "deployment")');
    expect(template).toContain('i18n.t("deploymentEditor.environment")');
    expect(template).toContain('selectDeploymentItemKind($event)');
    expect(template).toContain('i18n.t("deploymentEditor.architectureElement")');
    expect(template).toContain('@else if (editorKind() === "dynamic")');
    expect(template).toContain('selectDynamicRelationship($event)');
    expect(template).toContain('i18n.t("dynamicEditor.order")');
    expect(template).toContain('i18n.t("dynamicEditor.parallelGroup")');
    expect(template).toContain('i18n.t("dynamicEditor.relationshipBasis"');
    expect(component).toContain('this.editorKind() === "dynamic"');
    expect(component).toContain('"dynamicEditor.preview"');
    expect(component).toContain('"dynamicEditor.apply"');
    expect(component).toContain('"dynamicEditor.authority"');
    expect(messages).toContain("Scenario step — not a new relationship");
    expect(messages).toContain("Szenarioschritt — keine neue Beziehung");
    expect(messages).toContain("Static relationship used by this step");
    expect(messages).toContain("Statische Beziehung für diesen Schritt");
    expect(messages).toContain("Add static relationship");
    expect(messages).toContain("Statische Beziehung hinzufügen");
    expect(rootTemplate).toContain("primaryAuthoringActionKey()");
    expect(rootTemplate).toContain("primaryAuthoringActionHintKey()");
    expect(rootTemplate).toContain("[class.diagram-authoring-action]");
    expect(rootTemplate).toContain("[class.architecture-action]");
  });

  it("distinguishes logical architecture elements from running deployment instances", () => {
    expect(rootComponent).toContain('"deploymentEditor.open"');
    expect(rootComponent).toContain('"deploymentEditor.openHint"');
    expect(template).toContain("deploymentTopologyActions().length");
    expect(template).toContain("deploymentInstanceActions().length");
    expect(template).toContain("deploymentConceptTitleKey()");
    expect(template).toContain("deploymentConceptHintKey()");
    expect(template).toContain("deploymentItemIsInstance()");
    expect(template).toContain("deploymentStableIdKey()");
    expect(template).toContain("deploymentEditor.architectureWarning");
    expect(component).toContain('"deploymentEditor.preview"');
    expect(component).toContain('"deploymentEditor.apply"');
    expect(component).toContain('"deploymentEditor.authority"');
    expect(messages).toContain("Running instance — based on a logical element");
    expect(messages).toContain("Laufende Instanz — auf Grundlage eines logischen Elements");
    expect(messages).toContain("The same logical element may have several instances");
    expect(messages).toContain("Dasselbe logische Element darf mehrere Instanzen haben");
    expect(messages).toContain("Running instance of a Software System");
    expect(messages).toContain("Laufende Instanz eines Containers");
  });

  it("previews worker-owned source and uses shared undo and redo", () => {
    expect(template).toContain("buildPreview()");
    expect(template).toContain("sourceChangeKey()");
    expect(template).toContain("conflictsKey()");
    expect(component).toContain('"semanticEditor.sourceChange"');
    expect(component).toContain('"connectionEditor.sourceChange"');
    expect(component).toContain('"dynamicEditor.sourceChange"');
    expect(component).toContain('"semanticEditor.conflicts"');
    expect(template).toContain('[disabled]="!canApply()"');
    expect(rootTemplate).toContain('(click)="openSemanticEditor()"');
    expect(rootTemplate).toContain("<c4ml-semantic-editor");
    expect(rootTemplate).toContain('(applied)="applySemantic($event)"');
    expect(rootTemplate).toContain('(click)="undoAuthoring()"');
    expect(rootTemplate).toContain('(click)="redoAuthoring()"');
    expect(rootTemplate).toContain('[disabled]="!authoringHistory.canUndo()"');
    expect(rootTemplate).toContain('[disabled]="!authoringHistory.canRedo()"');
    expect(rootTemplate).toContain('[attr.aria-label]="undoAuthoringLabel()"');
    expect(rootTemplate).toContain('[attr.aria-label]="redoAuthoringLabel()"');
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
