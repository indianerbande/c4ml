import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { defaultSystemContextWizardAnswers } from "@c4ml/language-c4ml";
import { createBundledElkLayoutAdapter } from "@c4ml/layout-elk/bundled";

import {
  compilerWorkerProtocolVersion,
  isCompilerWorkerResponse,
  type CompilerWorkerRequest,
  type CompletionWorkerRequest,
  type HighlightWorkerRequest,
  type WizardWorkerRequest,
} from "../src/app/compiler-worker.protocol.js";
import {
  compileWorkerRequest,
  completeWorkerRequest,
  generateWorkerRequest,
  highlightWorkerRequest,
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

function wizardRequest(requestId = 1): WizardWorkerRequest {
  return {
    protocolVersion: compilerWorkerProtocolVersion,
    type: "generate-system-context",
    requestId,
    answers: defaultSystemContextWizardAnswers,
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

describe("compiler worker runtime", () => {
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
        }),
        expect.objectContaining({
          kind: "route",
          referenceId: "caretaker-reviews-plan",
          sceneObjectId:
            "scene-route:relationship:caretaker-reviews-plan",
          policy: "guided",
          style: "orthogonal",
          sourcePort: expect.objectContaining({ side: "east" }),
          targetPort: expect.objectContaining({ side: "west" }),
          source: expect.objectContaining({
            start: expect.objectContaining({ line: 25, column: 2 }),
          }),
          relatedSources: [
            expect.objectContaining({
              start: expect.objectContaining({ line: 56, column: 4 }),
            }),
          ],
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
          }),
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
    const code = await compile(
      request(source, 2, "arrangement-engine-code"),
    );

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
    const dynamic = await compile(
      request(source, 2, "finalize-release"),
    );

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
    const tokenOffset = source.indexOf("classification = ex") +
      "classification = ".length;
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
    const children = result.nodes.filter(({ parentId }) =>
      parentId === "boundary",
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
