import { describe, expect, it } from "vitest";

import type {
  CompilerWorkerNavigation,
  CompilerWorkerCorridorNavigationTarget,
  CompilerWorkerNodeNavigationTarget,
  CompilerWorkerPortNavigationTarget,
  CompilerWorkerRouteLabelNavigationTarget,
  CompilerWorkerRouteNavigationTarget,
} from "../src/app/compiler-worker.protocol.js";
import {
  clientPointToScene,
  navigationTargetAtPoint,
  navigationTargetForOffset,
  svgWithNavigationHighlight,
} from "../src/app/preview-navigation.js";

const viewTarget: CompilerWorkerNodeNavigationTarget = {
  kind: "node",
  sceneObjectId: "scene-node:view",
  svgElementIds: ["c4ml-scene-node-view"],
  referenceId: "context",
  label: "Context",
  source: {
    file: "editor.c4ml",
    start: { offset: 100, line: 5, column: 0 },
    end: { offset: 500, line: 25, column: 1 },
  },
  relatedSources: [],
  nodeRole: "boundary",
  bounds: { x: 20, y: 20, width: 700, height: 400 },
};

const elementTarget: CompilerWorkerNodeNavigationTarget = {
  kind: "node",
  sceneObjectId: "scene-node:element:garden-pulse",
  svgElementIds: ["c4ml-scene-node-element-garden-pulse"],
  referenceId: "garden-pulse",
  label: "Garden Pulse",
  source: {
    file: "editor.c4ml",
    start: { offset: 180, line: 9, column: 2 },
    end: { offset: 260, line: 13, column: 3 },
  },
  relatedSources: [],
  nodeRole: "element",
  bounds: { x: 500, y: 80, width: 200, height: 120 },
};

const routeTarget: CompilerWorkerRouteNavigationTarget = {
  kind: "route",
  sceneObjectId: "scene-route:relationship:reviews-plan",
  svgElementIds: [
    "c4ml-scene-route-relationship-reviews-plan",
    "c4ml-scene-route-relationship-reviews-plan-arrowhead",
  ],
  referenceId: "reviews-plan",
  label: "Reviews plan",
  source: {
    file: "editor.c4ml",
    start: { offset: 520, line: 27, column: 2 },
    end: { offset: 620, line: 31, column: 3 },
  },
  relatedSources: [
    {
      file: "editor.c4ml",
      start: { offset: 800, line: 40, column: 4 },
      end: { offset: 940, line: 47, column: 5 },
    },
  ],
  policy: "guided",
  style: "orthogonal",
  sourcePortSelection: "east",
  targetPortSelection: "west",
  points: [
    { x: 220, y: 300 },
    { x: 460, y: 300 },
    { x: 460, y: 140 },
    { x: 500, y: 140 },
  ],
  sourcePort: {
    id: "scene-port:reviews-plan:source",
    role: "source",
    side: "east",
    point: { x: 220, y: 300 },
  },
  targetPort: {
    id: "scene-port:reviews-plan:target",
    role: "target",
    side: "west",
    point: { x: 500, y: 140 },
  },
  labelPoint: { x: 340, y: 300 },
  labelSegment: 0,
  corridor: {
    id: "lower-entry",
    orientation: "vertical",
    coordinate: 452,
    laneCoordinate: 460,
    lane: 1,
    lanes: 3,
    laneSpacing: 8,
    source: {
      file: "editor.c4ml",
      start: { offset: 760, line: 38, column: 4 },
      end: { offset: 798, line: 39, column: 5 },
    },
  },
  waypoints: [
    {
      anchorKind: "node",
      referenceId: "garden-pulse",
      side: "west",
      point: { x: 460, y: 300 },
    },
  ],
  lockedSegments: [
    {
      start: { x: 460, y: 300 },
      end: { x: 460, y: 140 },
      segmentIndex: 1,
    },
  ],
  avoidanceRegions: [
    {
      id: "quiet-zone",
      strength: "soft",
      bounds: { x: 360, y: 180, width: 70, height: 60 },
      relaxed: true,
      source: {
        file: "editor.c4ml",
        start: { offset: 720, line: 36, column: 4 },
        end: { offset: 758, line: 37, column: 5 },
      },
    },
  ],
};

