import { describe, expect, it } from "vitest";

import {
  compileArchitectureDiagram,
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
  readonly adapterId = "test.controlled-layout";

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
    expect(svg).toContain("data-c4ml-port-side=\"south\"");
    expect(svg).toContain("data-c4ml-shape=\"c4ml-person\"");
    expect(svg).toContain("data-c4ml-theme=\"c4ml-blue\"");
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
    expect(first.scene?.ports).toHaveLength((first.routes?.length ?? 0) * 2);
    expect(first.scene?.arrowheads).toHaveLength(first.routes?.length ?? 0);
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
    expect(
      result.routes?.find(
        ({ relationshipId }) => relationshipId === "weather-feeds-api",
      )?.sourcePort.point.y,
    ).toBe(213);
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
