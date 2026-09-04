import { describe, expect, it } from "vitest";

import {
  compileArchitectureDiagram,
  builtInShapes,
  estimateRouteLabelSize,
  prepareDiagram,
  resolveArchitectureView,
  type ArchitectureView,
  type LayoutAdapter,
  type LayoutNodeResult,
  type LayoutRequest,
  type LayoutResult,
} from "../src/index.js";
import {
  signalGardenModel,
  signalGardenViews,
} from "./signal-garden.fixture.js";

const containerView = signalGardenViews.find(
  (view): view is Extract<ArchitectureView, { kind: "container" }> =>
    view.kind === "container",
)!;

const groupedContainerView: ArchitectureView = {
  ...containerView,
  groups: [
    {
      id: "cultivation-core",
      title: "Cultivation Core",
      description: "Coordinates plans and notifications.",
      members: [
        { kind: "element", id: "cultivation-api" },
        { kind: "element", id: "notify-worker" },
      ],
      layout: { padding: 34 },
    },
  ],
};

class ControlledLayoutAdapter implements LayoutAdapter {
  readonly adapterId: string = "test.controlled-layout";

  async layout(request: LayoutRequest): Promise<LayoutResult> {
    const positions: Readonly<Record<string, readonly [number, number, number, number]>> = {
      "scope:signal-containers": [150, 80, 700, 460],
      "group:cultivation-core": [420, 120, 360, 350],
      "element:grower": [0, 180, 120, 132],
      "element:weather-beacon": [900, 180, 180, 132],
      "element:studio-ui": [190, 160, 250, 132],
      "element:cultivation-api": [450, 160, 250, 132],
      "element:ledger-store": [190, 330, 250, 132],
      "element:notify-worker": [450, 330, 250, 132],
    };
    const nodes = request.nodes.map((node): LayoutNodeResult => {
      const position = positions[node.id];
      if (position === undefined) {
        throw new Error(`Missing test position for ${node.id}.`);
      }
      return {
        ...node,
        x: position[0],
        y: position[1],
        width: position[2],
        height: position[3],
      };
    });
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    return {
      requestId: request.id,
      width: 1080,
      height: 560,
      nodes,
      edges: request.edges.map((edge) => {
        const source = nodeById.get(edge.sourceId)!;
        const target = nodeById.get(edge.targetId)!;
        return {
          id: edge.id,
          sections: [
            {
              start: {
                x: source.x + source.width,
                y: source.y + source.height / 2,
              },
              bends: [],
              end: { x: target.x, y: target.y + target.height / 2 },
            },
          ],
        };
      }),
    };
  }
}

/**
 * Behaves like ControlledLayoutAdapter but spreads the two edges entering
 * Cultivation API along its west side, as a real engine does.
 */
class SpreadingLayoutAdapter extends ControlledLayoutAdapter {
  override readonly adapterId: string = "test.spreading-layout";

  override async layout(request: LayoutRequest): Promise<LayoutResult> {
    const base = await super.layout(request);
    return {
      ...base,
      edges: base.edges.map((edge) => {
        if (edge.id === "relationship:ui-calls-api") {
          return {
            id: edge.id,
            sections: [
              { start: { x: 440, y: 200 }, bends: [], end: { x: 450, y: 200 } },
            ],
          };
        }
        if (edge.id === "relationship:weather-feeds-api") {
          return {
            id: edge.id,
            sections: [
              {
                start: { x: 900, y: 250 },
                bends: [
                  { x: 900, y: 310 },
                  { x: 445, y: 310 },
                  { x: 445, y: 250 },
                ],
                end: { x: 450, y: 250 },
              },
            ],
          };
        }
        return edge;
      }),
    };
  }
}

/** Reports where the engine reserved room for the ui-calls-api label. */
class LabelAwareLayoutAdapter extends SpreadingLayoutAdapter {
  override readonly adapterId: string = "test.label-aware-layout";

  override async layout(request: LayoutRequest): Promise<LayoutResult> {
    const base = await super.layout(request);
    return {
      ...base,
      edges: base.edges.map((edge) =>
        edge.id === "relationship:ui-calls-api"
          ? { ...edge, labelCenter: { x: 445, y: 180 } }
          : edge,
      ),
    };
  }
}

