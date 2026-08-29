import { describe, expect, it } from "vitest";

import {
  applyPlacementConstraints,
  compileArchitectureDiagram,
  placementGapDu,
  placementStepDu,
  prepareDiagram,
  resolveArchitectureView,
  type ArchitectureView,
  type DiagramPlacementOptions,
  type LayoutAdapter,
  type LayoutRequest,
  type LayoutResult,
  type SourceReference,
} from "../src/index.js";
import {
  signalGardenModel,
  signalGardenViews,
} from "./signal-garden.fixture.js";

const contextView = signalGardenViews.find(
  (view): view is Extract<ArchitectureView, { kind: "system-context" }> =>
    view.kind === "system-context",
)!;

function source(line: number): SourceReference {
  return {
    file: "constraint-grid.c4ml",
    range: {
      start: { line, column: 0, offset: line * 20 },
      end: { line, column: 18, offset: line * 20 + 18 },
    },
  };
}

class CandidateLayoutAdapter implements LayoutAdapter {
  readonly adapterId = "test.constraint-candidate";

  async layout(request: LayoutRequest): Promise<LayoutResult> {
    const positions: Readonly<Record<string, readonly [number, number]>> = {
      "element:grower": [40, 40],
      "element:signal-garden": [180, 160],
      "element:weather-beacon": [460, 80],
    };
    const nodes = request.nodes.map((node) => ({
      ...node,
      x: positions[node.id]?.[0] ?? 0,
      y: positions[node.id]?.[1] ?? 0,
    }));
    return {
      requestId: request.id,
      width: 760,
      height: 420,
      nodes,
      edges: request.edges.map(({ id }) => ({ id, sections: [] })),
    };
  }
}

