import { describe, expect, it } from "vitest";

import { defaultSystemContextWizardAnswers } from "@c4ml/language-c4ml";

import {
  compilerWorkerProtocolVersion,
  isCompletionWorkerRequest,
  isCompletionWorkerResponse,
  isCompilerWorkerRequest,
  isCompilerWorkerResponse,
  isHighlightWorkerRequest,
  isHighlightWorkerResponse,
  isHelpWorkerRequest,
  isHelpWorkerResponse,
  isPreviewPlacementChangeWorkerRequest,
  isPreviewRouteChangeWorkerRequest,
  isInspectSemanticAuthoringWorkerRequest,
  isPreviewSemanticChangeWorkerRequest,
  isWizardWorkerRequest,
  isWizardWorkerResponse,
  type CompilerWorkerResponse,
  type CompletionWorkerResponse,
  type HighlightWorkerResponse,
  type HelpWorkerResponse,
  type PreviewPlacementChangeWorkerResponse,
  type PreviewRouteChangeWorkerResponse,
  type InspectSemanticAuthoringWorkerResponse,
  type PreviewSemanticChangeWorkerResponse,
  type WizardWorkerResponse,
} from "../src/app/compiler-worker.protocol.js";
import {
  EditorCompilationSession,
  EditorCompletionSession,
  EditorHighlightSession,
  EditorHelpSession,
  EditorPlacementPreviewSession,
  EditorRequestSequence,
  EditorRoutePreviewSession,
  EditorWizardGenerationSession,
  WizardSourceSession,
} from "../src/app/editor-session.js";
import {
  EditorSemanticContextSession,
  EditorSemanticPreviewSession,
} from "../src/app/editor-semantic-session.js";

function response(
  requestId: number,
  status: "invalid" | "valid",
  svg: string | undefined,
): CompilerWorkerResponse {
  return {
    protocolVersion: compilerWorkerProtocolVersion,
    type: "compile-result",
    requestId,
    status,
    diagnostics:
      status === "invalid"
        ? [
            {
              code: "C4ML-LANG-002",
              severity: "error",
              message: "Invalid source",
              source: undefined,
              correction: undefined,
            },
          ]
        : [],
    svg,
    navigation:
      status === "valid"
        ? {
            width: 800,
            height: 600,
            targets: [
              {
                kind: "node",
                sceneObjectId: "scene-node:element:context",
                svgElementIds: ["c4ml-scene-node-element-context"],
                referenceId: "context",
                label: "Context",
                source: {
                  file: "editor.c4ml",
                  start: { offset: 0, line: 0, column: 0 },
                  end: { offset: 10, line: 0, column: 10 },
                },
                relatedSources: [],
                nodeRole: "element",
                bounds: { x: 20, y: 20, width: 200, height: 120 },
              },
            ],
          }
        : undefined,
    views:
      status === "valid"
        ? [{ id: "context", kind: "system-context", title: "Context" }]
        : [],
    activeViewId: status === "valid" ? "context" : undefined,
  };
}

function completionResponse(
  requestId: number,
  label: string,
): CompletionWorkerResponse {
  return {
    protocolVersion: compilerWorkerProtocolVersion,
    type: "completion-result",
    requestId,
    status: "complete",
    candidates: [
      {
        id: `candidate:${label}`,
        label,
        kind: "keyword",
        detail: "C4ML keyword",
        documentation: undefined,
        edit: {
          text: label,
          range: {
            start: { offset: 0, line: 0, column: 0 },
            end: { offset: 0, line: 0, column: 0 },
          },
        },
      },
    ],
    message: undefined,
  };
}

function wizardResponse(
  requestId: number,
  source = "generated",
): WizardWorkerResponse {
  return {
    protocolVersion: compilerWorkerProtocolVersion,
    type: "generation-result",
    requestId,
    status: "valid",
    source,
    issues: [],
    message: undefined,
  };
}

function helpResponse(
  requestId: number,
  topicId: HelpWorkerResponse["topicId"],
): HelpWorkerResponse {
  return {
    protocolVersion: compilerWorkerProtocolVersion,
    type: "help-context-result",
    requestId,
    status: "complete",
    topicId,
    message: undefined,
  };
}

