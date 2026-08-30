import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  defaultSystemContextWizardAnswers,
  parseC4mlProjectDraft,
} from "@c4ml/language-c4ml";
import {
  createArchitectureAnalysisReport,
  createArchitectureProjectInput,
  createProposedProjectSourceChangeSet,
  resolveArchitectureSnapshot,
} from "@c4ml/compiler-core";
import { createBundledElkLayoutAdapter } from "@c4ml/layout-elk/bundled";

import {
  compilerWorkerProtocolVersion,
  isAnalysisWorkerResponse,
  isCompilerWorkerResponse,
  type AnalysisWorkerRequest,
  type CompilerWorkerRequest,
  type CompletionWorkerRequest,
  type HighlightWorkerRequest,
  type HelpWorkerRequest,
  isPreviewProjectChangeWorkerResponse,
  isPreviewPlacementChangeWorkerResponse,
  isPreviewRouteChangeWorkerResponse,
  isInspectSemanticAuthoringWorkerResponse,
  isPreviewSemanticChangeWorkerResponse,
  type InspectSemanticAuthoringWorkerRequest,
  type PreviewPlacementChangeWorkerRequest,
  type PreviewProjectChangeWorkerRequest,
  type PreviewRouteChangeWorkerRequest,
  type PreviewSemanticChangeWorkerRequest,
  type WizardWorkerRequest,
} from "../src/app/compiler-worker.protocol.js";
import {
  analyzeWorkerRequest,
  compileWorkerRequest,
  completeWorkerRequest,
  generateWorkerRequest,
  highlightWorkerRequest,
  helpWorkerRequest,
  inspectSemanticAuthoringWorkerRequest,
  previewProjectChangeWorkerRequest,
  previewPlacementChangeWorkerRequest,
  previewRouteChangeWorkerRequest,
  previewSemanticChangeWorkerRequest,
} from "../src/app/compiler-worker-runtime.js";
import { initialC4mlSource } from "../src/app/initial-source.js";
import { LinearPreviewLayoutAdapter } from "../src/app/linear-preview-layout.js";

const documentedSourceUrl = new URL(
  "../../../examples/draft/hello-context.c4ml",
  import.meta.url,
);
const containerSourceUrl = new URL(
  "../../../examples/draft/hello-container.c4ml",
  import.meta.url,
);
const staticZoomSourceUrl = new URL(
  "../../../examples/draft/hello-static-zoom.c4ml",
  import.meta.url,
);
const dynamicSourceUrl = new URL(
  "../../../examples/draft/hello-dynamic.c4ml",
  import.meta.url,
);
const deploymentSourceUrl = new URL(
  "../../../examples/draft/hello-deployment.c4ml",
  import.meta.url,
);
const nodeLayoutAdapter = createBundledElkLayoutAdapter();
const testFontFaces = [
  {
    family: "IBM Plex Sans",
    style: "normal" as const,
    weight: 400,
    format: "woff2" as const,
    dataUrl: "data:font/woff2;base64,d09GMgAAAAA=",
  },
];

function compile(request: CompilerWorkerRequest) {
  return compileWorkerRequest(request, nodeLayoutAdapter, testFontFaces);
}

function request(
  source: string,
  requestId = 1,
  requestedViewId?: string,
): CompilerWorkerRequest {
  return {
    protocolVersion: compilerWorkerProtocolVersion,
    type: "compile",
    requestId,
    file: "editor.c4ml",
    source,
    ...(requestedViewId === undefined ? {} : { requestedViewId }),
  };
}

function completionRequest(
  source: string,
  offset: number,
  requestId = 1,
): CompletionWorkerRequest {
  return {
    protocolVersion: compilerWorkerProtocolVersion,
    type: "complete",
    requestId,
    file: "editor.c4ml",
    source,
    offset,
  };
}

function wizardRequest(
  requestId = 1,
  answers = defaultSystemContextWizardAnswers,
): WizardWorkerRequest {
  return {
    protocolVersion: compilerWorkerProtocolVersion,
    type: "generate-system-context",
    requestId,
    answers,
  };
}