const sourcePortTarget: CompilerWorkerPortNavigationTarget = {
  kind: "port",
  sceneObjectId: routeTarget.sourcePort.id,
  svgElementIds: ["c4ml-scene-port-reviews-plan-source"],
  referenceId: routeTarget.referenceId,
  label: "Source port · east",
  source: routeTarget.relatedSources[0]!,
  relatedSources: [],
  routeSceneObjectId: routeTarget.sceneObjectId,
  portRole: "source",
  side: "east",
  point: routeTarget.sourcePort.point,
};

const labelTarget: CompilerWorkerRouteLabelNavigationTarget = {
  kind: "route-label",
  sceneObjectId: `${routeTarget.sceneObjectId}:label`,
  svgElementIds: ["c4ml-scene-route-relationship-reviews-plan-label"],
  referenceId: routeTarget.referenceId,
  label: routeTarget.label,
  source: routeTarget.relatedSources[0]!,
  relatedSources: [],
  routeSceneObjectId: routeTarget.sceneObjectId,
  point: routeTarget.labelPoint,
  bounds: { x: 300, y: 278, width: 80, height: 28 },
};

const corridorTarget: CompilerWorkerCorridorNavigationTarget = {
  kind: "corridor",
  sceneObjectId: `${routeTarget.sceneObjectId}:corridor:lower-entry:1`,
  svgElementIds: [routeTarget.svgElementIds[0]!],
  referenceId: routeTarget.referenceId,
  label: "Corridor lower-entry · lane 2",
  source: routeTarget.relatedSources[0]!,
  relatedSources: [],
  routeSceneObjectId: routeTarget.sceneObjectId,
  orientation: "vertical",
  points: [
    { x: 460, y: 82 },
    { x: 460, y: 546 },
  ],
  lane: 1,
  lanes: 3,
};

