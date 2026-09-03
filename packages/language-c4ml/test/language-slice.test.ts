import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  compileArchitectureDiagram,
  createArchitectureProjectInput,
  type LayoutAdapter,
  type LayoutRequest,
  type LayoutResult,
} from "@c4ml/compiler-core";

import {
  completeC4mlDraft,
  completeC4mlProjectDraft,
  defaultSystemContextWizardAnswers,
  generateSystemContextDraft,
  highlightC4mlDraft,
  helpContextAtC4mlDraft,
  parseC4mlDraft,
  parseC4mlProjectDraft,
  proposeC4mlWizardExtension,
} from "../src/index.js";

const helloContextUrl = new URL(
  "../../../examples/draft/hello-context.c4ml",
  import.meta.url,
);
const helloContainerUrl = new URL(
  "../../../examples/draft/hello-container.c4ml",
  import.meta.url,
);
const helloStaticZoomUrl = new URL(
  "../../../examples/draft/hello-static-zoom.c4ml",
  import.meta.url,
);
const helloDynamicUrl = new URL(
  "../../../examples/draft/hello-dynamic.c4ml",
  import.meta.url,
);
const helloDeploymentUrl = new URL(
  "../../../examples/draft/hello-deployment.c4ml",
  import.meta.url,
);
const signalGardenUrl = new URL(
  "../../../examples/draft/signal-garden.c4ml",
  import.meta.url,
);

class RowLayoutAdapter implements LayoutAdapter {
  readonly adapterId = "test.language-row-layout";

  async layout(request: LayoutRequest): Promise<LayoutResult> {
    const nodes = request.nodes.map((node, index) => ({
      ...node,
      x: 40 + index * 330,
      y: 80,
    }));
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    return {
      requestId: request.id,
      width: 40 + nodes.length * 330,
      height: 320,
      nodes,
      edges: request.edges.map((edge) => {
        const source = nodeById.get(edge.sourceId)!;
        const target = nodeById.get(edge.targetId)!;
        return {
          id: edge.id,
          sections: [
            {
              start: {
                x: source.x + source.width / 2,
                y: source.y + source.height / 2,
              },
              bends: [],
              end: {
                x: target.x + target.width / 2,
                y: target.y + target.height / 2,
              },
            },
          ],
        };
      }),
    };
  }
}

async function helloContextSource(): Promise<string> {
  return readFile(helloContextUrl, "utf8");
}

async function helloContainerSource(): Promise<string> {
  return readFile(helloContainerUrl, "utf8");
}

async function helloStaticZoomSource(): Promise<string> {
  return readFile(helloStaticZoomUrl, "utf8");
}

async function helloDynamicSource(): Promise<string> {
  return readFile(helloDynamicUrl, "utf8");
}

async function helloDeploymentSource(): Promise<string> {
  return readFile(helloDeploymentUrl, "utf8");
}

async function signalGardenSource(): Promise<string> {
  return readFile(signalGardenUrl, "utf8");
}

function replaceContextLayout(source: string, layoutLines: readonly string[]): string {
  return source.replace(
    /  layout \{[\s\S]*?\n  \}\n\}\s*$/,
    `${layoutLines.join("\n")}\n}\n`,
  );
}