function highlightResponse(
  requestId: number,
  kind: "identifier" | "keyword" = "keyword",
): HighlightWorkerResponse {
  return {
    protocolVersion: compilerWorkerProtocolVersion,
    type: "highlight-result",
    requestId,
    status: "complete",
    highlights: [
      {
        kind,
        range: {
          start: { offset: 0, line: 0, column: 0 },
          end: { offset: 4, line: 0, column: 4 },
        },
      },
    ],
    message: undefined,
  };
}

function placementFailure(
  requestId: number,
): PreviewPlacementChangeWorkerResponse {
  return {
    protocolVersion: compilerWorkerProtocolVersion,
    type: "preview-placement-change-result",
    requestId,
    status: "failed",
    changeSet: undefined,
    documentUri: undefined,
    proposedText: undefined,
    candidateProject: undefined,
    compilation: undefined,
    authoringIssues: [],
    changeIssues: [],
    message: "Preview failed.",
  };
}

function routeFailure(requestId: number): PreviewRouteChangeWorkerResponse {
  return {
    protocolVersion: compilerWorkerProtocolVersion,
    type: "preview-route-change-result",
    requestId,
    status: "failed",
    changeSet: undefined,
    documentUri: undefined,
    proposedText: undefined,
    candidateProject: undefined,
    compilation: undefined,
    repairs: [],
    authoringIssues: [],
    changeIssues: [],
    message: "Route preview failed.",
  };
}

function semanticContextFailure(
  requestId: number,
): InspectSemanticAuthoringWorkerResponse {
  return {
    protocolVersion: compilerWorkerProtocolVersion,
    type: "semantic-authoring-context-result",
    requestId,
    status: "failed",
    context: undefined,
    issues: [],
    message: "Semantic context failed.",
  };
}

function semanticPreviewFailure(
  requestId: number,
): PreviewSemanticChangeWorkerResponse {
  return {
    protocolVersion: compilerWorkerProtocolVersion,
    type: "preview-semantic-change-result",
    requestId,
    status: "failed",
    changeSet: undefined,
    documentUri: undefined,
    proposedText: undefined,
    candidateProject: undefined,
    compilation: undefined,
    authoringIssues: [],
    changeIssues: [],
    message: "Semantic preview failed.",
  };
}