describe("preview navigation", () => {
  it("selects the narrowest source or route-control range at the cursor", () => {
    expect(
      navigationTargetForOffset([viewTarget, elementTarget, routeTarget], 210)
        ?.referenceId,
    ).toBe("garden-pulse");
    expect(
      navigationTargetForOffset([viewTarget, routeTarget], 850)?.referenceId,
    ).toBe("reviews-plan");
    expect(
      navigationTargetForOffset([viewTarget, elementTarget, routeTarget], 50),
    ).toBeUndefined();
  });

  it("does not select an equally positioned target from another project file", () => {
    const otherFileTarget: CompilerWorkerNodeNavigationTarget = {
      ...elementTarget,
      sceneObjectId: "scene-node:element:other",
      referenceId: "other",
      source: { ...elementTarget.source, file: "model/other.c4ml" },
    };

    expect(
      navigationTargetForOffset(
        [otherFileTarget, elementTarget],
        210,
        "editor.c4ml",
      )?.referenceId,
    ).toBe("garden-pulse");
    expect(
      navigationTargetForOffset(
        [otherFileTarget, elementTarget],
        210,
        "missing.c4ml",
      ),
    ).toBeUndefined();
  });

  it("prioritizes elements, then nearby routes, then containing boundaries", () => {
    expect(
      navigationTargetAtPoint([viewTarget, elementTarget, routeTarget], {
        x: 550,
        y: 120,
      })?.referenceId,
    ).toBe("garden-pulse");
    expect(
      navigationTargetAtPoint([viewTarget, routeTarget], { x: 350, y: 307 })
        ?.referenceId,
    ).toBe("reviews-plan");
    expect(
      navigationTargetAtPoint([viewTarget, routeTarget], { x: 100, y: 100 })
        ?.referenceId,
    ).toBe("context");
    expect(
      navigationTargetAtPoint([viewTarget, routeTarget], { x: 10, y: 10 }),
    ).toBeUndefined();
  });

  it("selects ports and labels before routes and corridor lanes away from routes", () => {
    const targets = [
      viewTarget,
      routeTarget,
      sourcePortTarget,
      labelTarget,
      corridorTarget,
    ];
    expect(navigationTargetAtPoint(targets, { x: 220, y: 300 })?.kind).toBe(
      "port",
    );
    expect(navigationTargetAtPoint(targets, { x: 340, y: 288 })?.kind).toBe(
      "route-label",
    );
    expect(navigationTargetAtPoint(targets, { x: 460, y: 450 })?.kind).toBe(
      "corridor",
    );
  });

  it("keeps source selection on semantic nodes and routes", () => {
    expect(
      navigationTargetForOffset(
        [routeTarget, sourcePortTarget, labelTarget, corridorTarget],
        850,
      )?.kind,
    ).toBe("route");
  });

  it("maps a letterboxed image click into scene coordinates", () => {
    const navigation: CompilerWorkerNavigation = {
      width: 800,
      height: 600,
      targets: [],
    };
    expect(
      clientPointToScene(
        { x: 500, y: 250 },
        { left: 0, top: 0, width: 1_000, height: 500 },
        navigation,
      ),
    ).toEqual({ x: 400, y: 300 });
    expect(
      clientPointToScene(
        { x: 50, y: 250 },
        { left: 0, top: 0, width: 1_000, height: 500 },
        navigation,
      ),
    ).toBeUndefined();
  });

  it("adds a preview-only highlight for a selected compiler node", () => {
    const svg = '<svg><g id="c4ml-scene-node-element-garden-pulse"></g></svg>';
    const highlighted = svgWithNavigationHighlight(svg, elementTarget);

    expect(highlighted).toContain('id="c4ml-editor-node-selection"');
    expect(highlighted).toContain("M 495 93 V 75 H 513");
    expect(highlighted).not.toContain('id="c4ml-editor-selection"');
    expect(highlighted).not.toContain(".element-surface{stroke:");
    expect(svg).not.toContain("c4ml-editor-selection");
  });

  it("highlights a route and adds inspectable debug geometry only to the preview", () => {
    const svg = `<svg><path id="${routeTarget.svgElementIds[0]}"></path><path id="${routeTarget.svgElementIds[1]}"></path></svg>`;
    const highlighted = svgWithNavigationHighlight(svg, routeTarget, {
      showRouteDebug: true,
      width: 800,
      height: 600,
    });

    expect(highlighted).toContain('id="c4ml-editor-routing-debug"');
    expect(highlighted).toContain("editor-route-port-source");
    expect(highlighted).toContain("editor-route-port-target");
    expect(highlighted).toContain("editor-corridor-selected");
    expect(highlighted).toContain("editor-relative-waypoint");
    expect(highlighted).toContain("editor-locked-segment");
    expect(highlighted).toContain("editor-avoidance-soft");
    expect(highlighted).toContain("editor-avoidance-relaxed");
    expect(highlighted).toContain('x1="460"');
    expect(svg).not.toContain("c4ml-editor-routing-debug");
  });

  it("highlights port, label, and corridor details only in the preview copy", () => {
    const svg = `<svg><g id="${labelTarget.svgElementIds[0]}"><text>Reviews plan</text></g></svg>`;
    const port = svgWithNavigationHighlight(svg, sourcePortTarget);
    const label = svgWithNavigationHighlight(svg, labelTarget);
    const corridor = svgWithNavigationHighlight(svg, corridorTarget);

    expect(port).toContain('id="c4ml-editor-detail-selection"');
    expect(port).toContain('cx="220"');
    expect(label).toContain(`#${labelTarget.svgElementIds[0]} text`);
    expect(label).toContain("<rect");
    expect(corridor).toContain("<line");
    expect(corridor).toContain('x1="460"');
    expect(svg).not.toContain("c4ml-editor-detail-selection");
  });
});