describe("C4ML draft-1 language slice", () => {
  it("parses the complete executable Signal Garden demonstration", async () => {
    const result = await parseC4mlDraft(await signalGardenSource(), {
      file: "examples/draft/signal-garden.c4ml",
    });

    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.views?.map(({ kind }) => kind)).toEqual([
      "system-landscape",
      "system-context",
      "container",
      "component",
      "code",
      "dynamic",
      "deployment",
    ]);
  });

  it.each([
    {
      keyword: "tags",
      plannedSource: "    tags = [core, cultivation]\n",
      expectedMessage:
        "The element tags property is planned C4ML syntax and is not executable in draft-1.",
      insertAfter: "    classification = internal\n",
    },
    {
      keyword: "group",
      plannedSource: [
        "  group cultivation-services {",
        '    title = "Cultivation Services"',
        "  }",
        "",
      ].join("\n"),
      expectedMessage:
        "The Visual Group declaration is planned C4ML syntax and is not executable in draft-1.",
      insertAfter: "  legend = generated\n",
    },
    {
      keyword: "presentation",
      plannedSource: [
        "  presentation {",
        "    theme = c4ml-blue",
        "  }",
        "",
      ].join("\n"),
      expectedMessage:
        "The View presentation block is planned C4ML syntax and is not executable in draft-1.",
      insertAfter: "  legend = generated\n",
    },
  ])("explains planned $keyword syntax instead of reporting a missing brace", async ({
    keyword,
    plannedSource,
    expectedMessage,
    insertAfter,
  }) => {
    const source = (await helloContextSource()).replace(
      insertAfter,
      `${insertAfter}${plannedSource}`,
    );
    const result = await parseC4mlDraft(source, {
      file: `planned-${keyword}.c4ml`,
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "C4ML-LANG-005",
      message: expectedMessage,
    });
    expect(result.diagnostics[0]?.source?.range.start.offset).toBe(
      source.indexOf(keyword),
    );
    expect(result.diagnostics[0]?.correction).toContain("language-preview");
    expect(result.diagnostics[0]?.message).not.toContain(
      "Expecting token of type '}'",
    );
  });

  it("parses and lowers the original hello-context source", async () => {
    const source = await helloContextSource();
    const result = await parseC4mlDraft(source, {
      file: "examples/draft/hello-context.c4ml",
    });

    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.languageVersion).toBe("draft-1");
    expect(result.model?.elements.map(({ id }) => id)).toEqual([
      "caretaker",
      "garden-pulse",
      "sensor-post",
    ]);
    expect(result.model?.relationships.map(({ id }) => id)).toEqual([
      "caretaker-reviews-plan",
      "sensor-publishes-observations",
    ]);
    expect(result.views).toHaveLength(1);
    expect(result.views?.[0]).toMatchObject({
      id: "garden-pulse-context",
      kind: "system-context",
      softwareSystemId: "garden-pulse",
      layout: { direction: "right" },
      legend: { mode: "generated" },
    });
    expect(result.resolvedViews?.[0]?.elements).toHaveLength(3);
    const caretakerSource = result.model?.elements[0]?.source;
    expect(caretakerSource?.file).toBe("examples/draft/hello-context.c4ml");
    expect(caretakerSource?.range.start).toMatchObject({ line: 5, column: 2 });
    expect(caretakerSource?.range.end).toMatchObject({ line: 9, column: 3 });
    expect(
      source.slice(
        caretakerSource?.range.start.offset,
        caretakerSource?.range.end.offset,
      ),
    ).toBe(
      [
        "person caretaker {",
        '    name = "Garden Caretaker"',
        '    responsibility = "Reviews cultivation signals and schedules garden work."',
        "    classification = external",
        "  }",
      ].join("\n"),
    );
  });

  it("merges project documents and resolves cross-file references", async () => {
    const source = await helloContextSource();
    const modelStart = source.indexOf("model {");
    const relationsStart = source.indexOf("relations {");
    const viewStart = source.indexOf("view garden-pulse-context {");
    const section = (start: number, end?: number): string =>
      `c4ml draft-1\n\n${source.slice(start, end).trim()}\n`;
    const project = createArchitectureProjectInput({
      id: "garden-pulse",
      documents: [
        {
          uri: "views/context.c4ml",
          text: section(viewStart),
        },
        {
          uri: "relations/relationships.c4ml",
          text: section(relationsStart, viewStart),
        },
        {
          uri: "model/systems.c4ml",
          text: section(modelStart, relationsStart),
        },
      ],
    });

    const [single, multifile] = await Promise.all([
      parseC4mlDraft(source),
      parseC4mlProjectDraft(project),
    ]);

    expect(multifile.valid).toBe(true);
    expect(multifile.diagnostics).toEqual([]);
    expect(multifile.projectId).toBe("garden-pulse");
    expect(multifile.documentUris).toEqual([
      "model/systems.c4ml",
      "relations/relationships.c4ml",
      "views/context.c4ml",
    ]);
    expect(semanticSnapshot(multifile)).toEqual(semanticSnapshot(single));
    expect(multifile.model?.elements[0]?.source?.file).toBe(
      "model/systems.c4ml",
    );
    expect(multifile.model?.relationships[0]?.source?.file).toBe(
      "relations/relationships.c4ml",
    );
    expect(multifile.views?.[0]?.source?.file).toBe("views/context.c4ml");
  });

  it("reports duplicate identities across documents with both source locations", async () => {
    const declaration = (name: string): string => `c4ml draft-1

model {
  person caretaker {
    name = "${name}"
    responsibility = "Tends the shared garden."
    classification = external
  }
}`;
    const project = createArchitectureProjectInput({
      id: "duplicate-project",
      documents: [
        { uri: "model/first.c4ml", text: declaration("First Caretaker") },
        { uri: "model/second.c4ml", text: declaration("Second Caretaker") },
      ],
    });

    const result = await parseC4mlProjectDraft(project);
    const duplicate = result.diagnostics.find(
      ({ code }) => code === "C4ML-SEM-002",
    );

    expect(result.valid).toBe(false);
    expect(duplicate?.source.file).toBe("model/second.c4ml");
    expect(duplicate?.related).toEqual([
      expect.objectContaining({
        source: expect.objectContaining({ file: "model/first.c4ml" }),
      }),
    ]);
  });

  it("accepts fragments only as part of a complete project", async () => {
    const modelFragment = `c4ml draft-1

model {
  system garden-pulse {
    name = "Garden Pulse"
    responsibility = "Coordinates shared garden work."
    classification = internal
  }
}`;

    const single = await parseC4mlDraft(modelFragment, {
      file: "model/systems.c4ml",
    });
    const project = await parseC4mlProjectDraft(
      createArchitectureProjectInput({
        id: "complete-project",
        documents: [
          { uri: "model/systems.c4ml", text: modelFragment },
          {
            uri: "views/context.c4ml",
            text: `c4ml draft-1

view garden-context {
  type = system-context
  scope = garden-pulse
  title = "Garden Context"
  purpose = "Explain the garden application."
  audience = default
  legend = generated
}`,
          },
        ],
      }),
    );

    expect(single.valid).toBe(false);
    expect(single.diagnostics.map(({ code }) => code)).toContain(
      "C4ML-LANG-202",
    );
    expect(project.valid).toBe(true);
  });

  it("runs the parsed source through the shared compiler to deterministic SVG", async () => {
    const source = await helloContextSource();
    const parsed = await parseC4mlDraft(source, {
      file: "examples/draft/hello-context.c4ml",
    });
    const request = {
      model: parsed.model!,
      view: parsed.views![0]!,
      layoutAdapter: new RowLayoutAdapter(),
      placement: parsed.placementByViewId!["garden-pulse-context"]!,
      routing: parsed.routingByViewId!["garden-pulse-context"]!,
    };

    const first = await compileArchitectureDiagram(request);
    const second = await compileArchitectureDiagram(request);

    expect(first.valid).toBe(true);
    expect(first.svg).toBe(second.svg);
    expect(first.svg).toContain("System Context — Garden Pulse");
    expect(first.svg).toContain("Garden Caretaker");
    expect(first.svg).toContain("Sensor Post");
    expect(first.svg).toContain('data-c4ml-shape="c4ml-person"');
  });

  it("reports unresolved references with a stable source-located diagnostic", async () => {
    const source = (await helloContextSource()).replace(
      "to = garden-pulse",
      "to = absent-system",
    );
    const result = await parseC4mlDraft(source, {
      file: "broken-reference.c4ml",
    });
    const diagnostic = result.diagnostics.find(
      ({ code }) => code === "C4ML-LANG-003",
    );

    expect(result.valid).toBe(false);
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.message).toContain("absent-system");
    expect(diagnostic?.source.file).toBe("broken-reference.c4ml");
    expect(
      source.slice(
        diagnostic?.source.range.start.offset,
        diagnostic?.source.range.end.offset,
      ),
    ).toBe("absent-system");
    expect(diagnostic?.source.range.start).toMatchObject({
      line: 27,
      column: 9,
    });
    expect(diagnostic?.source.range.end).toMatchObject({
      line: 27,
      column: 22,
    });
  });

  it("rejects missing and duplicate required properties", async () => {
    const source = (await helloContextSource())
      .replace(/  purpose = .*\n/, "")
      .replace(
        '    name = "Garden Caretaker"',
        '    name = "Garden Caretaker"\n    name = "Duplicate"',
      );
    const result = await parseC4mlDraft(source);

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      "C4ML-LANG-102",
      "C4ML-LANG-101",
    ]);
    expect(result.diagnostics[0]?.related).toHaveLength(1);
  });

  it("keeps semantic content stable across comments and whitespace", async () => {
    const source = await helloContextSource();
    const variant = source.replace(
      "model {",
      "model {\n\n  // Formatting-only variant",
    );
    const first = await parseC4mlDraft(source);
    const second = await parseC4mlDraft(variant);

    expect(semanticSnapshot(first)).toEqual(semanticSnapshot(second));
  });

  it("lowers relative placement, alignment, and pin controls into the shared solver", async () => {
    const source = replaceContextLayout(await helloContextSource(), [
      "  layout {",
      "    flow = right",
      "",
      "    constraint left-of(caretaker, garden-pulse) {",
      "      strength = hard",
      "      gap = 120",
      "    }",
      "",
      "    constraint align-center-y(caretaker, garden-pulse) {",
      "      strength = soft",
      "    }",
      "",
      "    pin garden-pulse {",
      "      x = 520du",
      "      y = 180du",
      "      strength = hard",
      "    }",
      "  }",
    ]);
    const parsed = await parseC4mlDraft(source, {
      file: "constraint-grid.c4ml",
    });

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.placementByViewId?.["garden-pulse-context"]).toMatchObject({
      constraints: [
        {
          id: "left-of:caretaker:garden-pulse",
          kind: "relative",
          relation: "left-of",
          subjectId: "caretaker",
          targetId: "garden-pulse",
          gap: 120,
          strength: "hard",
        },
        {
          id: "align-center-y:caretaker:garden-pulse",
          kind: "alignment",
          alignment: "center-y",
          strength: "soft",
        },
        {
          id: "pin:garden-pulse",
          kind: "pin",
          targetId: "garden-pulse",
          x: 520,
          y: 180,
          strength: "hard",
        },
      ],
    });

    const compiled = await compileArchitectureDiagram({
      model: parsed.model!,
      view: parsed.views![0]!,
      layoutAdapter: new RowLayoutAdapter(),
      placement: parsed.placementByViewId!["garden-pulse-context"]!,
    });
    expect(compiled.valid).toBe(true);
    expect(
      compiled.layout?.nodes.find(({ id }) => id === "element:garden-pulse"),
    ).toMatchObject({ x: 520, y: 180 });
    expect(compiled.placement?.constraints).toHaveLength(3);
  });

  it("rejects duplicate placement controls and missing relative gaps", async () => {
    const source = replaceContextLayout(await helloContextSource(), [
      "  layout {",
      "    flow = right",
      "    constraint left-of(caretaker, garden-pulse) {",
      "      strength = hard",
      "    }",
      "    constraint left-of(caretaker, garden-pulse) {",
      "      strength = soft",
      "      gap = 20",
      "    }",
      "  }",
    ]);
    const parsed = await parseC4mlDraft(source, {
      file: "invalid-placement.c4ml",
    });

    expect(parsed.valid).toBe(false);
    expect(parsed.diagnostics.map(({ code }) => code)).toEqual([
      "C4ML-LANG-121",
      "C4ML-LANG-120",
    ]);
    expect(parsed.diagnostics[1]?.related).toHaveLength(1);
  });

  it("lowers intent placement, set alignment, distribution, adjustment, and diagram units", async () => {
    const source = replaceContextLayout(await helloContextSource(), [
      "  layout {",
      "    flow = right",
      "    place caretaker left-of garden-pulse {",
      "      gap = normal",
      "      strength = hard",
      "    }",
      "    align top [caretaker, garden-pulse, sensor-post] {",
      "      anchor = garden-pulse",
      "      strength = soft",
      "    }",
      "    distribute horizontal [caretaker, garden-pulse, sensor-post] {",
      "      gap = 2step",
      "      strength = hard",
      "    }",
      "    adjust sensor-post {",
      "      relative-to = automatic",
      "      move-y = -2step",
      "      strength = soft",
      "    }",
      "    pin garden-pulse {",
      "      x = 520du",
      "      y = 180du",
      "      strength = hard",
      "    }",
      "  }",
    ]);
    const parsed = await parseC4mlDraft(source, { file: "intent-layout.c4ml" });

    expect(parsed.valid).toBe(true);
    expect(parsed.placementByViewId?.["garden-pulse-context"]?.constraints).toMatchObject([
      { kind: "relative", gap: 64 },
      {
        kind: "align",
        alignment: "top",
        nodeIds: ["caretaker", "garden-pulse", "sensor-post"],
        anchorId: "garden-pulse",
      },
      { kind: "distribute", orientation: "horizontal", gap: 32 },
      {
        kind: "adjust",
        targetId: "sensor-post",
        relativeTo: "automatic",
        offsetY: -32,
      },
      { kind: "pin", targetId: "garden-pulse", x: 520, y: 180 },
    ]);
  });

  it("rejects malformed set placement and ambiguous automatic adjustments", async () => {
    const source = replaceContextLayout(await helloContextSource(), [
      "  layout {",
      "    flow = right",
      "    align top [caretaker, caretaker] {",
      "      anchor = caretaker",
      "      strength = hard",
      "    }",
      "    distribute vertical [caretaker, garden-pulse] {",
      "      gap = small",
      "      strength = hard",
      "    }",
      "    adjust sensor-post {",
      "      relative-to = automatic",
      "      move = up small",
      "      move-y = -1step",
      "      strength = soft",
      "    }",
      "  }",
    ]);
    const parsed = await parseC4mlDraft(source, { file: "invalid-intent-layout.c4ml" });

    expect(parsed.valid).toBe(false);
    expect(parsed.diagnostics.map(({ code }) => code)).toEqual([
      "C4ML-LANG-122",
      "C4ML-LANG-123",
      "C4ML-LANG-124",
    ]);
  });

  it("lowers view-local corridors, ports, guided routes, fixed routes, and label placement", async () => {
    const source = replaceContextLayout(await helloContextSource(), [
        "  layout {",
        "    flow = right",
        "",
        "    corridor review-lane {",
        "      orientation = vertical",
        "      coordinate = 330",
        "      lanes = 2",
        "      lane-gap = 16",
        "    }",
        "",
        "    route caretaker-reviews-plan {",
        "      policy = guided",
        "      style = orthogonal",
        "      source-port = east",
        "      target-port = west",
        "      corridor = review-lane",
        "      lane = 0",
        "      label-segment = 1",
        "      label-offset-x = 8du",
        "      label-offset-y = -12du",
        "    }",
        "",
        "    route sensor-publishes-observations {",
        "      policy = fixed",
        "      style = orthogonal",
        "      points = [(700, 146), (620, 146)]",
        "      label-segment = 0",
        "    }",
        "  }",
      ]);
    const parsed = await parseC4mlDraft(source, { file: "guided-routes.c4ml" });

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.valid).toBe(true);
    expect(parsed.routingByViewId?.["garden-pulse-context"]).toEqual({
      corridors: [
        expect.objectContaining({
          id: "review-lane",
          orientation: "vertical",
          coordinate: 330,
          lanes: 2,
          laneSpacing: 16,
        }),
      ],
      controls: [
        expect.objectContaining({
          relationshipId: "caretaker-reviews-plan",
          policy: "guided",
          style: "orthogonal",
          sourcePort: "east",
          targetPort: "west",
          corridor: { corridorId: "review-lane", lane: 0 },
          labelSegment: 1,
          labelOffset: { x: 8, y: -12 },
        }),
        expect.objectContaining({
          relationshipId: "sensor-publishes-observations",
          policy: "fixed",
          style: "orthogonal",
          points: [
            { x: 700, y: 146 },
            { x: 620, y: 146 },
          ],
        }),
      ],
    });

    const compiled = await compileArchitectureDiagram({
      model: parsed.model!,
      view: parsed.views![0]!,
      layoutAdapter: new RowLayoutAdapter(),
      routing: parsed.routingByViewId!["garden-pulse-context"]!,
    });
    expect(compiled.valid).toBe(true);
    expect(compiled.routes).toMatchObject([
      {
        relationshipId: "caretaker-reviews-plan",
        policy: "guided",
        sourcePort: { side: "east" },
        targetPort: { side: "west" },
        corridor: { corridorId: "review-lane", lane: 0 },
      },
      {
        relationshipId: "sensor-publishes-observations",
        policy: "fixed",
      },
    ]);
    expect(compiled.svg).toContain('data-c4ml-route-policy="guided"');
    expect(compiled.svg).toContain('data-c4ml-route-policy="fixed"');
  });

  it("rejects duplicate and policy-incompatible route controls with source locations", async () => {
    const source = replaceContextLayout(await helloContextSource(), [
        "  layout {",
        "    flow = right",
        "    route caretaker-reviews-plan {",
        "      policy = automatic",
        "      source-port = east",
        "    }",
        "    route caretaker-reviews-plan {",
        "      policy = guided",
        "    }",
        "  }",
      ]);
    const result = await parseC4mlDraft(source, { file: "invalid-routes.c4ml" });

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      "C4ML-LANG-113",
      "C4ML-LANG-111",
    ]);
    expect(result.diagnostics[0]?.source.file).toBe("invalid-routes.c4ml");
    expect(result.diagnostics[1]?.related).toHaveLength(1);
  });

  it("requires independent diagram-unit label offsets and rejects the former tuple token", async () => {
    const missingUnit = replaceContextLayout(await helloContextSource(), [
      "  layout {",
      "    flow = right",
      "    route caretaker-reviews-plan {",
      "      policy = automatic",
      "      label-offset-x = -12",
      "    }",
      "  }",
    ]);
    const formerTuple = replaceContextLayout(await helloContextSource(), [
      "  layout {",
      "    flow = right",
      "    route caretaker-reviews-plan {",
      "      policy = automatic",
      "      label-shift = (8, -12)",
      "    }",
      "  }",
    ]);

    const [missingUnitResult, formerTupleResult] = await Promise.all([
      parseC4mlDraft(missingUnit, { file: "missing-label-offset-unit.c4ml" }),
      parseC4mlDraft(formerTuple, { file: "former-label-shift.c4ml" }),
    ]);

    expect(missingUnitResult.valid).toBe(false);
    expect(missingUnitResult.diagnostics.length).toBeGreaterThan(0);
    expect(formerTupleResult.valid).toBe(false);
    expect(formerTupleResult.diagnostics.length).toBeGreaterThan(0);
  });

  it("lowers relative guidance, locked segments, and hard or soft avoidance regions", async () => {
    const source = replaceContextLayout(await helloContextSource(), [
      "  layout {",
      "    flow = right",
      "",
      "    avoidance caretaker-space {",
      "      strength = soft",
      "      around = caretaker",
      "      padding = 24",
      "    }",
      "",
      "    avoidance fixed-zone {",
      "      strength = hard",
      "      bounds = (500, 40, 80, 100)",
      "    }",
      "",
      "    route caretaker-reviews-plan {",
      "      policy = guided",
      "      style = orthogonal",
      "      source-port = east",
      "      target-port = west",
      "      guide = [",
      "        via source-port shift (18, 0),",
      "        lock canvas at (300, 40) to canvas at (360, 40),",
      "        via element garden-pulse north shift (0, -20)",
      "      ]",
      "      avoid = [caretaker-space, fixed-zone]",
      "    }",
      "  }",
    ]);
    const result = await parseC4mlDraft(source, {
      file: "relative-guidance.c4ml",
    });

    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.routingByViewId?.["garden-pulse-context"]).toMatchObject({
      avoidanceRegions: [
        {
          id: "caretaker-space",
          strength: "soft",
          geometry: { kind: "node", referenceId: "caretaker", padding: 24 },
        },
        {
          id: "fixed-zone",
          strength: "hard",
          geometry: {
            kind: "absolute",
            bounds: { x: 500, y: 40, width: 80, height: 100 },
          },
        },
      ],
      controls: [
        {
          relationshipId: "caretaker-reviews-plan",
          avoidanceRegionIds: ["caretaker-space", "fixed-zone"],
          guidance: [
            {
              kind: "waypoint",
              anchor: { kind: "source-port", offset: { x: 18, y: 0 } },
            },
            {
              kind: "locked-segment",
              start: { kind: "canvas", point: { x: 300, y: 40 } },
              end: { kind: "canvas", point: { x: 360, y: 40 } },
            },
            {
              kind: "waypoint",
              anchor: {
                kind: "node",
                referenceId: "garden-pulse",
                side: "north",
                offset: { x: 0, y: -20 },
              },
            },
          ],
        },
      ],
    });
  });
});