describe("editor compilation session", () => {
  it("rejects invalid protocol identities and result payloads", () => {
    expect(
      isCompilerWorkerRequest({
        protocolVersion: compilerWorkerProtocolVersion,
        type: "compile",
        requestId: 0,
        file: "editor.c4ml",
        source: "c4ml draft-1",
      }),
    ).toBe(false);
    expect(isCompilerWorkerResponse(response(1, "valid", undefined))).toBe(
      false,
    );
    expect(
      isCompilerWorkerResponse({
        ...response(1, "invalid", undefined),
        protocolVersion: 999,
      }),
    ).toBe(false);
    expect(
      isCompletionWorkerRequest({
        protocolVersion: compilerWorkerProtocolVersion,
        type: "complete",
        requestId: 1,
        file: "editor.c4ml",
        source: "short",
        offset: 6,
      }),
    ).toBe(false);
    expect(
      isCompletionWorkerResponse({
        ...completionResponse(1, "model"),
        candidates: [{ label: "model" }],
      }),
    ).toBe(false);
    expect(
      isHighlightWorkerRequest({
        protocolVersion: compilerWorkerProtocolVersion,
        type: "highlight",
        requestId: 1,
        file: "editor.c4ml",
        source: "model",
      }),
    ).toBe(true);
    expect(
      isHighlightWorkerResponse({
        ...highlightResponse(1),
        highlights: [
          {
            kind: "unknown",
            range: {
              start: { offset: 0, line: 0, column: 0 },
              end: { offset: 4, line: 0, column: 4 },
            },
          },
        ],
      }),
    ).toBe(false);
    expect(
      isWizardWorkerRequest({
        protocolVersion: compilerWorkerProtocolVersion,
        type: "generate-system-context",
        requestId: 1,
        answers: {
          ...defaultSystemContextWizardAnswers,
          flow: "diagonal",
        },
      }),
    ).toBe(false);
    expect(
      isWizardWorkerResponse({
        ...wizardResponse(1),
        source: undefined,
      }),
    ).toBe(false);
  });

  it("creates a validated project request around its active document", () => {
    const session = new EditorCompilationSession();
    const project = {
      version: 1 as const,
      id: "garden-pulse",
      documents: [
        { uri: "model/systems.c4ml", source: "c4ml draft-1\nmodel {}" },
        { uri: "views/context.c4ml", source: "c4ml draft-1\nview context {}" },
      ],
    };

    const request = session.beginProject(project, "views/context.c4ml");

    expect(isCompilerWorkerRequest(request)).toBe(true);
    expect(request).toMatchObject({
      file: "views/context.c4ml",
      source: "c4ml draft-1\nview context {}",
      project,
    });
    expect(() => session.beginProject(project, "missing.c4ml")).toThrow(
      "does not exist",
    );
    expect(isCompilerWorkerRequest({
      ...request,
      source: "stale active source",
    })).toBe(false);
  });

  it("orders compile and completion requests on one worker sequence", () => {
    const sequence = new EditorRequestSequence();
    const compilation = new EditorCompilationSession(sequence);
    const completion = new EditorCompletionSession(sequence);
    const highlighting = new EditorHighlightSession(sequence);
    const wizard = new EditorWizardGenerationSession(sequence);

    expect(compilation.begin("source").requestId).toBe(1);
    expect(completion.begin("source", 3).requestId).toBe(2);
    expect(highlighting.beginAsync("source").request.requestId).toBe(3);
    expect(wizard.begin(defaultSystemContextWizardAnswers).requestId).toBe(4);
    expect(compilation.begin("new source").requestId).toBe(5);
  });

  it("creates monotonically ordered worker requests", () => {
    const session = new EditorCompilationSession();
    const first = session.begin("first");
    const second = session.begin("second", "model.c4ml");

    expect(first).toMatchObject({ requestId: 1, file: "editor.c4ml" });
    expect(second).toMatchObject({ requestId: 2, file: "model.c4ml" });
    expect(session.state).toMatchObject({
      phase: "compiling",
      activeRequestId: 2,
    });
  });

  it("rejects stale results and retains the last valid preview", () => {
    const session = new EditorCompilationSession();
    const first = session.begin("first");
    const second = session.begin("second");

    expect(session.accept(response(first.requestId, "valid", "<svg>old</svg>"))).toBe(
      false,
    );
    expect(session.state.lastValidSvg).toBeUndefined();
    expect(
      session.accept(response(second.requestId, "valid", "<svg>current</svg>")),
    ).toBe(true);

    const invalid = session.begin("invalid");
    expect(session.accept(response(invalid.requestId, "invalid", undefined))).toBe(
      true,
    );
    expect(session.state.phase).toBe("invalid");
    expect(session.state.lastValidSvg).toBe("<svg>current</svg>");
    expect(session.state.lastValidNavigation?.targets[0]?.referenceId).toBe(
      "context",
    );
    expect(session.state.diagnostics).toHaveLength(1);
  });

  it("requests a selected view and retains the accepted view catalogue", () => {
    const session = new EditorCompilationSession();
    const request = session.begin("source", "editor.c4ml", "code-view");
    const selected: CompilerWorkerResponse = {
      ...response(request.requestId, "valid", "<svg>code</svg>"),
      views: [
        { id: "component-view", kind: "component", title: "Components" },
        { id: "code-view", kind: "code", title: "Code" },
      ],
      activeViewId: "code-view",
    };

    expect(request.requestedViewId).toBe("code-view");
    expect(session.accept(selected)).toBe(true);
    expect(session.state).toMatchObject({
      activeViewId: "code-view",
      views: [{ id: "component-view" }, { id: "code-view" }],
    });
  });
});