describe("placement constraints", () => {
  it("combines automatic geometry with hard relative placement, alignment, and one pin", async () => {
    const resolved = resolveArchitectureView(signalGardenModel, contextView);
    const diagram = prepareDiagram(contextView, resolved.views[0]!);
    const candidate = await new CandidateLayoutAdapter().layout(
      diagram.layoutRequest,
    );
    const placement = applyPlacementConstraints(diagram, candidate, {
      constraints: [
        {
          id: "pin-focus",
          kind: "pin",
          targetId: "signal-garden",
          x: 520,
          y: 220,
          strength: "hard",
          source: source(10),
        },
        {
          id: "grower-left",
          kind: "relative",
          relation: "left-of",
          subjectId: "grower",
          targetId: "signal-garden",
          gap: 120,
          strength: "hard",
          source: source(11),
        },
        {
          id: "grower-aligned",
          kind: "alignment",
          alignment: "center-y",
          subjectId: "grower",
          targetId: "signal-garden",
          strength: "hard",
          source: source(12),
        },
      ],
    });

    const grower = placement.layout.nodes.find(
      ({ id }) => id === "element:grower",
    )!;
    const focus = placement.layout.nodes.find(
      ({ id }) => id === "element:signal-garden",
    )!;
    expect(focus).toMatchObject({ x: 520, y: 220 });
    expect(grower.x + grower.width + 120).toBeLessThanOrEqual(focus.x);
    expect(grower.y + grower.height / 2).toBe(
      focus.y + focus.height / 2,
    );
    expect(placement.constraints.every(({ satisfied }) => satisfied)).toBe(
      true,
    );
  });

  it("relaxes a soft alignment that conflicts with two hard pins", async () => {
    const placement: DiagramPlacementOptions = {
      constraints: [
        {
          id: "pin-grower",
          kind: "pin",
          targetId: "grower",
          x: 40,
          y: 20,
          strength: "hard",
          source: source(20),
        },
        {
          id: "pin-focus",
          kind: "pin",
          targetId: "signal-garden",
          x: 400,
          y: 220,
          strength: "hard",
          source: source(21),
        },
        {
          id: "prefer-alignment",
          kind: "alignment",
          alignment: "center-y",
          subjectId: "grower",
          targetId: "signal-garden",
          strength: "soft",
          source: source(22),
        },
      ],
    };
    const result = await compileArchitectureDiagram({
      model: signalGardenModel,
      view: contextView,
      layoutAdapter: new CandidateLayoutAdapter(),
      placement,
    });

    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "C4ML-PLACEMENT-020",
          severity: "warning",
          source: source(22),
        }),
      ]),
    );
    expect(
      result.placement?.constraints.find(
        ({ id }) => id === "prefer-alignment",
      ),
    ).toMatchObject({ satisfied: false, relaxed: true });
    expect(result.routes?.every(({ style }) => style === "orthogonal")).toBe(
      true,
    );
  });

  it("reports every source involved in a hard pin and gap conflict", async () => {
    const result = await compileArchitectureDiagram({
      model: signalGardenModel,
      view: contextView,
      layoutAdapter: new CandidateLayoutAdapter(),
      placement: {
        constraints: [
          {
            id: "pin-grower",
            kind: "pin",
            targetId: "grower",
            x: 40,
            y: 40,
            strength: "hard",
            source: source(30),
          },
          {
            id: "pin-focus",
            kind: "pin",
            targetId: "signal-garden",
            x: 180,
            y: 40,
            strength: "hard",
            source: source(31),
          },
          {
            id: "impossible-gap",
            kind: "relative",
            relation: "left-of",
            subjectId: "grower",
            targetId: "signal-garden",
            gap: 120,
            strength: "hard",
            source: source(32),
          },
        ],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.svg).toBeUndefined();
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "C4ML-PLACEMENT-012",
      source: source(32),
    });
    expect(result.diagnostics[0]!.related.map(({ source }) => source)).toEqual(
      expect.arrayContaining([source(30), source(31)]),
    );
  });

  it("aligns a declared set against its explicit anchor", async () => {
    const resolved = resolveArchitectureView(signalGardenModel, contextView);
    const diagram = prepareDiagram(contextView, resolved.views[0]!);
    const candidate = await new CandidateLayoutAdapter().layout(diagram.layoutRequest);
    const result = applyPlacementConstraints(diagram, candidate, {
      constraints: [{
        id: "align-top-row",
        kind: "align",
        alignment: "top",
        nodeIds: ["grower", "signal-garden", "weather-beacon"],
        anchorId: "signal-garden",
        strength: "hard",
      }],
    });

    const y = result.layout.nodes.find(({ id }) => id === "element:signal-garden")!.y;
    expect(
      result.layout.nodes
        .filter(({ id }) => id.startsWith("element:"))
        .map((node) => node.y),
    ).toEqual([y, y, y]);
  });

  it("distributes an explicitly ordered set with a named-gap distance", async () => {
    const resolved = resolveArchitectureView(signalGardenModel, contextView);
    const diagram = prepareDiagram(contextView, resolved.views[0]!);
    const candidate = await new CandidateLayoutAdapter().layout(diagram.layoutRequest);
    const result = applyPlacementConstraints(diagram, candidate, {
      constraints: [{
        id: "distribute-context",
        kind: "distribute",
        orientation: "horizontal",
        nodeIds: ["grower", "signal-garden", "weather-beacon"],
        gap: placementGapDu.normal,
        strength: "hard",
      }],
    });
    const nodes = ["grower", "signal-garden", "weather-beacon"].map((id) =>
      result.layout.nodes.find((node) => node.id === `element:${id}`)!,
    );
    expect(nodes[1]!.x - nodes[0]!.x - nodes[0]!.width).toBe(placementGapDu.normal);
    expect(nodes[2]!.x - nodes[1]!.x - nodes[1]!.width).toBe(placementGapDu.normal);
  });

  it("adjusts selected axes relative to automatic candidate geometry", async () => {
    const resolved = resolveArchitectureView(signalGardenModel, contextView);
    const diagram = prepareDiagram(contextView, resolved.views[0]!);
    const candidate = await new CandidateLayoutAdapter().layout(diagram.layoutRequest);
    const result = applyPlacementConstraints(diagram, candidate, {
      constraints: [{
        id: "adjust-weather",
        kind: "adjust",
        targetId: "weather-beacon",
        relativeTo: "automatic",
        offsetX: -2 * placementStepDu,
        offsetY: placementGapDu.small,
        strength: "hard",
      }],
    });
    const weather = result.layout.nodes.find(({ id }) => id === "element:weather-beacon")!;
    expect(weather).toMatchObject({ x: 428, y: 112 });
    expect(result.constraints[0]).toMatchObject({ satisfied: true, relaxed: false });
  });

  it("rolls back a partially applicable soft set constraint atomically", async () => {
    const resolved = resolveArchitectureView(signalGardenModel, contextView);
    const diagram = prepareDiagram(contextView, resolved.views[0]!);
    const candidate = await new CandidateLayoutAdapter().layout(diagram.layoutRequest);
    const result = applyPlacementConstraints(diagram, candidate, {
      constraints: [
        {
          id: "pin-focus",
          kind: "pin",
          targetId: "signal-garden",
          x: 180,
          y: 160,
          strength: "hard",
        },
        {
          id: "prefer-distribution",
          kind: "distribute",
          orientation: "horizontal",
          nodeIds: ["grower", "signal-garden", "weather-beacon"],
          gap: placementGapDu.normal,
          strength: "soft",
        },
      ],
    });

    expect(
      result.layout.nodes.find(({ id }) => id === "element:weather-beacon"),
    ).toMatchObject({ x: 460, y: 80 });
    expect(
      result.constraints.find(({ id }) => id === "prefer-distribution"),
    ).toMatchObject({ satisfied: false, relaxed: true });
  });

  it("reports an earlier soft rule as relaxed when a later soft rule supersedes it", async () => {
    const resolved = resolveArchitectureView(signalGardenModel, contextView);
    const diagram = prepareDiagram(contextView, resolved.views[0]!);
    const candidate = await new CandidateLayoutAdapter().layout(diagram.layoutRequest);
    const result = applyPlacementConstraints(diagram, candidate, {
      constraints: [
        {
          id: "a-align-top",
          kind: "align",
          alignment: "top",
          nodeIds: ["grower", "weather-beacon"],
          anchorId: "grower",
          strength: "soft",
        },
        {
          id: "z-adjust-weather",
          kind: "adjust",
          targetId: "weather-beacon",
          relativeTo: "automatic",
          offsetY: placementGapDu.large,
          strength: "soft",
        },
      ],
    });

    expect(result.constraints).toMatchObject([
      { id: "a-align-top", satisfied: false, relaxed: true },
      { id: "z-adjust-weather", satisfied: true, relaxed: false },
    ]);
  });

  it("is deterministic when declarations arrive in another order", async () => {
    const resolved = resolveArchitectureView(signalGardenModel, contextView);
    const diagram = prepareDiagram(contextView, resolved.views[0]!);
    const candidate = await new CandidateLayoutAdapter().layout(
      diagram.layoutRequest,
    );
    const constraints: DiagramPlacementOptions["constraints"] = [
      {
        id: "weather-right",
        kind: "relative",
        relation: "right-of",
        subjectId: "weather-beacon",
        targetId: "signal-garden",
        gap: 100,
        strength: "hard",
      },
      {
        id: "grower-left",
        kind: "relative",
        relation: "left-of",
        subjectId: "grower",
        targetId: "signal-garden",
        gap: 100,
        strength: "hard",
      },
    ];

    const first = applyPlacementConstraints(diagram, candidate, { constraints });
    const second = applyPlacementConstraints(diagram, candidate, {
      constraints: [...constraints].reverse(),
    });
    expect(first).toEqual(second);
  });
});
