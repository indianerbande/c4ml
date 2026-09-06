import { describe, expect, it } from "vitest";
import { applyProjectSourceChangeSet, createArchitectureProjectInput } from "@c4ml/compiler-core";
import { defaultSystemContextWizardAnswers, generateSystemContextDraft, inspectC4mlSemanticAuthoringContext,
  parseC4mlProjectDraft, proposeC4mlSemanticEdit, type C4mlSemanticEditOperation } from "../src/index.js";

const source = generateSystemContextDraft({ ...defaultSystemContextWizardAnswers, emptyName: "Gartenplanung" }).source!;
const projectOf = (text: string) => createArchitectureProjectInput({ id: "starter", documents: [{ uri: "model.c4ml", text }] });
const request = (operation: C4mlSemanticEditOperation) => ({ id: "starter-edit", viewId: undefined, documentUri: "model.c4ml",
  intent: { id: "starter", kind: "architecture" as const, summary: "Build a model explicitly" }, operation });
const system: C4mlSemanticEditOperation = { kind: "create-element", elementKind: "software-system", elementId: "garden",
  name: "Gartenplanung", responsibility: "Plant Gartenarbeiten.", classification: "internal" };
const diagram: C4mlSemanticEditOperation = { kind: "create-view", viewId: "garden-context", optionId: "system-context:garden",
  title: "Systemkontext — Gartenplanung", purpose: "Zeigt Beteiligte.", scopeName: "" };

describe("minimal model-first starter", () => {
  it("creates only a header, passive label, and empty model deterministically", async () => {
    expect(source).toBe('c4ml draft-1\n\n// "Gartenplanung"\nmodel {\n}\n');
    expect(generateSystemContextDraft({ ...defaultSystemContextWizardAnswers, emptyName: "Gartenplanung" }).source).toBe(source);
    const parsed = await parseC4mlProjectDraft(projectOf(source));
    expect(parsed.valid).toBe(true);
    expect(parsed.model?.elements).toHaveLength(0);
    expect(parsed.views).toHaveLength(0);
    expect(generateSystemContextDraft({ ...defaultSystemContextWizardAnswers, emptyName: "  " }).valid).toBe(false);
  });
  it("quotes line breaks in labels without permitting source injection", async () => {
    const generated = generateSystemContextDraft({ ...defaultSystemContextWizardAnswers, emptyName: 'Name\nmodel { system injected {} }' });
    const parsed = await parseC4mlProjectDraft(projectOf(generated.source!));
    expect(parsed.valid).toBe(true);
    expect(parsed.model?.elements).toHaveLength(0);
  });
  it("adds elements without a view, then creates an explicit view without model duplication", async () => {
    let project = projectOf(source);
    const context = await inspectC4mlSemanticAuthoringContext(project, undefined);
    expect(context.context?.viewId).toBeUndefined();
    expect(context.context?.createActions.map(({ kind }) => kind)).toEqual(["person", "software-system"]);
    for (const operation of [system, { ...system, elementKind: "person", elementId: "gardener", name: "Gartenbetreuung" } as const]) {
      const proposal = await proposeC4mlSemanticEdit(project, request(operation));
      expect(proposal.valid).toBe(true);
      if (!proposal.valid) throw new Error(JSON.stringify(proposal));
      const applied = applyProjectSourceChangeSet(project, proposal.changeSet);
      if (!applied.valid) throw new Error("apply failed");
      project = applied.project;
      const parsed = await parseC4mlProjectDraft(project);
      expect(parsed.valid).toBe(true);
      expect(parsed.views).toHaveLength(0);
      expect(project.documents[0]?.text).toContain('// "Gartenplanung"');
    }
    const before = await parseC4mlProjectDraft(project);
    const proposal = await proposeC4mlSemanticEdit(project, request(diagram));
    if (!proposal.valid) throw new Error(JSON.stringify(proposal));
    expect(proposal.proposedText).toContain("show = [garden, gardener]");
    const applied = applyProjectSourceChangeSet(project, proposal.changeSet);
    if (!applied.valid) throw new Error("apply failed");
    const after = await parseC4mlProjectDraft(applied.project);
    expect(after.valid).toBe(true);
    expect(after.model).toEqual(before.model);
    expect(after.resolvedViews?.[0]?.elements.map(({ id }) => id).sort()).toEqual(["garden", "gardener"]);
    expect((await proposeC4mlSemanticEdit(applied.project, request(diagram))).valid).toBe(false);
    expect(applyProjectSourceChangeSet(applied.project, proposal.changeSet).valid).toBe(false);
  });
  it("rejects unknown scopes, view-only actions, duplicate elements, and malformed input", async () => {
    const project = projectOf(source);
    expect((await proposeC4mlSemanticEdit(project, request(diagram))).valid).toBe(false);
    expect((await proposeC4mlSemanticEdit(project, request({ ...system, showInView: true }))).valid).toBe(false);
    expect((await proposeC4mlSemanticEdit(projectOf("broken"), request(system))).valid).toBe(false);
    expect((await proposeC4mlSemanticEdit(project, { ...request(system), documentUri: "missing.c4ml" })).valid).toBe(false);
    const proposal = await proposeC4mlSemanticEdit(project, request(system));
    if (!proposal.valid) throw new Error("creation failed");
    const applied = applyProjectSourceChangeSet(project, proposal.changeSet);
    if (!applied.valid) throw new Error("apply failed");
    expect((await proposeC4mlSemanticEdit(applied.project, request(system))).valid).toBe(false);
  });

  it("offers and compiles every static diagram only for existing compatible owners", async () => {
    const source = `c4ml draft-1
model {
 person gardener { name = "Gardener" responsibility = "Plans work." classification = internal }
 system garden { name = "Garden" responsibility = "Coordinates work." classification = internal }
 container service inside garden { name = "Service" responsibility = "Receives plans." technology = "TypeScript" }
 component planner inside service { name = "Planner" responsibility = "Builds plans." technology = "TypeScript" }
 code plan inside planner { name = "Plan" responsibility = "Describes work." code-kind = class }
}`;
    const project = projectOf(source.replaceAll("\n", "\r\n"));
    const context = await inspectC4mlSemanticAuthoringContext(project, undefined);
    expect(context.context?.diagramOptions?.map(({ kind }) => kind).sort()).toEqual(["code", "component", "container", "system-context", "system-landscape"]);
    for (const option of context.context!.diagramOptions!) {
      const proposal = await proposeC4mlSemanticEdit(project, request({ kind: "create-view", optionId: option.id,
        viewId: "overview", title: "Garden overview", purpose: "Shows the model.", scopeName: "Garden team" }));
      if (!proposal.valid) throw new Error(JSON.stringify(proposal));
      const applied = applyProjectSourceChangeSet(project, proposal.changeSet);
      if (!applied.valid) throw new Error("apply failed");
      const parsed = await parseC4mlProjectDraft(applied.project);
      expect(parsed.valid, JSON.stringify(parsed.diagnostics)).toBe(true);
      expect(applied.project.documents[0]?.text.startsWith(project.documents[0]!.text)).toBe(true);
      expect(proposal.proposedText.replaceAll("\r\n", "")).not.toContain("\n");
    }
  });
});