describe("editor completion session", () => {
  it("rejects stale candidates and accepts the newest cursor result", () => {
    const session = new EditorCompletionSession();
    const first = session.begin("c4", 2);
    const second = session.begin("c4ml", 4);

    expect(session.accept(completionResponse(first.requestId, "c4ml"))).toBe(
      false,
    );
    expect(session.accept(completionResponse(second.requestId, "model"))).toBe(
      true,
    );
    expect(session.state).toMatchObject({
      phase: "ready",
      offset: 4,
      candidates: [{ label: "model" }],
    });
  });

  it("resolves the active Monaco request and cancels a superseded request", async () => {
    const session = new EditorCompletionSession();
    const first = session.beginAsync("c4", 2);
    const second = session.beginAsync("c4ml", 4);

    await expect(first.result).resolves.toEqual([]);
    expect(
      session.accept(completionResponse(first.request.requestId, "c4ml")),
    ).toBe(false);
    expect(
      session.accept(completionResponse(second.request.requestId, "model")),
    ).toBe(true);
    await expect(second.result).resolves.toMatchObject([{ label: "model" }]);
  });

  it("settles an active Monaco request when the worker fails", async () => {
    const session = new EditorCompletionSession();
    const pending = session.beginAsync("c4ml", 4);

    session.failActive("Worker stopped.");

    await expect(pending.result).resolves.toEqual([]);
    expect(session.state).toMatchObject({
      phase: "failed",
      message: "Worker stopped.",
    });
  });
});

describe("editor highlighting session", () => {
  it("settles superseded Monaco requests and accepts only the newest spans", async () => {
    const session = new EditorHighlightSession();
    const first = session.beginAsync("mod");
    const second = session.beginAsync("model");

    await expect(first.result).resolves.toEqual([]);
    expect(session.accept(highlightResponse(first.request.requestId))).toBe(false);
    expect(
      session.accept(highlightResponse(second.request.requestId, "identifier")),
    ).toBe(true);
    await expect(second.result).resolves.toMatchObject([
      { kind: "identifier" },
    ]);
  });

  it("settles the active Monaco request when the worker fails", async () => {
    const session = new EditorHighlightSession();
    const pending = session.beginAsync("model");

    session.failActive();

    await expect(pending.result).resolves.toEqual([]);
  });
});

describe("editor help session", () => {
  it("rejects stale cursor context and accepts only the newest topic", () => {
    const session = new EditorHelpSession();
    const first = session.begin("person caretaker {}", 8);
    const second = session.begin("route connection {}", 8);

    expect(isHelpWorkerRequest(second)).toBe(true);
    expect(session.accept(helpResponse(first.requestId, "people"))).toBe(false);
    const current = helpResponse(second.requestId, "routes");
    expect(isHelpWorkerResponse(current)).toBe(true);
    expect(session.accept(current)).toBe(true);
    expect(session.state).toMatchObject({
      phase: "ready",
      offset: 8,
      topicId: "routes",
    });
  });
});

describe("editor wizard sessions", () => {
  it("rejects a stale source generation result", () => {
    const session = new EditorWizardGenerationSession();
    const first = session.begin(defaultSystemContextWizardAnswers);
    const second = session.begin({
      ...defaultSystemContextWizardAnswers,
      systemName: "Changed",
    });

    expect(session.accept(wizardResponse(first.requestId, "old"))).toBe(false);
    expect(session.accept(wizardResponse(second.requestId, "current"))).toBe(
      true,
    );
    expect(session.state).toMatchObject({
      phase: "valid",
      source: "current",
    });
  });

  it("cancels without changing source and supports one explicit undo", () => {
    const session = new WizardSourceSession();
    session.start("original");
    expect(session.cancel("original")).toBe("original");
    expect(session.canUndo).toBe(false);

    session.start("original");
    expect(session.apply("generated")).toBe("generated");
    expect(session.canUndo).toBe(true);
    expect(session.undo("generated")).toBe("original");
    expect(session.canUndo).toBe(false);
    expect(session.undo("original plus edits")).toBe("original plus edits");
  });
});