function highlightRequest(
  source: string,
  requestId = 1,
): HighlightWorkerRequest {
  return {
    protocolVersion: compilerWorkerProtocolVersion,
    type: "highlight",
    requestId,
    file: "editor.c4ml",
    source,
  };
}

function helpRequest(
  source: string,
  offset: number,
  requestId = 1,
): HelpWorkerRequest {
  return {
    protocolVersion: compilerWorkerProtocolVersion,
    type: "help-context",
    requestId,
    file: "editor.c4ml",
    source,
    offset,
  };
}

describe("compiler worker runtime", () => {
  it("returns the same canonical analysis report as the portable Node path", async () => {
    const project = createArchitectureProjectInput({
      id: "garden-analysis",
      documents: [{ uri: "architecture.c4ml", text: initialC4mlSource }],
    });
    const parsed = await parseC4mlProjectDraft(project);
    const expected = createArchitectureAnalysisReport(
      resolveArchitectureSnapshot(parsed.model!, parsed.views!).snapshot!,
    );
    const analysisRequest: AnalysisWorkerRequest = {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "analyze",
      requestId: 46,
      file: "architecture.c4ml",
      source: initialC4mlSource,
      project: {
        version: 1,
        id: project.id,
        documents: [{ uri: "architecture.c4ml", source: initialC4mlSource }],
      },
    };

    const result = await analyzeWorkerRequest(analysisRequest);

    expect(result.status).toBe("valid");
    expect(isAnalysisWorkerResponse(result)).toBe(true);
    expect(JSON.stringify(result.report)).toBe(JSON.stringify(expected));
    expect(result.report?.findings).toEqual([]);
  });

  it("keeps the initial editor source aligned with the documented example", async () => {
    expect(initialC4mlSource).toBe(await readFile(documentedSourceUrl, "utf8"));
  });

  it("compiles source to deterministic SVG using the shared compiler", async () => {
    const first = await compile(request(initialC4mlSource));
    const second = await compile(request(initialC4mlSource));

    expect(first.status).toBe("valid");
    expect(isCompilerWorkerResponse(first)).toBe(true);
    expect(first.diagnostics).toEqual([]);
    expect(first.svg).toBe(second.svg);
    expect(first.svg).toContain("System Context — Garden Pulse");
    expect(first.svg).toContain('data-c4ml-shape="c4ml-person"');
    expect(first.navigation).toEqual(second.navigation);
    expect(first.navigation?.targets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "node",
          referenceId: "garden-pulse",
          sceneObjectId: "scene-node:element:garden-pulse",
          svgElementIds: ["c4ml-scene-node-element-garden-pulse"],
          source: expect.objectContaining({
            file: "editor.c4ml",
            start: expect.objectContaining({ line: 11, column: 2 }),
          }),
          geometry: expect.objectContaining({
            candidate: expect.objectContaining({
              x: expect.any(Number),
              y: expect.any(Number),
            }),
            final: expect.objectContaining({ x: 560, y: 246 }),
            delta: expect.objectContaining({
              x: expect.any(Number),
              y: expect.any(Number),
            }),
            explanations: expect.arrayContaining([
              expect.objectContaining({
                id: "automatic-layout",
                kind: "automatic",
                strength: "automatic",
                state: "applied",
                summary: "Automatic layout candidate",
                source: expect.objectContaining({ file: "editor.c4ml" }),
              }),
              expect.objectContaining({
                kind: "pin",
                strength: "hard",
                state: "applied",
                summary: "garden-pulse · x 520du · y 120du",
                source: expect.objectContaining({
                  file: "editor.c4ml",
                  start: expect.objectContaining({ line: 70 }),
                }),
              }),
            ]),
          }),
        }),
        expect.objectContaining({
          kind: "route",
          referenceId: "caretaker-reviews-plan",
          sceneObjectId: "scene-route:relationship:caretaker-reviews-plan",
          policy: "guided",
          style: "orthogonal",
          sourcePort: expect.objectContaining({ side: "east" }),
          targetPort: expect.objectContaining({ side: "west" }),
          source: expect.objectContaining({
            start: expect.objectContaining({ line: 25, column: 2 }),
          }),
          relatedSources: [
            expect.objectContaining({
              start: expect.objectContaining({ line: 89, column: 4 }),
            }),
          ],
          waypoints: [expect.objectContaining({ anchorKind: "target-port" })],
          lockedSegments: [
            expect.objectContaining({ segmentIndex: expect.any(Number) }),
          ],
          avoidanceRegions: [
            expect.objectContaining({
              id: "sensor-clearance",
              strength: "soft",
              relaxed: false,
              source: expect.objectContaining({
                start: expect.objectContaining({ line: 76 }),
              }),
            }),
          ],
        }),
        expect.objectContaining({
          kind: "port",
          referenceId: "caretaker-reviews-plan",
          portRole: "source",
          side: "east",
          routeSceneObjectId: "scene-route:relationship:caretaker-reviews-plan",
        }),
        expect.objectContaining({
          kind: "route-label",
          referenceId: "caretaker-reviews-plan",
          label: "Reviews and adjusts the garden work plan",
          bounds: expect.objectContaining({ width: expect.any(Number) }),
        }),
        expect.objectContaining({
          kind: "route",
          referenceId: "sensor-publishes-observations",
          corridor: expect.objectContaining({
            id: "lower-entry",
            orientation: "vertical",
            lane: 1,
            lanes: 3,
            coordinate: 687,
            laneCoordinate: 687,
            source: expect.objectContaining({
              start: expect.objectContaining({ line: 82 }),
            }),
          }),
        }),
        expect.objectContaining({
          kind: "corridor",
          referenceId: "sensor-publishes-observations",
          label: "Corridor lower-entry · lane 2",
          orientation: "vertical",
          lane: 1,
          lanes: 3,
        }),
      ]),
    );
  });

  it("previews a project change through the normal compiler without mutating active source", async () => {
    const activeSource = initialC4mlSource;
    const project = createArchitectureProjectInput({
      id: "garden-preview",
      documents: [{ uri: "architecture.c4ml", text: activeSource }],
    });
    const startOffset = activeSource.indexOf('"Garden Caretaker"');
    const changeSet = createProposedProjectSourceChangeSet(project, {
      id: "rename-caretaker",
      intent: {
        id: "authoring:rename-display-name",
        kind: "architecture",
        summary: "Rename the caretaker display name.",
      },
      affectedIds: ["caretaker"],
      edits: [
        {
          documentUri: "architecture.c4ml",
          startOffset,
          endOffset: startOffset + '"Garden Caretaker"'.length,
          text: '"Garden Coordinator"',
        },
      ],
    });
    const request: PreviewProjectChangeWorkerRequest = {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "preview-project-change",
      requestId: 44,
      file: "architecture.c4ml",
      project: {
        version: 1,
        id: project.id,
        documents: project.documents.map(({ uri, text }) => ({
          uri,
          source: text,
        })),
      },
      changeSet,
      requestedViewId: "garden-pulse-context",
    };

    const result = await previewProjectChangeWorkerRequest(
      request,
      nodeLayoutAdapter,
      testFontFaces,
    );

    expect(result.status).toBe("valid");
    expect(isPreviewProjectChangeWorkerResponse(result)).toBe(true);
    expect(result.candidateProject?.documents[0]?.source).toContain(
      'name = "Garden Coordinator"',
    );
    expect(result.compilation?.svg).toContain("Garden Coordinator");
    expect(activeSource).toBe(initialC4mlSource);
    expect((await parseC4mlProjectDraft(project)).valid).toBe(true);
  });

  it("generates and compiles a placement edit without mutating active source", async () => {
    const project = {
      version: 1 as const,
      id: "garden-placement-preview",
      documents: [{ uri: "architecture.c4ml", source: initialC4mlSource }],
    };
    const request: PreviewPlacementChangeWorkerRequest = {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "preview-placement-change",
      requestId: 46,
      file: "architecture.c4ml",
      project,
      requestedViewId: "garden-pulse-context",
      placement: {
        id: "placement:garden-pulse",
        viewId: "garden-pulse-context",
        intent: {
          id: "layout:relative",
          kind: "layout",
          summary: "Place Garden Pulse near the caretaker.",
        },
        operation: {
          kind: "relative",
          subjectId: "garden-pulse",
          anchorId: "caretaker",
          relation: "right-of",
          gap: "small",
          strength: "soft",
        },
      },
    };

    const result = await previewPlacementChangeWorkerRequest(
      request,
      nodeLayoutAdapter,
      testFontFaces,
    );

    expect(isPreviewPlacementChangeWorkerResponse(result)).toBe(true);
    expect(result.compilation?.diagnostics).toEqual([]);
    expect(result).toMatchObject({
      status: "valid",
      documentUri: "architecture.c4ml",
      proposedText: expect.stringContaining(
        "place garden-pulse right-of caretaker",
      ),
      changeSet: { intent: { kind: "layout" } },
      compilation: { status: "valid" },
    });
    expect(result.candidateProject?.documents[0]?.source).toContain(
      "gap = small",
    );
    expect(project.documents[0]?.source).toBe(initialC4mlSource);
  });

  it("generates and compiles a Port edit without mutating active route source", async () => {
    const project = {
      version: 1 as const,
      id: "garden-route-preview",
      documents: [{ uri: "architecture.c4ml", source: initialC4mlSource }],
    };
    const request: PreviewRouteChangeWorkerRequest = {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "preview-route-change",
      requestId: 47,
      file: "architecture.c4ml",
      project,
      requestedViewId: "garden-pulse-context",
      route: {
        id: "route:caretaker-reviews-plan:ports",
        viewId: "garden-pulse-context",
        intent: {
          id: "route:ports",
          kind: "route",
          summary: "Keep the caretaker route attached east to west.",
        },
        operation: {
          kind: "ports",
          relationshipId: "caretaker-reviews-plan",
          sourcePort: "east",
          targetPort: "west",
        },
      },
    };

    const result = await previewRouteChangeWorkerRequest(
      request,
      nodeLayoutAdapter,
      testFontFaces,
    );

    expect(isPreviewRouteChangeWorkerResponse(result)).toBe(true);
    expect(result.compilation?.diagnostics).toEqual([]);
    expect(result).toMatchObject({
      status: "valid",
      documentUri: "architecture.c4ml",
      proposedText: expect.stringContaining("route caretaker-reviews-plan"),
      changeSet: { intent: { kind: "route" } },
      compilation: { status: "valid" },
    });
    expect(result.candidateProject?.documents[0]?.source).toContain(
      "source-port = east",
    );
    expect(project.documents[0]?.source).toBe(initialC4mlSource);
    const route = result.compilation?.navigation?.targets.find(
      (target) => target.kind === "route" && target.referenceId === "caretaker-reviews-plan",
    );
    expect(route).toMatchObject({
      sourcePortSelection: "east",
      targetPortSelection: "west",
    });
  });

  it("derives semantic actions from the active C4 view in the worker", async () => {
    const project = {
      version: 1 as const,
      id: "garden-semantic-context",
      documents: [{ uri: "architecture.c4ml", source: initialC4mlSource }],
    };
    const request: InspectSemanticAuthoringWorkerRequest = {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "inspect-semantic-authoring",
      requestId: 48,
      file: "architecture.c4ml",
      project,
      viewId: "garden-pulse-context",
    };

    const result = await inspectSemanticAuthoringWorkerRequest(request);

    expect(isInspectSemanticAuthoringWorkerResponse(result)).toBe(true);
    expect(result).toMatchObject({
      status: "valid",
      context: {
        viewId: "garden-pulse-context",
        viewKind: "system-context",
        createActions: [{ kind: "person" }, { kind: "software-system" }],
      },
    });
    expect(result.context?.connectionOptions).toContainEqual({
      sourceId: "caretaker",
      targetIds: expect.arrayContaining(["garden-pulse"]),
    });
  });

  it("generates and compiles an architecture edit without mutating active source", async () => {
    const project = {
      version: 1 as const,
      id: "garden-semantic-preview",
      documents: [{ uri: "architecture.c4ml", source: initialC4mlSource }],
    };
    const request: PreviewSemanticChangeWorkerRequest = {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "preview-semantic-change",
      requestId: 49,
      file: "architecture.c4ml",
      project,
      requestedViewId: "garden-pulse-context",
      semantic: {
        id: "semantic:add-neighbour",
        viewId: "garden-pulse-context",
        intent: {
          id: "architecture:create-element",
          kind: "architecture",
          summary: "Add a neighbouring system.",
        },
        operation: {
          kind: "create-element",
          elementKind: "software-system",
          elementId: "watering-service",
          name: "Watering Service",
          responsibility: "Coordinates automated watering.",
          classification: "external",
        },
      },
    };

    const result = await previewSemanticChangeWorkerRequest(
      request,
      nodeLayoutAdapter,
      testFontFaces,
    );

    expect(isPreviewSemanticChangeWorkerResponse(result)).toBe(true);
    expect(result).toMatchObject({
      status: "valid",
      documentUri: "architecture.c4ml",
      proposedText: expect.stringContaining("system watering-service"),
      changeSet: { intent: { kind: "architecture" } },
      compilation: { status: "valid" },
    });
    expect(result.candidateProject?.documents[0]?.source).toContain(
      'name = "Watering Service"',
    );
    expect(project.documents[0]?.source).toBe(initialC4mlSource);
  });

  it("rejects stale project previews before compilation", async () => {
    const project = createArchitectureProjectInput({
      id: "garden-preview",
      documents: [{ uri: "architecture.c4ml", text: initialC4mlSource }],
    });
    const changeSet = createProposedProjectSourceChangeSet(project, {
      id: "stale",
      intent: {
        id: "authoring:rename-display-name",
        kind: "architecture",
        summary: "Rename the caretaker display name.",
      },
      affectedIds: ["caretaker"],
      edits: [
        {
          documentUri: "architecture.c4ml",
          startOffset: 0,
          endOffset: 0,
          text: "// preview\n",
        },
      ],
    });
    const result = await previewProjectChangeWorkerRequest(
      {
        protocolVersion: compilerWorkerProtocolVersion,
        type: "preview-project-change",
        requestId: 45,
        file: "architecture.c4ml",
        project: {
          version: 1,
          id: project.id,
          documents: [
            { uri: "architecture.c4ml", source: `${initialC4mlSource}\n` },
          ],
        },
        changeSet,
      },
      nodeLayoutAdapter,
      testFontFaces,
    );

    expect(result).toMatchObject({
      status: "invalid",
      candidateProject: undefined,
      compilation: undefined,
      issues: [{ code: "C4ML-SOURCE-CHANGE-102" }],
    });
  });

  it("compiles one multifile project through the browser-worker contract", async () => {
    const source = await readFile(documentedSourceUrl, "utf8");
    const modelStart = source.indexOf("model {");
    const relationsStart = source.indexOf("relations {");
    const viewStart = source.indexOf("view garden-pulse-context {");
    const section = (start: number, end?: number): string =>
      `c4ml draft-1\n\n${source.slice(start, end).trim()}\n`;
    const activeSource = section(viewStart);
    const projectRequest: CompilerWorkerRequest = {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "compile",
      requestId: 71,
      file: "views/context.c4ml",
      source: activeSource,
      project: {
        version: 1,
        id: "garden-pulse",
        documents: [
          {
            uri: "views/context.c4ml",
            source: activeSource,
          },
          {
            uri: "relations/relationships.c4ml",
            source: section(relationsStart, viewStart),
          },
          {
            uri: "model/systems.c4ml",
            source: section(modelStart, relationsStart),
          },
        ],
      },
    };

    expect(isCompilerWorkerResponse(await compile(projectRequest))).toBe(true);
    const result = await compile(projectRequest);
    expect(result.status).toBe("valid");
    expect(result.svg).toContain("System Context — Garden Pulse");
    expect(result.navigation?.targets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "node",
          referenceId: "garden-pulse",
          source: expect.objectContaining({ file: "model/systems.c4ml" }),
        }),
        expect.objectContaining({
          kind: "route",
          referenceId: "caretaker-reviews-plan",
          source: expect.objectContaining({
            file: "relations/relationships.c4ml",
          }),
          relatedSources: [
            expect.objectContaining({ file: "views/context.c4ml" }),
          ],
        }),
      ]),
    );
  });

  it("compiles the executable Container slice in the same worker", async () => {
    const source = await readFile(containerSourceUrl, "utf8");
    const result = await compile(request(source));

    expect(result.status).toBe("valid");
    expect(result.diagnostics).toEqual([]);
    expect(result.svg).toContain("Container View — Route Canvas");
    expect(result.svg).toContain("TypeScript service");
    expect(result.svg).toContain("PostgreSQL wire protocol");
  });

  it("returns available views and compiles the selected static zoom level", async () => {
    const source = await readFile(staticZoomSourceUrl, "utf8");
    const component = await compile(request(source));
    const code = await compile(request(source, 2, "arrangement-engine-code"));

    expect(component.status).toBe("valid");
    expect(component.activeViewId).toBe("workshop-lens-components");
    expect(component.views.map(({ id, kind }) => ({ id, kind }))).toEqual([
      { id: "workshop-lens-components", kind: "component" },
      { id: "arrangement-engine-code", kind: "code" },
      { id: "workshop-lens-containers", kind: "container" },
      { id: "workshop-lens-context", kind: "system-context" },
    ]);
    expect(component.svg).toContain("Component View — Planning Service");
    expect(code.status).toBe("valid");
    expect(code.activeViewId).toBe("arrangement-engine-code");
    expect(code.svg).toContain("Code View — Arrangement Engine");
    expect(code.svg).toContain("Code Element · function");
  });

  it("compiles Landscape and selected Dynamic Views through the same worker", async () => {
    const source = await readFile(dynamicSourceUrl, "utf8");
    const landscape = await compile(request(source));
    const dynamic = await compile(request(source, 2, "finalize-release"));

    expect(landscape.status).toBe("valid");
    expect(landscape.activeViewId).toBe("release-portfolio");
    expect(landscape.svg).toContain("System Landscape — Release Operations");
    expect(dynamic.status).toBe("valid");
    expect(dynamic.activeViewId).toBe("finalize-release");
    expect(dynamic.svg).toContain("Dynamic View — Finalize a Release Decision");
    expect(dynamic.svg).toContain("2. Queues release notice");
    expect(dynamic.svg).toContain("2. Stores release decision");
  });

  it("compiles a Deployment View with nested runtime boundaries", async () => {
    const source = await readFile(deploymentSourceUrl, "utf8");
    const deployment = await compile(request(source));

    expect(deployment.status).toBe("valid");
    expect(deployment.activeViewId).toBe("parcel-observer-production");
    expect(deployment.views).toMatchObject([
      { id: "parcel-observer-production", kind: "deployment" },
    ]);
    expect(deployment.svg).toContain(
      "Deployment View — Parcel Observer Production",
    );
    expect(deployment.svg).toContain("Regional Cloud");
    expect(deployment.svg).toContain("Application Cluster");
    expect(deployment.svg).not.toContain("Verification Host");
  });

  it("returns source-located diagnostics without an SVG for invalid input", async () => {
    const result = await compile(
      request(initialC4mlSource.replace("to = garden-pulse", "to = missing")),
    );

    expect(result.status).toBe("invalid");
    expect(result.svg).toBeUndefined();
    expect(result.navigation).toBeUndefined();
    expect(result.diagnostics[0]).toMatchObject({
      code: "C4ML-LANG-003",
      source: {
        file: "editor.c4ml",
        start: { line: 27, column: 9 },
      },
    });
  });

  it("returns context-valid completion edits from the language worker", async () => {
    const source = initialC4mlSource.replace(
      "classification = external",
      "classification = ex",
    );
    const tokenOffset =
      source.indexOf("classification = ex") + "classification = ".length;
    const result = await completeWorkerRequest(
      completionRequest(source, tokenOffset + 2),
    );

    expect(result).toMatchObject({
      requestId: 1,
      status: "complete",
      candidates: [
        {
          kind: "value",
          label: "external",
          edit: {
            text: "external",
            range: {
              start: { offset: tokenOffset },
              end: { offset: tokenOffset + 2 },
            },
          },
        },
      ],
    });
  });

  it("returns cross-file references from a project completion request", async () => {
    const activeSource = `c4ml draft-1

relations {
  relation caretaker-opens-garden {
    from = ${""}
    to = garden-pulse
    intent = "Opens the garden plan."
  }
}`;
    const offset = activeSource.indexOf("from = ") + "from = ".length;
    const result = await completeWorkerRequest({
      ...completionRequest(activeSource, offset, 72),
      file: "relations/relationships.c4ml",
      project: {
        version: 1,
        id: "garden-completion",
        documents: [
          {
            uri: "model/systems.c4ml",
            source: `c4ml draft-1

model {
  person caretaker {
    name = "Garden Caretaker"
    responsibility = "Coordinates garden work."
    classification = external
  }
  system garden-pulse {
    name = "Garden Pulse"
    responsibility = "Coordinates shared plans."
    classification = internal
  }
}`,
          },
          { uri: "relations/relationships.c4ml", source: activeSource },
        ],
      },
    });

    expect(result.status).toBe("complete");
    expect(result.candidates.map(({ label }) => label)).toEqual([
      "caretaker",
      "garden-pulse",
    ]);
  });

  it("returns compiler-owned highlighting spans from the language worker", async () => {
    const result = await highlightWorkerRequest(
      highlightRequest("c4ml draft-1\n// original\nmodel {}"),
    );

    expect(result.status).toBe("complete");
    expect(result.highlights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "keyword" }),
        expect.objectContaining({ kind: "comment" }),
        expect.objectContaining({ kind: "operator" }),
      ]),
    );
  });

  it("returns a stable help topic from the language worker", async () => {
    const offset =
      initialC4mlSource.indexOf("route caretaker-reviews-plan") + 8;
    const result = await helpWorkerRequest(
      helpRequest(initialC4mlSource, offset),
    );

    expect(result).toEqual({
      protocolVersion: compilerWorkerProtocolVersion,
      type: "help-context-result",
      requestId: 1,
      status: "complete",
      topicId: "routes",
      message: undefined,
    });
  });

  it("generates wizard source that compiles through the normal worker path", async () => {
    const generated = await generateWorkerRequest(wizardRequest());

    expect(generated).toMatchObject({
      status: "valid",
      issues: [],
    });
    const compiled = await compile(request(generated.source!, 2));
    expect(compiled.status).toBe("valid");
    expect(compiled.svg).toContain("System Context — Field Notes");
  });

  it("generates a guided Container starter through the same worker path", async () => {
    const generated = await generateWorkerRequest(
      wizardRequest(1, {
        ...defaultSystemContextWizardAnswers,
        viewKind: "container",
        viewId: "field-notes-containers",
        viewTitle: "Container View — Field Notes",
        viewPurpose: "Show what runs inside Field Notes.",
      }),
    );
    const compiled = await compile(request(generated.source!, 2));

    expect(generated.status).toBe("valid");
    expect(compiled.status).toBe("valid");
    expect(compiled.svg).toContain("Container View — Field Notes");
    expect(compiled.svg).toContain("Field Notes Service");
    expect(compiled.svg).toContain("HTTPS/JSON");
  });
});

describe("linear preview layout", () => {
  it("expands a parent and places all direct children inside it", async () => {
    const result = await new LinearPreviewLayoutAdapter().layout({
      id: "nested-preview",
      direction: "right",
      nodes: [
        { id: "outside", width: 120, height: 80 },
        { id: "child-a", width: 140, height: 90, parentId: "boundary" },
        { id: "child-b", width: 160, height: 100, parentId: "boundary" },
        { id: "boundary", width: 200, height: 160, padding: 30 },
      ],
      edges: [],
    });
    const parent = result.nodes.find(({ id }) => id === "boundary")!;
    const children = result.nodes.filter(
      ({ parentId }) => parentId === "boundary",
    );

    expect(parent.width).toBe(530);
    expect(parent.height).toBe(160);
    for (const child of children) {
      expect(child.x).toBeGreaterThanOrEqual(parent.x + 30);
      expect(child.y).toBeGreaterThanOrEqual(parent.y + 30);
      expect(child.x + child.width).toBeLessThanOrEqual(
        parent.x + parent.width - 30,
      );
      expect(child.y + child.height).toBeLessThanOrEqual(
        parent.y + parent.height - 30,
      );
    }
  });
});
