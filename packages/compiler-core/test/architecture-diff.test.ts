import { describe, expect, it } from "vitest";

import {
  compareArchitectureSnapshots,
  isArchitectureDifference,
  resolveArchitectureSnapshot,
  serializeArchitectureDifference,
  type ArchitectureSnapshot,
} from "../src/index.js";
import { signalGardenModel, signalGardenViews } from "./signal-garden.fixture.js";

function snapshot(): ArchitectureSnapshot {
  return resolveArchitectureSnapshot(signalGardenModel, signalGardenViews).snapshot!;
}

describe("semantic architecture difference", () => {
  it("reports a stable-identity rename without removal or addition", () => {
    const before = snapshot();
    const after: ArchitectureSnapshot = {
      ...before,
      elements: before.elements.map((element) =>
        element.id === "cultivation-api"
          ? { ...element, name: "Cultivation Coordination API" }
          : element,
      ),
    };

    const result = compareArchitectureSnapshots(before, after);

    expect(result.changes).toEqual([
      expect.objectContaining({
        category: "model",
        kind: "renamed",
        subjectKey: "element:cultivation-api",
        properties: [
          {
            path: "name",
            before: "Cultivation API",
            after: "Cultivation Coordination API",
          },
        ],
      }),
    ]);
    expect(result.changes).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "added" }),
        expect.objectContaining({ kind: "removed" }),
      ]),
    );
  });

  it("classifies additions, removals, property changes, and relationship changes", () => {
    const base = snapshot();
    const before: ArchitectureSnapshot = {
      ...base,
      elements: [
        ...base.elements,
        {
          id: "retired-console",
          kind: "software-system",
          name: "Retired Console",
          description: "Previously coordinated watering windows.",
          classification: "internal",
          tags: [],
          links: [],
        },
      ],
    };
    const after: ArchitectureSnapshot = {
      ...base,
      elements: [
        ...base.elements,
        {
          id: "watering-console",
          kind: "software-system",
          name: "Watering Console",
          description: "Coordinates watering windows.",
          classification: "internal",
          tags: [],
          links: [],
        },
      ],
      relationships: base.relationships.map((relationship) =>
        relationship.id === "ui-calls-api"
          ? { ...relationship, description: "Requests cultivation plans" }
          : relationship,
      ),
    };

    const result = compareArchitectureSnapshots(before, after);

    expect(result.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "model",
          kind: "removed",
          subjectKey: "element:retired-console",
        }),
        expect.objectContaining({
          category: "model",
          kind: "added",
          subjectKey: "element:watering-console",
        }),
        expect.objectContaining({
          category: "relationship",
          kind: "modified",
          subjectKey: "relationship:ui-calls-api",
          properties: [
            expect.objectContaining({ path: "description" }),
          ],
        }),
      ]),
    );
  });

  it("separates deployment, view, presentation, and layout changes", () => {
    const before = snapshot();
    const context = before.views.find(({ id }) => id === "signal-context")!;
    const after: ArchitectureSnapshot = {
      ...before,
      deployment: {
        ...before.deployment!,
        nodes: before.deployment!.nodes.map((node) =>
          node.id === "prod-cluster"
            ? { ...node, technology: "Kubernetes 1.40" }
            : node,
        ),
      },
      views: before.views.map((view) =>
        view.id === context.id
          ? {
              ...view,
              purpose: "Explains cultivation planning and watering coordination.",
              presentation: { theme: "c4ml-garden" },
              layout: { direction: "down", metadata: { spacing: 80 } },
            }
          : view,
      ),
    };

    const result = compareArchitectureSnapshots(before, after);

    expect(result.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "deployment",
          subjectKey: "deployment-node:prod-cluster",
        }),
        expect.objectContaining({ category: "view", subjectKey: "view:signal-context" }),
        expect.objectContaining({
          category: "presentation",
          subjectKey: "view:signal-context",
        }),
        expect.objectContaining({ category: "layout", subjectKey: "view:signal-context" }),
      ]),
    );
    expect(result.summary).toEqual({
      total: 4,
      architecture: 2,
      presentation: 1,
      layout: 1,
    });
  });

  it("reports layout-only changes without architecture noise", () => {
    const before = snapshot();
    const after: ArchitectureSnapshot = {
      ...before,
      views: before.views.map((view) =>
        view.id === "signal-context"
          ? { ...view, layout: { direction: "down", metadata: { spacing: 96 } } }
          : view,
      ),
    };

    const result = compareArchitectureSnapshots(before, after);

    expect(result.summary).toEqual({ total: 1, architecture: 0, presentation: 0, layout: 1 });
    expect(result.changes[0]).toMatchObject({
      category: "layout",
      kind: "modified",
      subjectKey: "view:signal-context",
    });
  });

  it("includes executable placement and route controls as layout data", () => {
    const before = resolveArchitectureSnapshot(signalGardenModel, signalGardenViews, {
      placementByViewId: {
        "signal-context": {
          constraints: [{
            id: "pin-pulse",
            kind: "pin",
            targetId: "signal-garden",
            x: 520,
            y: 120,
            strength: "hard",
          }],
        },
      },
      routingByViewId: {
        "signal-context": {
          controls: [{
            relationshipId: "grower-uses-system",
            policy: "automatic",
            style: "orthogonal",
          }],
        },
      },
    }).snapshot!;
    const after = resolveArchitectureSnapshot(signalGardenModel, signalGardenViews, {
      placementByViewId: {
        "signal-context": {
          constraints: [{
            id: "pin-pulse",
            kind: "pin",
            targetId: "signal-garden",
            x: 600,
            y: 120,
            strength: "hard",
          }],
        },
      },
      routingByViewId: {
        "signal-context": {
          controls: [{
            relationshipId: "grower-uses-system",
            policy: "automatic",
            style: "orthogonal",
          }],
        },
      },
    }).snapshot!;

    expect(compareArchitectureSnapshots(before, after)).toMatchObject({
      summary: { total: 1, architecture: 0, presentation: 0, layout: 1 },
      changes: [{ category: "layout", subjectKey: "view:signal-context" }],
    });
  });

  it("ignores source movement inside executable layout controls", () => {
    const snapshotWithSource = (file: string, offset: number): ArchitectureSnapshot =>
      resolveArchitectureSnapshot(signalGardenModel, signalGardenViews, {
        placementByViewId: {
          "signal-context": {
            constraints: [{
              id: "pin-pulse",
              kind: "pin",
              targetId: "signal-garden",
              x: 520,
              y: 120,
              strength: "hard",
              source: {
                file,
                range: {
                  start: { offset, line: 1, column: 0 },
                  end: { offset: offset + 8, line: 1, column: 8 },
                },
              },
            }],
          },
        },
      }).snapshot!;

    expect(compareArchitectureSnapshots(
      snapshotWithSource("before.c4ml", 10),
      snapshotWithSource("after.c4ml", 900),
    ).changes).toEqual([]);
  });

  it("is empty and byte-stable for equivalent canonical snapshots", () => {
    const before = snapshot();
    const equivalent = structuredClone(before);

    const first = compareArchitectureSnapshots(before, equivalent);
    const second = compareArchitectureSnapshots(equivalent, before);

    expect(first.changes).toEqual([]);
    expect(first.summary.total).toBe(0);
    expect(serializeArchitectureDifference(first)).toBe(
      serializeArchitectureDifference(second),
    );
    expect(isArchitectureDifference(first)).toBe(true);
  });

  it("ignores declaration order and source-location movement", () => {
    const before = snapshot();
    const reorderedModel = {
      ...structuredClone(signalGardenModel),
      elements: [...structuredClone(signalGardenModel.elements)]
        .reverse()
        .map((element) => ({
          ...element,
          source: {
            file: "moved/architecture.c4ml",
            range: {
              start: { offset: 500, line: 50, column: 0 },
              end: { offset: 510, line: 50, column: 10 },
            },
          },
        })),
      relationships: [...structuredClone(signalGardenModel.relationships)].reverse(),
      ...(signalGardenModel.deployment === undefined
        ? {}
        : {
            deployment: {
              environments: [...structuredClone(signalGardenModel.deployment.environments)].reverse(),
              nodes: [...structuredClone(signalGardenModel.deployment.nodes)].reverse(),
              infrastructureNodes: [...structuredClone(signalGardenModel.deployment.infrastructureNodes)].reverse(),
              instances: [...structuredClone(signalGardenModel.deployment.instances)].reverse(),
              relationships: [...structuredClone(signalGardenModel.deployment.relationships)].reverse(),
            },
          }),
    };
    const after = resolveArchitectureSnapshot(
      reorderedModel,
      [...structuredClone(signalGardenViews)].reverse(),
    ).snapshot!;

    expect(compareArchitectureSnapshots(before, after).changes).toEqual([]);
  });
});