describe("diagram compiler pipeline", () => {
  it("prepares semantic scope and view-local groups without changing the model", () => {
    const resolved = resolveArchitectureView(
      signalGardenModel,
      groupedContainerView,
    );
    const diagram = prepareDiagram(groupedContainerView, resolved.views[0]!);

    expect(resolved.valid).toBe(true);
    expect(
      diagram.nodes.find(({ id }) => id === "group:cultivation-core")
        ?.parentId,
    ).toBe("scope:signal-containers");
    expect(
      diagram.nodes.find(({ id }) => id === "element:cultivation-api")
        ?.parentId,
    ).toBe("group:cultivation-core");
    expect(
      diagram.nodes.find(({ id }) => id === "element:studio-ui")?.parentId,
    ).toBe("scope:signal-containers");
    expect(resolved.views[0]?.elements).toEqual(
      resolveArchitectureView(signalGardenModel, containerView).views[0]
        ?.elements,
    );
  });

  it("asks the layout engine to reserve each relationship label's footprint", () => {
    const resolved = resolveArchitectureView(
      signalGardenModel,
      groupedContainerView,
    );
    const diagram = prepareDiagram(groupedContainerView, resolved.views[0]!);
    const edge = diagram.edges.find(
      ({ referenceId }) => referenceId === "ui-calls-api",
    )!;
    const layoutEdge = diagram.layoutRequest.edges.find(
      ({ id }) => id === edge.id,
    );

    expect(layoutEdge?.label).toEqual(
      estimateRouteLabelSize(edge.label, edge.technology),
    );
    expect(layoutEdge?.label?.width).toBeGreaterThan(48);
    expect(layoutEdge?.label?.height).toBeGreaterThan(13);
    for (const candidate of diagram.layoutRequest.edges) {
      expect(candidate.label).toBeDefined();
    }
  });

  it("places an automatic route's label where the engine reserved room", async () => {
    const result = await compileArchitectureDiagram({
      model: signalGardenModel,
      view: groupedContainerView,
      layoutAdapter: new LabelAwareLayoutAdapter(),
    });

    expect(result.valid).toBe(true);
    const route = result.routes?.find(
      ({ relationshipId }) => relationshipId === "ui-calls-api",
    )!;
    // The engine reported the label centre beside the edge (ELK keeps the
    // labels of parallel edges on opposite sides); the route adopts that
    // position and only records which segment the label belongs to.
    expect(route.labelSegment).toBe(0);
    expect(route.labelPoint).toEqual({ x: 445, y: 180 });
    const scene = result.scene?.routes.find(
      ({ relationshipId }) => relationshipId === "ui-calls-api",
    );
    expect(scene?.labelPoint.x).toBe(445 + 40);
  });

  it("grows the scene instead of clipping geometry placed at negative coordinates", async () => {
    class ShiftedLayoutAdapter extends ControlledLayoutAdapter {
      override readonly adapterId: string = "test.shifted-layout";

      override async layout(request: LayoutRequest): Promise<LayoutResult> {
        const base = await super.layout(request);
        return {
          ...base,
          nodes: base.nodes.map((node) =>
            node.id === "element:grower"
              ? { ...node, x: -120, y: -30 }
              : node,
          ),
        };
      }
    }
    const reference = await compileArchitectureDiagram({
      model: signalGardenModel,
      view: groupedContainerView,
      layoutAdapter: new ControlledLayoutAdapter(),
    });
    const shifted = await compileArchitectureDiagram({
      model: signalGardenModel,
      view: groupedContainerView,
      layoutAdapter: new ShiftedLayoutAdapter(),
    });

    expect(shifted.valid).toBe(true);
    const scene = shifted.scene!;
    const grower = scene.nodes.find(({ referenceId }) => referenceId === "grower")!;
    // The moved node starts at the padding, everything else keeps its
    // relative position, and the canvas covers the whole content.
    expect(grower.x).toBe(40);
    for (const node of scene.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(40);
      expect(node.x + node.width).toBeLessThanOrEqual(scene.width - 40);
      expect(node.y + node.height).toBeLessThanOrEqual(scene.height);
    }
    for (const route of scene.routes) {
      for (const point of route.points) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(scene.width);
      }
    }
    expect(scene.width).toBe(reference.scene!.width + 120);
    expect(shifted.svg).toContain(`viewBox="0 0 ${scene.width} ${scene.height}"`);
  });

  it("renders deterministic SVG with automatic, guided, and fixed routes", async () => {
    const request = {
      model: signalGardenModel,
      view: groupedContainerView,
      layoutAdapter: new ControlledLayoutAdapter(),
      routing: {
        corridors: [
          {
            id: "east-lane",
            orientation: "vertical" as const,
            coordinate: 790,
            lanes: 2,
            laneSpacing: 18,
          },
        ],
        controls: [
          {
            relationshipId: "ui-calls-api",
            policy: "fixed" as const,
            style: "orthogonal" as const,
            points: [
              { x: 440, y: 226 },
              { x: 450, y: 226 },
            ],
            labelSegment: 0,
          },
          {
            relationshipId: "api-enqueues-notice",
            policy: "guided" as const,
            style: "orthogonal" as const,
            sourcePort: "south" as const,
            targetPort: "north" as const,
            corridor: { corridorId: "east-lane", lane: 1 },
            labelSegment: 1,
          },
        ],
      },
      scene: { fontFamily: "IBM Plex Sans" },
      svg: {
        embeddedFontFaces: [
          {
            family: "IBM Plex Sans",
            style: "normal" as const,
            weight: 400,
            format: "woff2" as const,
            dataUrl: "data:font/woff2;base64,d09GMgAAAAA=",
          },
        ],
      },
    };

    const first = await compileArchitectureDiagram(request);
    const second = await compileArchitectureDiagram(request);
    const svg = first.svg!;

    expect(first.valid).toBe(true);
    expect(svg).toBe(second.svg);
    expect(first.routes?.map(({ policy }) => policy)).toContain("automatic");
    expect(first.routes?.map(({ policy }) => policy)).toContain("guided");
    expect(first.routes?.map(({ policy }) => policy)).toContain("fixed");
    expect(svg).toContain("Cultivation Core");
    expect(svg).toContain("data-c4ml-route-policy=\"guided\"");
    expect(svg).toContain("data-c4ml-route-policy=\"fixed\"");
    expect(svg).toContain("Applies planning rules and coordinates");
    expect(svg).not.toContain("<image");
    expect(svg).not.toContain("<marker");
    expect(svg).not.toContain("marker-end");
    expect(svg).toContain("id=\"diagram-route-arrows\"");
    expect(svg).toContain("id=\"diagram-ports\"");
    expect(svg).toContain("class=\"route-arrow");
    expect(svg).not.toContain("route-label-background");
    expect(svg).not.toContain("diagram-route-label-backgrounds");
    expect(svg).toMatch(/class="route[^"]*"[^>]+d="M [^"]+ M [^"]+"/u);
    expect(svg).toContain("data-c4ml-port-side=\"south\"");
    expect(svg).toContain("data-c4ml-shape=\"c4ml-person\"");
    expect(svg).toContain(
      "class=\"element-content element-content-person\"",
    );
    expect(svg).toContain("class=\"element-type person-type\"");
    expect(svg).toContain("data-c4ml-theme=\"c4ml-blue\"");
    expect(svg).toContain('font-family="IBM Plex Sans"');
    expect(svg).toContain('@font-face { font-family: "IBM Plex Sans";');
    expect(svg).toContain("data-c4ml-element-role=\"person\"");
    expect(svg).toContain("data-c4ml-element-role=\"container\"");
    expect(svg).toContain("class=\"legend-swatch element-surface\"");
    expect(svg).toContain("data-c4ml-legend=\"Visual Group\"");
    expect(svg.indexOf("id=\"diagram-elements\"")).toBeLessThan(
      svg.indexOf("id=\"diagram-route-arrows\""),
    );

    const guided = first.routes?.find(
      ({ relationshipId }) => relationshipId === "api-enqueues-notice",
    );
    expect(guided).toBeDefined();
    expect(guided!.sourcePort.side).toBe("south");
    expect(guided!.targetPort.side).toBe("north");
    expect(guided!.corridor).toEqual({
      corridorId: "east-lane",
      lane: 1,
      orientation: "vertical",
      coordinate: 790,
      laneCoordinate: 799,
      lanes: 2,
      laneSpacing: 18,
    });
    expect(
      first.scene?.routes.find(
        ({ relationshipId }) => relationshipId === "api-enqueues-notice",
      )?.corridor,
    ).toEqual({
      corridorId: "east-lane",
      lane: 1,
      orientation: "vertical",
      coordinate: 830,
      laneCoordinate: 839,
      lanes: 2,
      laneSpacing: 18,
    });
    expect(first.scene?.ports).toHaveLength((first.routes?.length ?? 0) * 2);
    expect(first.scene?.arrowheads).toHaveLength(first.routes?.length ?? 0);
    expect(
      first.scene?.routes.every(
        ({ labelBounds }) => labelBounds.width > 0 && labelBounds.height > 0,
      ),
    ).toBe(true);
    expect(
      first.scene?.routes.some(({ labelLines }) => labelLines.length > 1),
    ).toBe(true);
    expect(svg).toContain('<text class="route-label"><tspan');
    expect(first.scene?.arrowheads[0]?.points).toHaveLength(3);
    const firstSceneRoute = first.scene!.routes[0]!;
    const firstTargetPort = first.scene!.ports.find(
      ({ id }) => id === firstSceneRoute.targetPortId,
    )!;
    const firstArrowhead = first.scene!.arrowheads.find(
      ({ routeId }) => routeId === firstSceneRoute.id,
    )!;
    expect(
      Math.hypot(
        firstArrowhead.points[0]!.x - firstTargetPort.point.x,
        firstArrowhead.points[0]!.y - firstTargetPort.point.y,
      ),
    ).toBeCloseTo(2);
    const start = guided!.points[0]!;
    const sourceExit = guided!.points[1]!;
    const targetEntry = guided!.points.at(-2)!;
    const end = guided!.points.at(-1)!;
    expect(sourceExit.x).toBe(start.x);
    expect(sourceExit.y).toBeGreaterThan(start.y);
    expect(targetEntry.x).toBe(end.x);
    expect(targetEntry.y).toBeLessThan(end.y);

    const themed = await compileArchitectureDiagram({
      ...request,
      scene: {
        theme: {
          id: "orchid-night",
          preset: "c4ml-blue",
          elements: {
            container: { internal: { fill: "#3B1F5A" } },
          },
        },
      },
    });
    expect(themed.valid).toBe(true);
    expect(themed.svg).toContain("data-c4ml-theme=\"orchid-night\"");
    expect(themed.svg).toContain(
      ".element-role-container.element-state-internal .element-surface { fill: #3B1F5A;",
    );

    const externalFont = await compileArchitectureDiagram({
      ...request,
      svg: {
        embeddedFontFaces: [
          {
            family: "IBM Plex Sans",
            style: "normal",
            weight: 400,
            format: "woff2",
            dataUrl: "https://fonts.invalid/plex.woff2",
          },
        ],
      },
    });
    expect(externalFont.valid).toBe(false);
    expect(externalFont.diagnostics.map(({ code }) => code)).toContain(
      "C4ML-SVG-009",
    );
  });

  it("gives the built-in Person a portrait layout footprint", () => {
    const contextView = signalGardenViews.find(
      (view): view is Extract<ArchitectureView, { kind: "system-context" }> =>
        view.kind === "system-context",
    )!;
    const resolved = resolveArchitectureView(signalGardenModel, contextView);
    const diagram = prepareDiagram(contextView, resolved.views[0]!);
    const person = diagram.layoutRequest.nodes.find(
      ({ id }) => id === "element:grower",
    );
    const system = diagram.layoutRequest.nodes.find(
      ({ id }) => id === "element:signal-garden",
    );

    expect(person).toMatchObject({ width: 210, height: 190 });
    expect(system).toMatchObject({ width: 250, height: 132 });
    expect(diagram.nodes.find(({ id }) => id === "element:grower")?.shapeId).toBe(
      "c4ml-person",
    );

    const personShape = builtInShapes.find(({ id }) => id === "c4ml-person")!;
    expect(personShape.ports).toEqual({
      north: { x: 50, y: 0 },
      east: { x: 100, y: 50 },
      south: { x: 50, y: 100 },
      west: { x: 0, y: 50 },
    });
    expect(
      personShape.primitives.map(({ kind, paint }) => ({ kind, paint })),
    ).toEqual([
      { kind: "rectangle", paint: "surface" },
      { kind: "ellipse", paint: "accent" },
      { kind: "rectangle", paint: "accent" },
    ]);
  });

  it("keeps the built-in box text clear of its accent rail", () => {
    const boxShape = builtInShapes.find(({ id }) => id === "c4ml-box")!;
    const accent = boxShape.primitives.find(
      (primitive) => primitive.kind === "rectangle" && primitive.paint === "accent",
    );

    expect(accent).toMatchObject({ x: 2.4, y: 6, width: 2.4, height: 88 });
    expect(boxShape.contentBox).toMatchObject({ x: 8, width: 84 });
    if (accent?.kind !== "rectangle") {
      throw new Error("Expected the built-in box accent rail to be a rectangle.");
    }
    expect(boxShape.contentBox.x - (accent.x + accent.width)).toBeGreaterThanOrEqual(
      2.4,
    );
  });

  it("can hide or restyle the built-in box bar as presentation", async () => {
    const withoutBar = await compileArchitectureDiagram({
      model: signalGardenModel,
      view: containerView,
      layoutAdapter: new ControlledLayoutAdapter(),
      shapes: { box: { bar: "off" } },
    });
    const styledBar = await compileArchitectureDiagram({
      model: signalGardenModel,
      view: containerView,
      layoutAdapter: new ControlledLayoutAdapter(),
      shapes: {
        box: { bar: "on", color: "#3D7FA8", transparency: 20 },
      },
    });

    expect(withoutBar.valid).toBe(true);
    expect(
      withoutBar.scene?.shapes
        .find(({ id }) => id === "c4ml-box")
        ?.primitives.some(({ paint }) => paint === "accent"),
    ).toBe(false);
    expect(styledBar.valid).toBe(true);
    expect(styledBar.svg).toContain(
      '<rect class="element-accent" style="fill:#3D7FA8;opacity:0.8"',
    );
  });

  it("reports an impossible fixed orthogonal route as a compiler diagnostic", async () => {
    const result = await compileArchitectureDiagram({
      model: signalGardenModel,
      view: groupedContainerView,
      layoutAdapter: new ControlledLayoutAdapter(),
      routing: {
        controls: [
          {
            relationshipId: "ui-calls-api",
            policy: "fixed",
            style: "orthogonal",
            points: [
              { x: 440, y: 226 },
              { x: 445, y: 210 },
              { x: 450, y: 226 },
            ],
          },
        ],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.svg).toBeUndefined();
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "C4ML-ROUTE-016" }),
      ]),
    );
  });

  it("rejects two relationships assigned to one exclusive corridor lane", async () => {
    const result = await compileArchitectureDiagram({
      model: signalGardenModel,
      view: groupedContainerView,
      layoutAdapter: new ControlledLayoutAdapter(),
      routing: {
        corridors: [
          {
            id: "exclusive-east",
            orientation: "vertical",
            coordinate: 790,
            lanes: 2,
            laneSpacing: 18,
          },
        ],
        controls: [
          {
            relationshipId: "api-enqueues-notice",
            policy: "guided",
            corridor: { corridorId: "exclusive-east", lane: 1 },
          },
          {
            relationshipId: "api-writes-ledger",
            policy: "guided",
            corridor: { corridorId: "exclusive-east", lane: 1 },
          },
        ],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.svg).toBeUndefined();
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "C4ML-ROUTE-023" }),
      ]),
    );
  });

  it("resolves relative waypoints and preserves ordered locked segments", async () => {
    const result = await compileArchitectureDiagram({
      model: signalGardenModel,
      view: groupedContainerView,
      layoutAdapter: new ControlledLayoutAdapter(),
      routing: {
        controls: [
          {
            relationshipId: "weather-feeds-api",
            policy: "guided",
            style: "orthogonal",
            sourcePort: "west",
            targetPort: "east",
            guidance: [
              {
                kind: "waypoint",
                anchor: {
                  kind: "node",
                  referenceId: "weather-beacon",
                  side: "north",
                  offset: { x: -50, y: -30 },
                },
              },
              {
                kind: "locked-segment",
                start: { kind: "canvas", point: { x: 820, y: 120 } },
                end: { kind: "canvas", point: { x: 760, y: 120 } },
              },
              {
                kind: "waypoint",
                anchor: { kind: "target-port", offset: { x: 18, y: -80 } },
              },
            ],
          },
        ],
      },
    });

    expect(result.valid).toBe(true);
    const route = result.routes?.find(
      ({ relationshipId }) => relationshipId === "weather-feeds-api",
    );
    expect(route?.waypoints).toEqual([
      expect.objectContaining({ point: { x: 940, y: 150 } }),
      expect.objectContaining({ point: { x: 718, y: 146 } }),
    ]);
    expect(route?.lockedSegments).toEqual([
      { start: { x: 820, y: 120 }, end: { x: 760, y: 120 }, segmentIndex: 5 },
    ]);
    expect(
      result.scene?.routes.find(
        ({ relationshipId }) => relationshipId === "weather-feeds-api",
      )?.lockedSegments[0],
    ).toMatchObject({ start: { x: 860, y: 246 }, end: { x: 800, y: 246 } });
  });

  it("detours around a hard avoidance region and exposes its effective bounds", async () => {
    const result = await compileArchitectureDiagram({
      model: signalGardenModel,
      view: groupedContainerView,
      layoutAdapter: new ControlledLayoutAdapter(),
      routing: {
        avoidanceRegions: [
          {
            id: "protected-strip",
            strength: "hard",
            geometry: {
              kind: "absolute",
              bounds: { x: 790, y: 230, width: 20, height: 32 },
            },
          },
        ],
        controls: [
          {
            relationshipId: "weather-feeds-api",
            policy: "guided",
            style: "orthogonal",
            sourcePort: "west",
            targetPort: "east",
            avoidanceRegionIds: ["protected-strip"],
          },
        ],
      },
    });

    expect(result.valid).toBe(true);
    const route = result.routes?.find(
      ({ relationshipId }) => relationshipId === "weather-feeds-api",
    );
    expect(route?.avoidanceRegions).toEqual([
      {
        id: "protected-strip",
        strength: "hard",
        bounds: { x: 790, y: 230, width: 20, height: 32 },
        relaxed: false,
      },
    ]);
    expect(route?.points).toEqual(
      expect.arrayContaining([
        { x: 778, y: 218 },
        { x: 822, y: 218 },
      ]),
    );
  });

  it("warns for relaxed soft avoidance and fails the same locked conflict when hard", async () => {
    const request = (strength: "hard" | "soft") => ({
      model: signalGardenModel,
      view: groupedContainerView,
      layoutAdapter: new ControlledLayoutAdapter(),
      routing: {
        avoidanceRegions: [
          {
            id: "protected-strip",
            strength,
            geometry: {
              kind: "absolute" as const,
              bounds: { x: 790, y: 230, width: 20, height: 32 },
            },
          },
        ],
        controls: [
          {
            relationshipId: "weather-feeds-api",
            policy: "guided" as const,
            style: "orthogonal" as const,
            sourcePort: "west" as const,
            targetPort: "east" as const,
            guidance: [
              {
                kind: "locked-segment" as const,
                start: { kind: "canvas" as const, point: { x: 850, y: 246 } },
                end: { kind: "canvas" as const, point: { x: 750, y: 246 } },
              },
            ],
            avoidanceRegionIds: ["protected-strip"],
          },
        ],
      },
    });

    const soft = await compileArchitectureDiagram(request("soft"));
    expect(soft.valid).toBe(true);
    expect(soft.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "C4ML-ROUTE-030", severity: "warning" }),
      ]),
    );
    expect(soft.routes?.find(
      ({ relationshipId }) => relationshipId === "weather-feeds-api",
    )?.avoidanceRegions[0]?.relaxed).toBe(true);

    const hard = await compileArchitectureDiagram(request("hard"));
    expect(hard.valid).toBe(false);
    expect(hard.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "C4ML-ROUTE-029" })]),
    );

    const direct = await compileArchitectureDiagram({
      model: signalGardenModel,
      view: groupedContainerView,
      layoutAdapter: new ControlledLayoutAdapter(),
      routing: {
        avoidanceRegions: request("hard").routing.avoidanceRegions,
        controls: [
          {
            relationshipId: "weather-feeds-api",
            policy: "guided",
            style: "direct",
            sourcePort: "west",
            targetPort: "east",
            avoidanceRegionIds: ["protected-strip"],
          },
        ],
      },
    });
    expect(direct.valid).toBe(false);
    expect(direct.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "C4ML-ROUTE-029" })]),
    );
  });

  it("renders an assigned custom shape without changing the element's C4 role", async () => {
    const result = await compileArchitectureDiagram({
      model: signalGardenModel,
      view: groupedContainerView,
      layoutAdapter: new ControlledLayoutAdapter(),
      shapes: {
        definitions: [
          {
            id: "signal-diamond",
            canvas: { width: 100, height: 100 },
            contentBox: { x: 22, y: 22, width: 56, height: 56 },
            ports: {
              north: { x: 50, y: 0 },
              east: { x: 100, y: 50 },
              south: { x: 50, y: 100 },
              west: { x: 0, y: 25 },
            },
            primitives: [
              {
                kind: "polygon",
                paint: "surface",
                points: [
                  { x: 50, y: 0 },
                  { x: 100, y: 50 },
                  { x: 50, y: 100 },
                  { x: 0, y: 50 },
                ],
              },
            ],
          },
        ],
        assignments: { "weather-beacon": "signal-diamond" },
      },
    });

    expect(result.valid).toBe(true);
    expect(
      result.scene?.nodes.find(
        ({ referenceId }) => referenceId === "weather-beacon",
      ),
    ).toMatchObject({
      elementRole: "software-system",
      shapeId: "signal-diamond",
    });
    expect(result.svg).toContain('data-c4ml-shape="signal-diamond"');
    expect(result.svg).toContain('<polygon class="element-surface"');
    // The test adapter attaches the edge to the diamond's east side; an open
    // outline must still leave from its declared east Port anchor (50 %), not
    // from wherever the adapter touched the bounding box.
    const route = result.routes?.find(
      ({ relationshipId }) => relationshipId === "weather-feeds-api",
    );
    expect(route?.sourcePort.side).toBe("east");
    expect(route?.sourcePort.point).toEqual({ x: 1080, y: 246 });
    expect(route?.points[0]).toEqual({ x: 1080, y: 246 });
    expect(route?.points[1]?.y).toBe(246);
  });

  it("keeps the layout adapter's boundary attachment for box shapes", async () => {
    const result = await compileArchitectureDiagram({
      model: signalGardenModel,
      view: groupedContainerView,
      layoutAdapter: new SpreadingLayoutAdapter(),
    });

    expect(result.valid).toBe(true);
    const routes = new Map(
      result.routes?.map((route) => [route.relationshipId, route]),
    );
    const uiCallsApi = routes.get("ui-calls-api")!;
    const weatherFeedsApi = routes.get("weather-feeds-api")!;

    // Two edges entering the same side keep the adapter's distinct points
    // instead of collapsing onto the side's centre anchor.
    expect(uiCallsApi.targetPort.side).toBe("west");
    expect(weatherFeedsApi.targetPort.side).toBe("west");
    expect(uiCallsApi.targetPort.point).toEqual({ x: 450, y: 200 });
    expect(weatherFeedsApi.targetPort.point).toEqual({ x: 450, y: 250 });
    // No terminal segment runs along the boundary: the last segment of each
    // route enters the west side horizontally.
    for (const route of [uiCallsApi, weatherFeedsApi]) {
      const [previous, last] = route.points.slice(-2);
      expect(last).toEqual(route.targetPort.point);
      expect(previous?.y).toBe(last?.y);
      expect(previous?.x).toBeLessThan(last!.x);
    }
    const arrowheads = result.scene?.arrowheads.filter(({ relationshipId }) =>
      ["ui-calls-api", "weather-feeds-api"].includes(relationshipId),
    );
    expect(new Set(arrowheads?.map(({ points }) => JSON.stringify(points))).size).toBe(2);
  });

  it("rejects a custom shape whose named port is not on its matching side", async () => {
    const result = await compileArchitectureDiagram({
      model: signalGardenModel,
      view: groupedContainerView,
      layoutAdapter: new ControlledLayoutAdapter(),
      shapes: {
        definitions: [
          {
            id: "invalid-port-shape",
            canvas: { width: 100, height: 100 },
            contentBox: { x: 10, y: 10, width: 80, height: 80 },
            ports: {
              north: { x: 50, y: 10 },
              east: { x: 100, y: 50 },
              south: { x: 50, y: 100 },
              west: { x: 0, y: 50 },
            },
            primitives: [
              {
                kind: "rectangle",
                paint: "surface",
                x: 0,
                y: 0,
                width: 100,
                height: 100,
              },
            ],
          },
        ],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "C4ML-SHAPE-005" }),
      ]),
    );
  });

  it("reports an unknown view theme as a compiler diagnostic", async () => {
    const result = await compileArchitectureDiagram({
      model: signalGardenModel,
      view: {
        ...groupedContainerView,
        presentation: { theme: "missing-theme" },
      },
      layoutAdapter: new ControlledLayoutAdapter(),
    });

    expect(result.valid).toBe(false);
    expect(result.svg).toBeUndefined();
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "C4ML-THEME-001" }),
      ]),
    );
  });
});