describe("C4ML draft-1 completion contract", () => {
  it("recovers the model suggestion at document level after an invalid header", async () => {
    const source = "c4ml testdatei\n\n";
    const result = await completeC4mlDraft(source, {
      file: "untitled.c4ml",
      offset: source.length,
    });

    expect(result.candidates).toContainEqual({
      id: "draft-1:document:keyword:model",
      label: "model",
      kind: "keyword",
      detail: "C4ML keyword",
      documentation: "Opens the shared semantic architecture model.",
      edit: {
        text: "model",
        range: {
          start: { offset: source.length, line: 2, column: 0 },
          end: { offset: source.length, line: 2, column: 0 },
        },
      },
    });
  });

  it("recovers person and system suggestions inside a model after an invalid header", async () => {
    const source = `c4ml testdatei

model {

}`;
    const offset = source.indexOf("\n}");
    const result = await completeC4mlDraft(source, {
      file: "untitled.c4ml",
      offset,
    });

    expect(result.candidates.map(({ label }) => label)).toEqual([
      "person",
      "system",
    ]);
    expect(result.candidates.map(({ edit }) => edit.range)).toEqual([
      {
        start: { offset, line: 3, column: 0 },
        end: { offset, line: 3, column: 0 },
      },
      {
        start: { offset, line: 3, column: 0 },
        end: { offset, line: 3, column: 0 },
      },
    ]);
  });

  it("recovers view properties inside an incomplete view after an invalid header", async () => {
    const source = `c4ml testdatei

model {
}

view {

}`;
    const offset = source.lastIndexOf("\n}");
    const result = await completeC4mlDraft(source, {
      file: "untitled.c4ml",
      offset,
    });

    expect(result.candidates.map(({ kind, label }) => ({ kind, label }))).toEqual([
      { kind: "property", label: "allow-mixed-levels" },
      { kind: "property", label: "audience" },
      { kind: "property", label: "display" },
      { kind: "property", label: "environment" },
      { kind: "property", label: "legend" },
      { kind: "property", label: "purpose" },
      { kind: "property", label: "scope" },
      { kind: "property", label: "systems" },
      { kind: "property", label: "title" },
      { kind: "property", label: "type" },
    ]);
  });

  it("offers references declared in another project document", async () => {
    const relationSource = `c4ml draft-1

relations {
  relation caretaker-opens-garden {
    from = ${""}
    to = garden-pulse
    intent = "Opens the garden plan."
  }
}`;
    const offset = relationSource.indexOf("from = ") + "from = ".length;
    const result = await completeC4mlProjectDraft(
      createArchitectureProjectInput({
        id: "completion-project",
        documents: [
          {
            uri: "model/systems.c4ml",
            text: `c4ml draft-1

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
          { uri: "relations/relationships.c4ml", text: relationSource },
        ],
      }),
      "relations/relationships.c4ml",
      offset,
    );

    expect(result.candidates.map(({ label }) => label)).toEqual([
      "caretaker",
      "garden-pulse",
    ]);
  });

  it("offers only missing properties in the active element block", async () => {
    const marker = '    name = "Garden Caretaker"\n';
    const source = (await helloContextSource())
      .replace(marker, `${marker}    \n`)
      .replace(
        '    responsibility = "Reviews cultivation signals and schedules garden work."\n',
        "",
      )
      .replace("    classification = external\n", "");
    const offset = source.indexOf(marker) + marker.length + 4;
    const result = await completeC4mlDraft(source, {
      file: "editor.c4ml",
      offset,
    });

    expect(result.candidates.map(({ kind, label }) => ({ kind, label }))).toEqual([
      { kind: "property", label: "classification" },
      { kind: "property", label: "responsibility" },
    ]);
    expect(result.candidates[0]?.edit.range.start).toMatchObject({
      offset,
      line: 7,
      column: 4,
    });
  });

  it("offers declared elements for relationship endpoints", async () => {
    const source = (await helloContextSource()).replace(
      "from = caretaker",
      "from = ",
    );
    const offset = source.indexOf("from = ") + "from = ".length;
    const result = await completeC4mlDraft(source, { offset });

    expect(result.candidates.map(({ detail, kind, label }) => ({
      detail,
      kind,
      label,
    }))).toEqual([
      {
        detail: "Person reference",
        kind: "reference",
        label: "caretaker",
      },
      {
        detail: "Software System reference",
        kind: "reference",
        label: "garden-pulse",
      },
      {
        detail: "Software System reference",
        kind: "reference",
        label: "sensor-post",
      },
    ]);
  });

  it("restricts System Context scope references to Software Systems", async () => {
    const source = (await helloContextSource()).replace(
      "scope = garden-pulse",
      "scope = ",
    );
    const offset = source.indexOf("scope = ") + "scope = ".length;
    const result = await completeC4mlDraft(source, { offset });

    expect(result.candidates.map(({ label }) => label)).toEqual([
      "garden-pulse",
      "sensor-post",
    ]);
  });

  it("returns exact enum values and a replacement edit for partial input", async () => {
    const source = (await helloContextSource()).replace(
      "classification = external",
      "classification = ex",
    );
    const tokenOffset = source.indexOf("classification = ex") +
      "classification = ".length;
    const result = await completeC4mlDraft(source, {
      offset: tokenOffset + 2,
    });

    expect(result.candidates.map(({ kind, label }) => ({ kind, label }))).toEqual([
      { kind: "value", label: "external" },
    ]);
    expect(result.candidates[0]?.edit).toMatchObject({
      text: "external",
      range: {
        start: { offset: tokenOffset },
        end: { offset: tokenOffset + 2 },
      },
    });
  });

  it("rejects offsets outside the current source", async () => {
    await expect(
      completeC4mlDraft("c4ml draft-1", { offset: 99 }),
    ).rejects.toThrow("Completion offset must be inside the source text.");
  });

  it("offers only relationship references after route in a layout block", async () => {
    const source = (await helloContextSource()).replace(
      "    flow = right",
      "    flow = right\n    route ",
    );
    const offset = source.indexOf("    route ") + "    route ".length;
    const result = await completeC4mlDraft(source, { offset });

    expect(result.candidates.map(({ detail, label }) => ({ detail, label }))).toEqual([
      {
        detail: "Relationship reference",
        label: "caretaker-reviews-plan",
      },
      {
        detail: "Relationship reference",
        label: "sensor-publishes-observations",
      },
    ]);
  });

  it("offers only missing properties inside a pin", async () => {
    const source = (await helloContextSource()).replace(
      [
        "    pin garden-pulse {",
        "      x = 520du",
        "      y = 120du",
        "      strength = hard",
        "    }",
      ].join("\n"),
      ["    pin garden-pulse {", "      ", "    }"].join("\n"),
    );
    const offset = source.indexOf("    pin garden-pulse {") +
      "    pin garden-pulse {\n      ".length;
    const result = await completeC4mlDraft(source, { offset });

    expect(
      result.candidates
        .filter(({ kind }) => kind === "property")
        .map(({ label }) => label),
    ).toEqual(["strength", "x", "y"]);
  });

  it("offers only adjustment properties in an adjust block", async () => {
    const source = (await helloContextSource()).replace(
      [
        "    adjust sensor-post {",
        "      relative-to = automatic",
        "      move = left small",
        "      strength = soft",
        "    }",
      ].join("\n"),
      ["    adjust sensor-post {", "      ", "    }"].join("\n"),
    );
    const offset = source.indexOf("    adjust sensor-post {") +
      "    adjust sensor-post {\n      ".length;
    const result = await completeC4mlDraft(source, { offset });

    expect(
      result.candidates
        .filter(({ kind }) => kind === "property")
        .map(({ label }) => label),
    ).toEqual(["move", "move-x", "move-y", "relative-to", "strength"]);
  });

  it("limits route-block properties to the active routing context", async () => {
    const source = (await helloContextSource()).replace(
      "    flow = right",
      [
        "    flow = right",
        "    route caretaker-reviews-plan {",
        "      policy = guided",
        "      ",
        "    }",
      ].join("\n"),
    );
    const offset = source.indexOf("      \n") + 6;
    const result = await completeC4mlDraft(source, { offset });

    expect(
      result.candidates
        .filter(({ kind }) => kind === "property")
        .map(({ label }) => label),
    ).toEqual([
      "avoid",
      "corridor",
      "guide",
      "label-offset-x",
      "label-offset-y",
      "label-segment",
      "lane",
      "source-port",
      "style",
      "target-port",
      "via",
    ]);
    expect(result.candidates.some(({ label }) => label === "flow")).toBe(false);
    expect(result.candidates.some(({ label }) => label === "technology")).toBe(false);
  });

  it("asks for a route policy before offering policy-dependent controls", async () => {
    const source = (await helloContextSource()).replace(
      "      policy = guided",
      "      ",
    );
    const offset = source.indexOf("      \n") + 6;
    const result = await completeC4mlDraft(source, { offset });

    expect(
      result.candidates
        .filter(({ kind }) => kind === "property")
        .map(({ label }) => label),
    ).toEqual(["policy"]);
  });

  it("offers only route policies compatible with the controls already present", async () => {
    const guidedSource = (await helloContextSource()).replace(
      "policy = guided",
      "policy = ",
    );
    const guidedOffset = guidedSource.indexOf("policy = ") + "policy = ".length;
    const guidedCompletion = await completeC4mlDraft(guidedSource, {
      offset: guidedOffset,
    });

    expect(
      guidedCompletion.candidates
        .filter(({ kind }) => kind === "value")
        .map(({ label }) => label),
    ).toEqual(["guided"]);

    const fixedSource = replaceContextLayout(await helloContextSource(), [
      "  layout {",
      "    flow = right",
      "    route caretaker-reviews-plan {",
      "      policy = ",
      "      style = orthogonal",
      "      points = [(700, 146), (620, 146)]",
      "    }",
      "  }",
    ]);
    const fixedOffset = fixedSource.indexOf("policy = ") + "policy = ".length;
    const fixedCompletion = await completeC4mlDraft(fixedSource, {
      offset: fixedOffset,
    });

    expect(
      fixedCompletion.candidates
        .filter(({ kind }) => kind === "value")
        .map(({ label }) => label),
    ).toEqual(["fixed"]);
  });

  it("does not suggest an incomplete fixed policy for an otherwise empty route", async () => {
    const source = replaceContextLayout(await helloContextSource(), [
      "  layout {",
      "    flow = right",
      "    route caretaker-reviews-plan {",
      "      policy = ",
      "    }",
      "  }",
    ]);
    const offset = source.indexOf("policy = ") + "policy = ".length;
    const result = await completeC4mlDraft(source, { offset });

    expect(
      result.candidates
        .filter(({ kind }) => kind === "value")
        .map(({ label }) => label),
    ).toEqual(["automatic", "guided"]);
  });
});

describe("C4ML draft-1 highlighting contract", () => {
  it("classifies source spans with the authoritative lexer", () => {
    const source = [
      "c4ml draft-1",
      "// Original C4ML fixture",
      "model {",
      '  person gardener { name = "Garden Keeper" }',
      "}",
    ].join("\n");

    const highlights = highlightC4mlDraft(source);
    const highlighted = highlights.map(({ kind, range }) => ({
      kind,
      text: source.slice(range.start.offset, range.end.offset),
    }));

    expect(highlighted).toContainEqual({ kind: "keyword", text: "c4ml" });
    expect(highlighted).toContainEqual({
      kind: "declaration",
      text: "person",
    });
    expect(highlighted).toContainEqual({
      kind: "comment",
      text: "// Original C4ML fixture",
    });
    expect(highlighted).toContainEqual({
      kind: "identifier",
      text: "gardener",
    });
    expect(highlighted).toContainEqual({ kind: "property", text: "name" });
    expect(highlighted).toContainEqual({ kind: "operator", text: "=" });
    expect(highlighted).toContainEqual({
      kind: "string",
      text: '"Garden Keeper"',
    });
  });

  it("distinguishes declaration words, properties, and predefined values", () => {
    const source = [
      "model {",
      '  system garden { name = "Garden" classification = internal }',
      "}",
    ].join("\n");
    const highlighted = highlightC4mlDraft(source).map(({ kind, range }) => ({
      kind,
      text: source.slice(range.start.offset, range.end.offset),
    }));

    expect(highlighted).toEqual(
      expect.arrayContaining([
        { kind: "declaration", text: "system" },
        { kind: "property", text: "classification" },
        { kind: "value", text: "internal" },
      ]),
    );
  });

  it("keeps recovered tokens available while source is incomplete", () => {
    const source = 'model { software-system garden { name = "unfinished';
    const highlights = highlightC4mlDraft(source);

    expect(
      highlights.map(({ kind, range }) => ({
        kind,
        text: source.slice(range.start.offset, range.end.offset),
      })),
    ).toEqual(
      expect.arrayContaining([
        { kind: "declaration", text: "model" },
        { kind: "identifier", text: "garden" },
      ]),
    );
  });
});

describe("C4ML draft-1 Container slice", () => {
  it("lowers Container ownership, technology, protocols, and a Container View", async () => {
    const result = await parseC4mlDraft(await helloContainerSource(), {
      file: "examples/draft/hello-container.c4ml",
    });

    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(
      result.model?.elements.find(({ id }) => id === "path-service"),
    ).toMatchObject({
      kind: "container",
      softwareSystemId: "route-canvas",
      technology: "TypeScript service",
    });
    expect(
      result.model?.relationships.find(
        ({ id }) => id === "console-requests-path",
      ),
    ).toMatchObject({ technology: "HTTPS/JSON" });
    expect(
      result.model?.relationships.find(
        ({ id }) => id === "service-writes-store",
      ),
    ).toMatchObject({ protocol: "PostgreSQL wire protocol" });
    expect(result.views?.[0]).toMatchObject({
      id: "route-canvas-containers",
      kind: "container",
      softwareSystemId: "route-canvas",
    });
    expect(result.resolvedViews?.[0]?.elements.map(({ id }) => id)).toEqual([
      "path-service",
      "planning-console",
      "route-planner",
      "route-store",
      "terrain-feed",
    ]);
  });

  it("requires Container technology and a protocol or technology between Containers", async () => {
    const source = (await helloContainerSource())
      .replace('    technology = "TypeScript service"\n', "")
      .replace('    technology = "HTTPS/JSON"\n', "");
    const result = await parseC4mlDraft(source);

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map(({ code }) => code)).toContain(
      "C4ML-LANG-101",
    );

    const relationshipOnly = (await helloContainerSource()).replace(
      '    technology = "HTTPS/JSON"\n',
      "",
    );
    const relationshipResult = await parseC4mlDraft(relationshipOnly);
    expect(relationshipResult.diagnostics.map(({ code }) => code)).toContain(
      "C4ML-SEM-015",
    );
  });

  it("offers only Container properties inside a Container declaration", async () => {
    const marker = '    name = "Planning Console"\n';
    const source = (await helloContainerSource())
      .replace(marker, `${marker}    \n`)
      .replace(
        '    responsibility = "Presents route proposals and accepts planning changes."\n',
        "",
      )
      .replace('    technology = "TypeScript web application"\n', "");
    const offset = source.indexOf(marker) + marker.length + 4;
    const result = await completeC4mlDraft(source, { offset });

    expect(result.candidates.map(({ kind, label }) => ({ kind, label }))).toEqual([
      { kind: "property", label: "responsibility" },
      { kind: "property", label: "technology" },
    ]);
  });

  it("offers only Software Systems as Container owners", async () => {
    const source = (await helloContainerSource()).replace(
      "inside route-canvas",
      "inside ",
    );
    const offset = source.indexOf("inside ") + "inside ".length;
    const result = await completeC4mlDraft(source, { offset });

    expect(result.candidates.map(({ detail, label }) => ({ detail, label }))).toEqual([
      { detail: "Software System reference", label: "route-canvas" },
      { detail: "Software System reference", label: "terrain-feed" },
    ]);
  });

  it("offers all seven executable view types", async () => {
    const source = (await helloContainerSource()).replace(
      "type = container",
      "type = ",
    );
    const offset = source.indexOf("type = ") + "type = ".length;
    const result = await completeC4mlDraft(source, { offset });

    expect(result.candidates.map(({ label }) => label)).toEqual([
      "code",
      "component",
      "container",
      "deployment",
      "dynamic",
      "system-context",
      "system-landscape",
    ]);
  });
});

describe("C4ML draft-1 Component and Code slices", () => {
  it("lowers the complete static ownership hierarchy and all four static views", async () => {
    const result = await parseC4mlDraft(await helloStaticZoomSource(), {
      file: "examples/draft/hello-static-zoom.c4ml",
    });

    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(
      result.model?.elements.find(({ id }) => id === "arrangement-engine"),
    ).toMatchObject({
      kind: "component",
      containerId: "planning-service",
      technology: "TypeScript component",
    });
    expect(
      result.model?.elements.find(({ id }) => id === "candidate-ranker"),
    ).toMatchObject({
      kind: "code-element",
      componentId: "arrangement-engine",
      codeKind: "function",
      language: "TypeScript",
    });
    expect(result.views).toMatchObject([
      {
        id: "workshop-lens-components",
        kind: "component",
        containerId: "planning-service",
      },
      {
        id: "arrangement-engine-code",
        kind: "code",
        componentId: "arrangement-engine",
      },
      {
        id: "workshop-lens-containers",
        kind: "container",
        softwareSystemId: "workshop-lens",
      },
      {
        id: "workshop-lens-context",
        kind: "system-context",
        softwareSystemId: "workshop-lens",
      },
    ]);
    expect(
      result.resolvedViews
        ?.find(({ id }) => id === "workshop-lens-components")
        ?.elements.map(({ id }) => id),
    ).toEqual([
      "arrangement-engine",
      "request-gateway",
    ]);
    expect(
      result.resolvedViews
        ?.find(({ id }) => id === "arrangement-engine-code")
        ?.elements.map(({ id }) => id),
    ).toEqual([
      "candidate-ranker",
      "constraint-normalizer",
    ]);
  });

  it("requires Component technology and Code Element kind", async () => {
    const source = (await helloStaticZoomSource())
      .replace('    technology = "TypeScript component"\n', "")
      .replace("    code-kind = function\n", "");
    const result = await parseC4mlDraft(source);

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      "C4ML-LANG-101",
      "C4ML-LANG-101",
    ]);
    expect(result.diagnostics.map(({ message }) => message).join("\n")).toContain(
      "technology",
    );
    expect(result.diagnostics.map(({ message }) => message).join("\n")).toContain(
      "code-kind",
    );
  });

  it("offers only Containers as Component owners and Components as Code owners", async () => {
    const componentSource = (await helloStaticZoomSource()).replace(
      "component request-gateway inside planning-service",
      "component request-gateway inside ",
    );
    const componentOffset =
      componentSource.indexOf("component request-gateway inside ") +
      "component request-gateway inside ".length;
    const componentResult = await completeC4mlDraft(componentSource, {
      offset: componentOffset,
    });

    expect(componentResult.candidates.map(({ detail, label }) => ({ detail, label }))).toEqual([
      { detail: "Container reference", label: "browser-studio" },
      { detail: "Container reference", label: "plan-store" },
      { detail: "Container reference", label: "planning-service" },
    ]);

    const codeSource = (await helloStaticZoomSource()).replace(
      "code constraint-normalizer inside arrangement-engine",
      "code constraint-normalizer inside ",
    );
    const codeOffset =
      codeSource.indexOf("code constraint-normalizer inside ") +
      "code constraint-normalizer inside ".length;
    const codeResult = await completeC4mlDraft(codeSource, {
      offset: codeOffset,
    });

    expect(codeResult.candidates.map(({ detail, label }) => ({ detail, label }))).toEqual([
      { detail: "Component reference", label: "arrangement-engine" },
      { detail: "Component reference", label: "request-gateway" },
    ]);
  });

  it("restricts view scopes according to the selected zoom level", async () => {
    const source = (await helloStaticZoomSource())
      .replace("scope = planning-service", "scope = ")
      .replace("scope = arrangement-engine", "scope = ");
    const componentOffset = source.indexOf("scope = ") + "scope = ".length;
    const codeOffset =
      source.indexOf("scope = ", componentOffset) + "scope = ".length;
    const [componentResult, codeResult] = await Promise.all([
      completeC4mlDraft(source, { offset: componentOffset }),
      completeC4mlDraft(source, { offset: codeOffset }),
    ]);

    expect(componentResult.candidates.map(({ detail, label }) => ({ detail, label }))).toEqual([
      { detail: "Container reference", label: "browser-studio" },
      { detail: "Container reference", label: "plan-store" },
      { detail: "Container reference", label: "planning-service" },
    ]);
    expect(codeResult.candidates.map(({ detail, label }) => ({ detail, label }))).toEqual([
      { detail: "Component reference", label: "arrangement-engine" },
      { detail: "Component reference", label: "request-gateway" },
    ]);
  });

  it("offers only Code Element properties inside a Code declaration", async () => {
    const marker = '    name = "Candidate Ranker"\n';
    const source = (await helloStaticZoomSource())
      .replace(marker, `${marker}    \n`)
      .replace(
        '    responsibility = "Orders candidate arrangements by their satisfied constraints."\n',
        "",
      )
      .replace(
        '    code-kind = function\n    language = "TypeScript"\n',
        "",
      );
    const offset = source.indexOf(marker) + marker.length + 4;
    const result = await completeC4mlDraft(source, { offset });

    expect(result.candidates.map(({ kind, label }) => ({ kind, label }))).toEqual([
      { kind: "property", label: "code-kind" },
      { kind: "property", label: "language" },
      { kind: "property", label: "responsibility" },
    ]);
  });
});

describe("C4ML draft-1 Landscape and Dynamic slices", () => {
  it("lowers a named System Landscape and ordered Dynamic Interactions", async () => {
    const result = await parseC4mlDraft(await helloDynamicSource(), {
      file: "examples/draft/hello-dynamic.c4ml",
    });

    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.views?.[0]).toMatchObject({
      id: "release-portfolio",
      kind: "system-landscape",
      scope: "Release Operations",
    });
    expect(result.views?.[1]).toMatchObject({
      id: "finalize-release",
      kind: "dynamic",
      scenario: "Finalize a release decision",
      display: "collaboration",
      interactions: [
        {
          id: "submit-decision",
          order: 1,
          sourceId: "review-console",
          targetId: "decision-service",
          relationshipId: "console-submits-decision",
        },
        {
          id: "store-decision",
          order: 2,
          parallelGroup: "persist-and-publish",
          relationshipId: "service-stores-decision",
        },
        {
          id: "queue-notice",
          order: 2,
          parallelGroup: "persist-and-publish",
          relationshipId: "service-queues-notice",
        },
      ],
    });
    expect(
      result.resolvedViews
        ?.find(({ id }) => id === "finalize-release")
        ?.interactions.map(({ id, order }) => ({ id, order })),
    ).toEqual([
      { id: "submit-decision", order: 1 },
      { id: "queue-notice", order: 2 },
      { id: "store-decision", order: 2 },
    ]);
  });

  it("rejects element references where a named scenario or portfolio is required", async () => {
    const landscapeWithReference = (await helloDynamicSource()).replace(
      'scope = "Release Operations"',
      "scope = release-atlas",
    );
    const dynamicWithReference = (await helloDynamicSource()).replace(
      'scope = "Finalize a release decision"',
      "scope = release-atlas",
    );

    const [landscape, dynamic] = await Promise.all([
      parseC4mlDraft(landscapeWithReference),
      parseC4mlDraft(dynamicWithReference),
    ]);

    expect(landscape.diagnostics.map(({ code }) => code)).toContain(
      "C4ML-LANG-003",
    );
    expect(dynamic.diagnostics.map(({ code }) => code)).toContain(
      "C4ML-LANG-003",
    );
  });

  it("offers only declared static Relationships for an interaction relation", async () => {
    const source = (await helloDynamicSource()).replace(
      "relation = console-submits-decision",
      "relation = ",
    );
    const offset = source.indexOf("relation = ") + "relation = ".length;
    const result = await completeC4mlDraft(source, { offset });

    expect(result.candidates.every(({ detail }) => detail === "Relationship reference"))
      .toBe(true);
    expect(result.candidates.map(({ label }) => label)).toEqual([
      "console-submits-decision",
      "coordinator-uses-atlas",
      "register-supplies-atlas",
      "service-queues-notice",
      "service-stores-decision",
    ]);
  });

  it("offers Dynamic display values and missing interaction properties", async () => {
    const displaySource = (await helloDynamicSource()).replace(
      "display = collaboration",
      "display = ",
    );
    const displayOffset =
      displaySource.indexOf("display = ") + "display = ".length;
    const display = await completeC4mlDraft(displaySource, {
      offset: displayOffset,
    });
    expect(display.candidates.map(({ label }) => label)).toEqual([
      "collaboration",
      "sequence",
    ]);

    const marker = "  interaction submit-decision {\n";
    const propertySource = (await helloDynamicSource())
      .replace(marker, `${marker}    \n`)
      .replace("    order = 1\n", "")
      .replace("    relation = console-submits-decision\n", "");
    const propertyOffset =
      propertySource.indexOf(marker) + marker.length + 4;
    const properties = await completeC4mlDraft(propertySource, {
      offset: propertyOffset,
    });
    expect(properties.candidates.map(({ label }) => label)).toEqual([
      "order",
      "parallel",
      "relation",
    ]);
  });
});

describe("C4ML draft-1 Deployment slice", () => {
  it("lowers environments, nested nodes, infrastructure, instances, relationships, and the view", async () => {
    const result = await parseC4mlDraft(await helloDeploymentSource(), {
      file: "examples/draft/hello-deployment.c4ml",
    });

    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.model?.deployment?.environments.map(({ id }) => id)).toEqual([
      "production",
      "verification",
    ]);
    expect(result.model?.deployment?.nodes).toMatchObject([
      { id: "regional-cloud", environmentId: "production" },
      {
        id: "application-cluster",
        environmentId: "production",
        parentNodeId: "regional-cloud",
      },
      {
        id: "managed-data",
        environmentId: "production",
        parentNodeId: "regional-cloud",
      },
      { id: "verification-host", environmentId: "verification" },
    ]);
    expect(result.model?.deployment?.infrastructureNodes).toMatchObject([
      {
        id: "public-gateway",
        environmentId: "production",
        nodeId: "regional-cloud",
      },
    ]);
    expect(result.model?.deployment?.instances.map(({ id }) => id)).toEqual([
      "production-observer",
      "production-board",
      "production-service",
      "production-events",
      "verification-service",
    ]);
    expect(result.model?.deployment?.relationships).toMatchObject([
      {
        id: "gateway-forwards-board",
        sourceId: "public-gateway",
        targetId: "production-board",
      },
      {
        id: "board-calls-service",
        staticRelationshipId: "board-queries-service",
      },
      {
        id: "service-connects-events",
        staticRelationshipId: "service-reads-events",
      },
    ]);
    expect(result.views?.[0]).toMatchObject({
      id: "parcel-observer-production",
      kind: "deployment",
      environmentId: "production",
      softwareSystemIds: ["parcel-observer"],
      layout: { direction: "right" },
    });
    const resolved = result.resolvedViews?.[0];
    expect(resolved?.deploymentEnvironment?.id).toBe("production");
    expect(resolved?.deploymentNodes.map(({ id }) => id)).toEqual([
      "application-cluster",
      "managed-data",
      "regional-cloud",
    ]);
    expect(resolved?.infrastructureNodes.map(({ id }) => id)).toEqual([
      "public-gateway",
    ]);
    expect(resolved?.deploymentInstances.map(({ id }) => id)).toEqual([
      "production-board",
      "production-events",
      "production-observer",
      "production-service",
    ]);
  });

  it("keeps Deployment Node and endpoint references inside their Environment", async () => {
    const nodeSource = (await helloDeploymentSource()).replace(
      "infrastructure public-gateway on regional-cloud",
      "infrastructure public-gateway on ",
    );
    const nodeOffset =
      nodeSource.indexOf("infrastructure public-gateway on ") +
      "infrastructure public-gateway on ".length;
    const nodeResult = await completeC4mlDraft(nodeSource, {
      offset: nodeOffset,
    });
    expect(nodeResult.candidates.map(({ detail, label }) => ({ detail, label }))).toEqual([
      { detail: "Deployment Node reference", label: "application-cluster" },
      { detail: "Deployment Node reference", label: "managed-data" },
      { detail: "Deployment Node reference", label: "regional-cloud" },
    ]);

    const endpointSource = (await helloDeploymentSource()).replace(
      "from = production-board",
      "from = ",
    );
    const endpointOffset =
      endpointSource.indexOf("from = ", endpointSource.indexOf("deployment-relation board-calls-service")) +
      "from = ".length;
    const endpointResult = await completeC4mlDraft(endpointSource, {
      offset: endpointOffset,
    });
    expect(endpointResult.candidates.every(
      ({ detail }) => detail === "Deployment endpoint reference",
    )).toBe(true);
    expect(endpointResult.candidates.map(({ label }) => label)).toEqual([
      "production-board",
      "production-events",
      "production-observer",
      "production-service",
      "public-gateway",
    ]);
  });

  it("offers declared Environments and Software Systems to a Deployment View", async () => {
    const environmentSource = (await helloDeploymentSource()).replace(
      "environment = production",
      "environment = ",
    );
    const environmentOffset =
      environmentSource.lastIndexOf("environment = ") + "environment = ".length;
    const environmentResult = await completeC4mlDraft(environmentSource, {
      offset: environmentOffset,
    });
    expect(environmentResult.candidates.map(({ detail, label }) => ({ detail, label }))).toEqual([
      { detail: "Deployment Environment reference", label: "production" },
      { detail: "Deployment Environment reference", label: "verification" },
    ]);

    const systemsSource = (await helloDeploymentSource()).replace(
      "systems = [parcel-observer]",
      "systems = []",
    );
    const systemsOffset = systemsSource.lastIndexOf("systems = [") + "systems = [".length;
    const systemsResult = await completeC4mlDraft(systemsSource, {
      offset: systemsOffset,
    });
    expect(systemsResult.candidates.map(({ detail, label }) => ({ detail, label }))).toEqual([
      { detail: "Software System reference", label: "parcel-observer" },
    ]);
  });

  it("resolves and completes Deployment View Environments across project documents", async () => {
    const source = await helloDeploymentSource();
    const viewStart = source.indexOf("view parcel-observer-production");
    const deploymentSource = `c4ml draft-1\n\n${source
      .slice(source.indexOf("model {"), viewStart)
      .trim()}\n`;
    const viewSource = `c4ml draft-1\n\n${source.slice(viewStart).trim()}\n`;
    const project = createArchitectureProjectInput({
      id: "deployment-project",
      documents: [
        { uri: "deployment/runtime.c4ml", text: deploymentSource },
        { uri: "views/production.c4ml", text: viewSource },
      ],
    });

    const parsed = await parseC4mlProjectDraft(project);
    expect(parsed.valid).toBe(true);
    expect(parsed.resolvedViews?.[0]?.deploymentEnvironment?.id).toBe(
      "production",
    );

    const incompleteView = viewSource.replace(
      "environment = production",
      "environment = ",
    );
    const completionProject = createArchitectureProjectInput({
      id: "deployment-completion-project",
      documents: [
        { uri: "deployment/runtime.c4ml", text: deploymentSource },
        { uri: "views/production.c4ml", text: incompleteView },
      ],
    });
    const offset =
      incompleteView.indexOf("environment = ") + "environment = ".length;
    const completion = await completeC4mlProjectDraft(
      completionProject,
      "views/production.c4ml",
      offset,
    );
    expect(completion.candidates.map(({ label }) => label)).toEqual([
      "production",
      "verification",
    ]);
  });

  it("rejects cross-environment placement and mismatched static relationships", async () => {
    const crossEnvironment = (await helloDeploymentSource()).replace(
      "production-service of tracking-service on application-cluster",
      "production-service of tracking-service on verification-host",
    );
    const mismatch = (await helloDeploymentSource()).replace(
      "relation = board-queries-service",
      "relation = service-reads-events",
    );
    const [placement, relationship] = await Promise.all([
      parseC4mlDraft(crossEnvironment),
      parseC4mlDraft(mismatch),
    ]);

    expect(placement.diagnostics.map(({ code }) => code)).toContain(
      "C4ML-LANG-003",
    );
    expect(relationship.diagnostics.map(({ code }) => code)).toContain(
      "C4ML-DEP-016",
    );
  });

  it("requires the Deployment View environment and systems selection", async () => {
    const source = (await helloDeploymentSource())
      .replace("  environment = production\n", "")
      .replace("  systems = [parcel-observer]\n", "");
    const result = await parseC4mlDraft(source);

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      "C4ML-LANG-101",
      "C4ML-LANG-101",
    ]);
    expect(result.diagnostics.map(({ message }) => message).join("\n")).toContain(
      "environment",
    );
    expect(result.diagnostics.map(({ message }) => message).join("\n")).toContain(
      "systems",
    );
  });
});

describe("C4ML draft-1 System Context wizard source", () => {
  it("generates deterministic source that passes the normal parser and validator", async () => {
    const first = generateSystemContextDraft(defaultSystemContextWizardAnswers);
    const second = generateSystemContextDraft(defaultSystemContextWizardAnswers);

    expect(first).toEqual(second);
    expect(first.valid).toBe(true);
    expect(first.issues).toEqual([]);
    const parsed = await parseC4mlDraft(first.source!, {
      file: "wizard.c4ml",
    });
    expect(parsed.valid).toBe(true);
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.model?.elements.map(({ id }) => id)).toEqual([
      "customer",
      "online-shop",
    ]);
    expect(parsed.views?.[0]).toMatchObject({
      id: "online-shop-context",
      softwareSystemId: "online-shop",
      layout: { direction: "right" },
    });
  });

  it("escapes authored text without changing stable identifiers", async () => {
    const generated = generateSystemContextDraft({
      ...defaultSystemContextWizardAnswers,
      personName: 'Observer "North"',
      viewPurpose: "Show notes\\decisions.",
    });
    const parsed = await parseC4mlDraft(generated.source!);

    expect(generated.source).toContain('name = "Observer \\"North\\""');
    expect(parsed.valid).toBe(true);
    expect(parsed.model?.elements[0]?.name).toBe('Observer "North"');
  });

  it("generates an explicit Container starter with runnable parts and connections", async () => {
    const generated = generateSystemContextDraft({
      ...defaultSystemContextWizardAnswers,
      viewKind: "container",
      viewId: "online-shop-containers",
      viewTitle: "Container View — Online Shop",
      viewPurpose: "Show what runs inside the Online Shop and how the parts communicate.",
    });
    const parsed = await parseC4mlDraft(generated.source!, {
      file: "wizard.c4ml",
    });

    expect(generated.valid).toBe(true);
    expect(parsed.valid).toBe(true);
    expect(
      parsed.model?.elements.filter(({ kind }) => kind === "container").map(({ id }) => id),
    ).toEqual([
      "shop-web-interface",
      "admin-interface",
      "shop-service",
      "order-events",
      "shop-database",
      "product-media",
    ]);
    expect(parsed.model?.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: "shop-web-interface",
          targetId: "shop-service",
          protocol: "HTTPS/JSON",
        }),
        expect.objectContaining({
          sourceId: "shop-service",
          targetId: "order-events",
          protocol: "Kafka protocol",
        }),
        expect.objectContaining({
          sourceId: "shop-service",
          targetId: "shop-database",
          protocol: "PostgreSQL protocol",
        }),
        expect.objectContaining({
          sourceId: "shop-service",
          targetId: "product-media",
          protocol: "S3 API",
        }),
      ]),
    );
    expect(parsed.views?.[0]).toMatchObject({
      id: "online-shop-containers",
      kind: "container",
      softwareSystemId: "online-shop",
    });
  });

  it("reports invalid identifiers and empty required answers before generation", () => {
    const result = generateSystemContextDraft({
      ...defaultSystemContextWizardAnswers,
      personId: "not valid",
      relationshipIntent: "  ",
    });

    expect(result).toMatchObject({
      valid: false,
      source: undefined,
      issues: [
        { field: "personId", code: "C4ML-WIZARD-001" },
        { field: "relationshipIntent", code: "C4ML-WIZARD-002" },
      ],
    });
  });

  it("extends a valid document through bounded insertions without rewriting existing source", async () => {
    const source = [
      "c4ml draft-1",
      "",
      "// This comment and the deliberate spacing must survive byte for byte.",
      "model {",
      "  person caretaker {",
      '    name = "Caretaker"',
      '    responsibility = "Keeps the existing architecture healthy."',
      "    classification = internal",
      "  }",
      "}",
      "",
      "relations {",
      "  // Existing relationships stay where their author placed them.",
      "}",
      "",
      "view existing-landscape {",
      "  type = system-landscape",
      '  scope = "Existing architecture"',
      '  title = "Existing landscape"',
      '  purpose = "Retain this authored view."',
      "  audience = default",
      "  legend = generated",
      "}",
      "",
    ].join("\n");
    const project = createArchitectureProjectInput({
      id: "wizard-extension",
      documents: [{ uri: "architecture.c4ml", text: source }],
    });

    const proposal = await proposeC4mlWizardExtension(
      project,
      "architecture.c4ml",
      defaultSystemContextWizardAnswers,
    );

    expect(proposal.valid).toBe(true);
    if (!proposal.valid) return;
    expect(proposal.changeSet.edits).toHaveLength(3);
    expect(proposal.proposedText).toContain(
      "// This comment and the deliberate spacing must survive byte for byte.\nmodel {\n  person caretaker {",
    );
    expect(proposal.proposedText).toContain(
      "relations {\n  // Existing relationships stay where their author placed them.\n  relation customer-uses-online-shop",
    );
    expect(proposal.proposedText).toContain(
      'view existing-landscape {\n  type = system-landscape\n  scope = "Existing architecture"\n  title = "Existing landscape"',
    );
    const parsed = await parseC4mlDraft(proposal.proposedText);
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.model?.elements.map(({ id }) => id)).toEqual([
      "caretaker",
      "customer",
      "online-shop",
    ]);
    expect(parsed.views?.map(({ id }) => id)).toEqual([
      "existing-landscape",
      "online-shop-context",
    ]);
  });

  it("rejects duplicate IDs and invalid target documents without changing the project", async () => {
    const source = [
      "c4ml draft-1",
      "",
      "model {",
      "  system online-shop {",
      '    name = "Existing shop"',
      '    responsibility = "Already owns this stable identifier."',
      "    classification = internal",
      "  }",
      "}",
      "",
      "relations {",
      "}",
      "",
    ].join("\n");
    const project = createArchitectureProjectInput({
      id: "wizard-duplicate",
      documents: [{ uri: "architecture.c4ml", text: source }],
    });

    const duplicate = await proposeC4mlWizardExtension(
      project,
      "architecture.c4ml",
      defaultSystemContextWizardAnswers,
    );
    const missing = await proposeC4mlWizardExtension(
      project,
      "missing.c4ml",
      defaultSystemContextWizardAnswers,
    );

    expect(duplicate).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-WIZARD-103" }],
    });
    expect(missing).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-WIZARD-102" }],
    });
    expect(project.documents[0]?.text).toBe(source);
  });
});

describe("draft help context", () => {
  it("maps executable syntax owners to stable help topics", async () => {
    const source = await readFile(helloContextUrl, "utf8");

    expect(
      helpContextAtC4mlDraft(source, source.indexOf("person caretaker") + 8)
        .topicId,
    ).toBe("people");
    expect(
      helpContextAtC4mlDraft(
        source,
        source.indexOf("relation caretaker-reviews-plan") + 12,
      ).topicId,
    ).toBe("relationships");
    expect(
      helpContextAtC4mlDraft(
        source,
        source.indexOf("place caretaker") + 4,
      ).topicId,
    ).toBe("layout");
    expect(
      helpContextAtC4mlDraft(
        source,
        source.indexOf("route caretaker-reviews-plan") + 8,
      ).topicId,
    ).toBe("routes");
    expect(
      helpContextAtC4mlDraft(
        source,
        source.indexOf("view garden-pulse-context") + 6,
      )
        .topicId,
    ).toBe("views");
  });

  it("falls back safely and rejects offsets outside the source", () => {
    expect(helpContextAtC4mlDraft("c4ml draft-1", 0).topicId).toBe(
      "getting-started",
    );
    expect(() => helpContextAtC4mlDraft("c4ml draft-1", 99)).toThrow(
      "Help offset must be inside the source text.",
    );
  });
});

function semanticSnapshot(result: Awaited<ReturnType<typeof parseC4mlDraft>>) {
  return {
    elements: result.model?.elements.map(
      ({ id, kind, name, description, classification }) => ({
        id,
        kind,
        name,
        description,
        classification,
      }),
    ),
    relationships: result.model?.relationships.map(
      ({ id, sourceId, targetId, description }) => ({
        id,
        sourceId,
        targetId,
        description,
      }),
    ),
    views: result.views?.map(
      ({ id, kind, title, purpose, legend, layout }) => ({
        id,
        kind,
        title,
        purpose,
        legend,
        layout,
      }),
    ),
  };
}