describe("editor placement preview session", () => {
  it("settles a superseded preview and accepts only the active result", async () => {
    const session = new EditorPlacementPreviewSession();
    const project = {
      version: 1 as const,
      id: "garden",
      documents: [{ uri: "architecture.c4ml", source: "c4ml draft-1" }],
    };
    const placement = {
      id: "place-garden",
      viewId: "context",
      intent: {
        id: "layout:relative",
        kind: "layout" as const,
        summary: "Place garden.",
      },
      operation: {
        kind: "relative" as const,
        subjectId: "garden",
        anchorId: "caretaker",
        relation: "right-of" as const,
        gap: "small" as const,
        strength: "soft" as const,
      },
    };
    const first = session.beginAsync(
      project,
      "architecture.c4ml",
      placement,
      "context",
    );
    const second = session.beginAsync(
      project,
      "architecture.c4ml",
      placement,
      "context",
    );

    expect(isPreviewPlacementChangeWorkerRequest(second.request)).toBe(true);
    await expect(first.result).resolves.toBeUndefined();
    expect(session.accept(placementFailure(first.request.requestId))).toBe(false);
    const current = placementFailure(second.request.requestId);
    expect(session.accept(current)).toBe(true);
    await expect(second.result).resolves.toBe(current);
    expect(session.state).toMatchObject({ phase: "failed", response: current });
  });
});

describe("editor route preview session", () => {
  it("settles a superseded preview and accepts only the active route result", async () => {
    const session = new EditorRoutePreviewSession();
    const project = {
      version: 1 as const,
      id: "garden",
      documents: [{ uri: "architecture.c4ml", source: "c4ml draft-1" }],
    };
    const route = {
      id: "route-ports",
      viewId: "context",
      intent: { id: "route:ports", kind: "route" as const, summary: "Choose Ports." },
      operation: {
        kind: "ports" as const,
        relationshipId: "garden-route",
        sourcePort: "east" as const,
        targetPort: "west" as const,
      },
    };
    const first = session.beginAsync(project, "architecture.c4ml", route, "context");
    const second = session.beginAsync(project, "architecture.c4ml", route, "context");

    expect(isPreviewRouteChangeWorkerRequest(second.request)).toBe(true);
    await expect(first.result).resolves.toBeUndefined();
    expect(session.accept(routeFailure(first.request.requestId))).toBe(false);
    const current = routeFailure(second.request.requestId);
    expect(session.accept(current)).toBe(true);
    await expect(second.result).resolves.toBe(current);
    expect(session.state).toMatchObject({ phase: "failed", response: current });
  });
});

describe("editor semantic authoring sessions", () => {
  const project = {
    version: 1 as const,
    id: "garden",
    documents: [{ uri: "architecture.c4ml", source: "c4ml draft-1" }],
  };

  it("settles superseded context requests and accepts only the active result", async () => {
    const session = new EditorSemanticContextSession();
    const first = session.beginAsync(project, "architecture.c4ml", "context");
    const second = session.beginAsync(project, "architecture.c4ml", "context");

    expect(isInspectSemanticAuthoringWorkerRequest(second.request)).toBe(true);
    await expect(first.result).resolves.toBeUndefined();
    expect(session.accept(semanticContextFailure(first.request.requestId))).toBe(false);
    const current = semanticContextFailure(second.request.requestId);
    expect(session.accept(current)).toBe(true);
    await expect(second.result).resolves.toBe(current);
  });

  it("settles superseded semantic previews and accepts only the active result", async () => {
    const session = new EditorSemanticPreviewSession();
    const semantic = {
      id: "semantic:add-system",
      viewId: "context",
      intent: {
        id: "architecture:create-element",
        kind: "architecture" as const,
        summary: "Add a system.",
      },
      operation: {
        kind: "create-element" as const,
        elementKind: "software-system" as const,
        elementId: "watering-service",
        name: "Watering Service",
        responsibility: "Coordinates watering.",
        classification: "external" as const,
      },
    };
    const first = session.beginAsync(project, "architecture.c4ml", semantic, "context");
    const second = session.beginAsync(project, "architecture.c4ml", semantic, "context");

    expect(isPreviewSemanticChangeWorkerRequest(second.request)).toBe(true);
    await expect(first.result).resolves.toBeUndefined();
    expect(session.accept(semanticPreviewFailure(first.request.requestId))).toBe(false);
    const current = semanticPreviewFailure(second.request.requestId);
    expect(session.accept(current)).toBe(true);
    await expect(second.result).resolves.toBe(current);
  });
});
