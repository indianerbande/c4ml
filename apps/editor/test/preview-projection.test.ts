import { describe, expect, it } from "vitest";

import { createPreviewProjection } from "../src/app/preview-projection.js";
import type { CompilerWorkerNavigation } from "../src/app/compiler-worker.protocol.js";

const source = {
  file: "model/private.c4ml",
  start: { offset: 10, line: 1, column: 1 },
  end: { offset: 20, line: 1, column: 11 },
};

describe("detached preview projection", () => {
  it("projects only read-only view, SVG, presentation, and hit-test data", () => {
    const navigation: CompilerWorkerNavigation = {
      width: 900,
      height: 600,
      targets: [
        {
          kind: "node",
          sceneObjectId: "c4ml-node-garden",
          svgElementIds: ["c4ml-node-garden"],
          referenceId: "garden",
          label: "Garden Pulse",
          source,
          relatedSources: [],
          nodeRole: "element",
          bounds: { x: 40, y: 50, width: 220, height: 140 },
        },
        {
          kind: "route",
          sceneObjectId: "c4ml-route-observe",
          svgElementIds: ["c4ml-route-observe"],
          referenceId: "observe",
          label: "Publishes observations",
          source,
          relatedSources: [],
          policy: "guided",
          style: "orthogonal",
          points: [
            { x: 260, y: 120 },
            { x: 520, y: 120 },
          ],
          sourcePort: {
            id: "source",
            role: "source",
            side: "east",
            point: { x: 260, y: 120 },
          },
          targetPort: {
            id: "target",
            role: "target",
            side: "west",
            point: { x: 520, y: 120 },
          },
          labelPoint: { x: 390, y: 105 },
          labelSegment: 0,
          corridor: undefined,
          waypoints: [],
          lockedSegments: [],
          avoidanceRegions: [],
        },
      ],
    };

    const projection = createPreviewProjection({
      revision: 7,
      compilerPhase: "valid",
      statusLabel: "Preview current",
      views: [
        { id: "garden-context", kind: "system-context", title: "Garden" },
      ],
      activeViewId: "garden-context",
      svg: "<svg></svg>",
      navigation,
      selectedSceneObjectId: "c4ml-node-garden",
      selectionLabel: "Garden Pulse",
      zoom: 1.4,
      routeDebugEnabled: true,
      stale: false,
      language: "en",
      colorScheme: "light",
      colorPalette: "green",
      interfaceFontSize: 11,
    });

    expect(projection).toMatchObject({
      version: 1,
      revision: 7,
      view: { id: "garden-context", title: "Garden" },
      selectedSceneObjectId: "c4ml-node-garden",
      zoom: 1.4,
      presentation: { language: "en", colorPalette: "green" },
    });
    expect(projection.navigation?.targets).toEqual([
      {
        kind: "node",
        sceneObjectId: "c4ml-node-garden",
        label: "Garden Pulse",
        nodeRole: "element",
        bounds: { x: 40, y: 50, width: 220, height: 140 },
      },
      {
        kind: "route",
        sceneObjectId: "c4ml-route-observe",
        label: "Publishes observations",
        points: [
          { x: 260, y: 120 },
          { x: 520, y: 120 },
        ],
      },
    ]);
    expect(JSON.stringify(projection)).not.toContain("private.c4ml");
    expect(JSON.stringify(projection)).not.toContain("referenceId");
    expect(JSON.stringify(projection)).not.toContain("sourcePort");
  });
});
