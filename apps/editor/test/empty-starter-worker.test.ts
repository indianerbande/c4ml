import { describe, expect, it } from "vitest";
import { defaultSystemContextWizardAnswers } from "@c4ml/language-c4ml";
import { compileWorkerRequest, generateWorkerRequest, inspectSemanticAuthoringWorkerRequest,
  previewSemanticChangeWorkerRequest } from "../src/app/compiler-worker-runtime.js";
import { compilerWorkerProtocolVersion, isCompilerWorkerResponse, isWizardWorkerResponse,
  isInspectSemanticAuthoringWorkerRequest, isInspectSemanticAuthoringWorkerResponse,
  isPreviewSemanticChangeWorkerRequest, isPreviewSemanticChangeWorkerResponse } from "../src/app/compiler-worker.protocol.js";
import { EditorCompilationSession } from "../src/app/editor-session.js";
import { LinearPreviewLayoutAdapter } from "../src/app/linear-preview-layout.js";
const base = { protocolVersion: compilerWorkerProtocolVersion, requestId: 1 };
const adapter = new LinearPreviewLayoutAdapter();

describe("model-first worker and editor boundary", () => {
  it("generates a blank source, authors without SVG, then previews a real diagram", async () => {
    const generated = await generateWorkerRequest({ ...base, type: "generate-system-context", answers: { ...defaultSystemContextWizardAnswers, emptyName: "Garten" } });
    expect(isWizardWorkerResponse(generated)).toBe(true);
    let project = { version: 1 as const, id: "garden", documents: [{ uri: "model.c4ml", source: generated.source! }] };
    const inspection = { ...base, type: "inspect-semantic-authoring" as const, file: "model.c4ml", project, viewId: undefined };
    expect(isInspectSemanticAuthoringWorkerRequest(inspection)).toBe(true);
    expect(isInspectSemanticAuthoringWorkerResponse(await inspectSemanticAuthoringWorkerRequest(inspection))).toBe(true);
    const request = { ...base, type: "preview-semantic-change" as const, file: "model.c4ml", project,
      semantic: { id: "new-system", viewId: undefined, intent: { id: "system", kind: "architecture" as const, summary: "Add system" },
        operation: { kind: "create-element" as const, elementKind: "software-system" as const, elementId: "garden", name: "Garten", responsibility: "Plant Arbeit.", classification: "internal" as const } } };
    expect(isPreviewSemanticChangeWorkerRequest(request)).toBe(true);
    const element = await previewSemanticChangeWorkerRequest(request, adapter, []);
    expect(element.status).toBe("valid");
    expect(isPreviewSemanticChangeWorkerResponse(element)).toBe(true);
    expect(element.compilation?.svg).toBeUndefined();
    expect(element.compilation?.modelElementCount).toBe(1);
    expect(project.documents[0]?.source).not.toContain("system garden");
    project = { ...project, documents: [...element.candidateProject!.documents] };
    const diagram = await previewSemanticChangeWorkerRequest({ ...request, project,
      requestedViewId: "overview", semantic: { ...request.semantic,
        intent: { id: "view:create-view", kind: "view", summary: "Create diagram" },
        operation: { kind: "create-view", viewId: "overview", optionId: "system-context:garden", title: "System Context — Garden", purpose: "Shows the garden.", scopeName: "" } } }, adapter, []);
    expect(diagram.status, JSON.stringify(diagram)).toBe("valid");
    expect(diagram.compilation?.svg).toContain("Garten");
    expect(isPreviewSemanticChangeWorkerResponse(diagram)).toBe(true);

    project = { ...project, documents: [...diagram.candidateProject!.documents] };
    const updateRequest = { ...request, project, requestedViewId: "overview",
      semantic: { id: "view:update-view", viewId: "overview",
        intent: { id: "view:update-view", kind: "view" as const, summary: "Edit diagram" },
        operation: { kind: "update-view" as const, title: "Garden overview", purpose: "Explains the garden system." } } };
    expect(isPreviewSemanticChangeWorkerRequest(updateRequest)).toBe(true);
    const updated = await previewSemanticChangeWorkerRequest(updateRequest, adapter, []);
    expect(updated.status).toBe("valid");
    expect(updated.compilation?.views).toContainEqual(expect.objectContaining({ id: "overview", title: "Garden overview" }));

    project = { ...project, documents: [...updated.candidateProject!.documents] };
    const deleteRequest = { ...request, project,
      semantic: { id: "view:delete-view", viewId: "overview",
        intent: { id: "view:delete-view", kind: "view" as const, summary: "Delete diagram" },
        operation: { kind: "delete-view" as const } } };
    expect(isPreviewSemanticChangeWorkerRequest(deleteRequest)).toBe(true);
    const deleted = await previewSemanticChangeWorkerRequest(deleteRequest, adapter, []);
    expect(deleted.status).toBe("valid");
    expect(deleted.compilation?.views).toEqual([]);
    expect(deleted.compilation?.modelElementCount).toBe(1);
  });

  it("clears obsolete SVG and View selection when source becomes a valid viewless model", async () => {
    const session = new EditorCompilationSession();
    const source = 'c4ml draft-1\nmodel { system garden { name = "Garden" responsibility = "Plans work." classification = internal } }\nview overview { type = system-context scope = garden title = "Context — Garden" purpose = "Shows participants." audience = default legend = generated }';
    const initial = await compileWorkerRequest(session.begin(source), adapter, []);
    expect(initial.status, JSON.stringify(initial)).toBe("valid");
    session.accept(initial);
    expect(session.state.lastValidSvg).toBeDefined();
    expect(session.state.modelElementCount).toBe(1);
    const response = await compileWorkerRequest(session.begin("c4ml draft-1\nmodel {}"), adapter, []);
    expect(response.status).toBe("valid");
    expect(isCompilerWorkerResponse(response)).toBe(true);
    expect(isCompilerWorkerResponse({ ...response, svg: "fake" })).toBe(false);
    session.accept(response);
    expect(session.state.lastValidSvg).toBeUndefined();
    expect(session.state.lastValidNavigation).toBeUndefined();
    expect(session.state.views).toEqual([]);
    expect(session.state.activeViewId).toBeUndefined();
    expect(session.state.modelElementCount).toBe(0);
  });
});
