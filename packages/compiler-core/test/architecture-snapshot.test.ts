import { describe, expect, it } from "vitest";

import {
  architectureGraphItemKey,
  architectureGraphViewItemKey,
  createArchitectureGraphIndex,
  resolveArchitectureSnapshot,
  serializeArchitectureSnapshot,
  type ArchitectureModel,
  type ArchitectureView,
} from "../src/index.js";
import {
  signalGardenModel,
  signalGardenViews,
} from "./signal-garden.fixture.js";

describe("canonical architecture snapshot", () => {
  it("ignores declaration order and source locations while retaining typed architecture data", () => {
    const forward = resolveArchitectureSnapshot(signalGardenModel, signalGardenViews);
    const reorderedModel: ArchitectureModel = {
      ...structuredClone(signalGardenModel),
      elements: [...structuredClone(signalGardenModel.elements)]
        .reverse()
        .map((element) => ({
          ...element,
          source: {
            file: "reformatted.c4ml",
            range: {
              start: { offset: 999, line: 99, column: 9 },
              end: { offset: 1000, line: 99, column: 10 },
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
              infrastructureNodes: [
                ...structuredClone(signalGardenModel.deployment.infrastructureNodes),
              ].reverse(),
              instances: [...structuredClone(signalGardenModel.deployment.instances)].reverse(),
              relationships: [
                ...structuredClone(signalGardenModel.deployment.relationships),
              ].reverse(),
            },
          }),
    };
    const reversedViews = [...structuredClone(signalGardenViews)].reverse();
    const reordered = resolveArchitectureSnapshot(reorderedModel, reversedViews);

    expect(forward.valid).toBe(true);
    expect(reordered.valid).toBe(true);
    expect(serializeArchitectureSnapshot(reordered.snapshot!)).toBe(
      serializeArchitectureSnapshot(forward.snapshot!),
    );
    expect(forward.snapshot?.elements.find(({ id }) => id === "zone-policy")).toMatchObject({
      kind: "code-element",
      parentId: "recommendation-engine",
      codeKind: "module",
      language: "TypeScript",
    });
  });

  it("keeps semantic, deployment, view, presentation, and layout data separate", () => {
    const context = signalGardenViews.find(
      ({ kind }) => kind === "system-context",
    )!;
    const views: ArchitectureView[] = [
      {
        ...context,
        presentation: { theme: "c4ml-garden", metadata: { focus: "grower" } },
        layout: { direction: "right", metadata: { spacing: 64 } },
      },
      ...signalGardenViews.filter(({ id }) => id !== context.id),
    ];
    const result = resolveArchitectureSnapshot(signalGardenModel, views);
    const contextSnapshot = result.snapshot?.views.find(({ id }) => id === context.id);

    expect(contextSnapshot).toMatchObject({
      presentation: { metadata: { focus: "grower" }, theme: "c4ml-garden" },
      layout: { direction: "right", metadata: { spacing: 64 } },
    });
    expect(result.snapshot?.deployment?.instances.length).toBeGreaterThan(0);
    expect(result.snapshot?.elements[0]).not.toHaveProperty("source");
  });

  it("does not create a snapshot from an invalid architecture", () => {
    const invalid: ArchitectureModel = {
      ...signalGardenModel,
      elements: signalGardenModel.elements.filter(({ id }) => id !== "signal-garden"),
    };

    const result = resolveArchitectureSnapshot(invalid, signalGardenViews);

    expect(result.valid).toBe(false);
    expect(result.snapshot).toBeUndefined();
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
});

describe("architecture graph index", () => {
  it("provides deterministic containment, deployment, view, and impact traversal", () => {
    const snapshot = resolveArchitectureSnapshot(
      signalGardenModel,
      signalGardenViews,
    ).snapshot!;
    const index = createArchitectureGraphIndex(snapshot);
    const systemKey = architectureGraphItemKey("element", "signal-garden");
    const studioKey = architectureGraphItemKey("element", "studio-ui");

    expect(index.childrenOf(systemKey)).toEqual([
      "element:cultivation-api",
      "element:ledger-store",
      "element:notify-worker",
      "element:studio-ui",
    ]);
    expect(index.parentOf(studioKey)).toBe(systemKey);
    expect(index.instancesOf("cultivation-api")).toEqual([
      "deployment-instance:prod-api",
      "deployment-instance:stage-api",
    ]);
    expect(index.viewsContaining(studioKey)).toContain("view:signal-containers");
    expect(index.traverse(studioKey, "downstream")).toMatchObject({
      itemKeys: expect.arrayContaining([
        "element:cultivation-api",
        "element:ledger-store",
        "element:notify-worker",
      ]),
      relationshipKeys: expect.arrayContaining([
        "relationship:ui-calls-api",
        "relationship:api-writes-ledger",
      ]),
    });
  });

  it("keeps identities from different namespaces distinct", () => {
    const snapshot = resolveArchitectureSnapshot(
      signalGardenModel,
      signalGardenViews,
    ).snapshot!;
    const index = createArchitectureGraphIndex(snapshot);

    expect(index.itemKeys).toContain("element:signal-garden");
    expect(index.itemKeys).toContain("view:signal-context");
    expect(architectureGraphItemKey("relationship", "shared-id")).not.toBe(
      architectureGraphItemKey("view", "shared-id"),
    );
    expect(architectureGraphViewItemKey("group", "view-a", "shared-id")).not.toBe(
      architectureGraphViewItemKey("group", "view-b", "shared-id"),
    );
  });

  it("keeps deployment environment and node namespaces distinct when IDs coincide", () => {
    const deployment = structuredClone(signalGardenModel.deployment!);
    const model: ArchitectureModel = {
      ...signalGardenModel,
      deployment: {
        ...deployment,
        environments: deployment.environments.map((environment) =>
          environment.id === "production"
            ? { ...environment, id: "prod-cloud" }
            : environment,
        ),
        nodes: deployment.nodes.map((node) =>
          node.environmentId === "production"
            ? { ...node, environmentId: "prod-cloud" }
            : node,
        ),
        infrastructureNodes: deployment.infrastructureNodes.map((node) =>
          node.environmentId === "production"
            ? { ...node, environmentId: "prod-cloud" }
            : node,
        ),
        instances: deployment.instances.map((instance) =>
          instance.environmentId === "production"
            ? { ...instance, environmentId: "prod-cloud" }
            : instance,
        ),
      },
    };
    const views = signalGardenViews.map((view) =>
      view.kind === "deployment" && view.environmentId === "production"
        ? { ...view, environmentId: "prod-cloud" }
        : view,
    );
    const snapshot = resolveArchitectureSnapshot(model, views).snapshot!;
    const index = createArchitectureGraphIndex(snapshot);

    expect(index.parentOf("deployment-node:prod-cloud")).toBe(
      "deployment-environment:prod-cloud",
    );
    expect(index.itemKeys).toEqual(
      expect.arrayContaining([
        "deployment-environment:prod-cloud",
        "deployment-node:prod-cloud",
      ]),
    );
  });
});
