import { describe, expect, it } from "vitest";

import {
  type ArchitectureModel,
  type ArchitectureView,
  resolveArchitectureView,
  resolveArchitectureViews,
  type ResolvedView,
} from "../src/index.js";
import {
  signalGardenModel,
  signalGardenViews,
} from "./signal-garden.fixture.js";

function resolvedByKind(): Map<ArchitectureView["kind"], ResolvedView> {
  const result = resolveArchitectureViews(signalGardenModel, signalGardenViews);
  expect(result.valid).toBe(true);
  return new Map(result.views.map((view) => [view.kind, view]));
}

describe("resolveArchitectureViews", () => {
  it("resolves all seven C4 view types as projections of one model", () => {
    const result = resolveArchitectureViews(signalGardenModel, signalGardenViews);

    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.views.map((view) => view.kind).sort()).toEqual([
      "code",
      "component",
      "container",
      "deployment",
      "dynamic",
      "system-context",
      "system-landscape",
    ]);
    for (const view of result.views) {
      expect(view.title).not.toBe("");
      expect(view.purpose).not.toBe("");
      expect(view.scope).not.toBe("");
      expect(view.audience.length).toBeGreaterThan(0);
      expect(view.recommendation).not.toBe("");
      expect(view.legend.mode).toBe("generated");
    }
  });

  it("enforces the primary and supporting element contracts of static views", () => {
    const views = resolvedByKind();

    expect(views.get("system-landscape")?.elements.map(({ kind }) => kind)).toEqual(
      expect.arrayContaining(["person", "software-system"]),
    );
    expect(
      new Set(views.get("system-context")?.elements.map(({ kind }) => kind)),
    ).toEqual(new Set(["person", "software-system"]));
    expect(
      new Set(views.get("container")?.elements.map(({ kind }) => kind)),
    ).toEqual(new Set(["person", "software-system", "container"]));
    expect(
      new Set(views.get("component")?.elements.map(({ kind }) => kind)),
    ).toEqual(
      new Set(["person", "software-system", "container", "component"]),
    );
    expect(views.get("code")?.elements.map(({ kind }) => kind)).toEqual([
      "code-element",
      "code-element",
    ]);
    expect(views.get("code")?.elements.map(({ id }) => id)).toEqual([
      "moisture-index",
      "zone-policy",
    ]);
  });

  it("preserves object identity when one model element appears in several views", () => {
    const views = resolvedByKind();
    const modelElement = signalGardenModel.elements.find(
      ({ id }) => id === "signal-garden",
    );
    const landscapeElement = views
      .get("system-landscape")
      ?.elements.find(({ id }) => id === "signal-garden");
    const contextElement = views
      .get("system-context")
      ?.elements.find(({ id }) => id === "signal-garden");

    expect(landscapeElement).toBe(modelElement);
    expect(contextElement).toBe(modelElement);
  });

  it("keeps view-local presentation and layout data from mutating the model", () => {
    const context = signalGardenViews.find(
      (view) => view.kind === "system-context",
    )!;
    const original = structuredClone(signalGardenModel);
    const result = resolveArchitectureView(signalGardenModel, {
      ...context,
      presentation: {
        theme: "field-notes",
        metadata: { emphasis: "signal-garden" },
      },
      layout: { direction: "left", metadata: { spacing: 72 } },
    });

    expect(result.valid).toBe(true);
    expect(result.views[0]?.presentation?.theme).toBe("field-notes");
    expect(result.views[0]?.layout?.direction).toBe("left");
    expect(signalGardenModel).toEqual(original);
  });

  it("preserves ordered and parallel Dynamic interactions and their static links", () => {
    const dynamic = resolvedByKind().get("dynamic")!;

    expect(dynamic.dynamicDisplay).toBe("collaboration");
    expect(dynamic.interactions.map(({ id, order, parallelGroup }) => ({
      id,
      order,
      parallelGroup,
    }))).toEqual([
      { id: "submit-plan", order: 1, parallelGroup: undefined },
      {
        id: "queue-notice",
        order: 2,
        parallelGroup: "persist-and-notify",
      },
      {
        id: "store-plan",
        order: 2,
        parallelGroup: "persist-and-notify",
      },
    ]);
    expect(dynamic.interactions.map(({ relationship }) => relationship.id)).toEqual([
      "ui-calls-api",
      "api-enqueues-notice",
      "api-writes-ledger",
    ]);
  });

  it("keeps Dynamic semantics identical across collaboration and sequence display", () => {
    const dynamic = signalGardenViews.find(
      (view): view is Extract<ArchitectureView, { kind: "dynamic" }> =>
        view.kind === "dynamic",
    )!;
    const collaboration = resolveArchitectureView(signalGardenModel, dynamic)
      .views[0]!;
    const sequence = resolveArchitectureView(signalGardenModel, {
      ...dynamic,
      id: "plan-cycle-sequence",
      display: "sequence",
    }).views[0]!;

    expect(sequence.dynamicDisplay).toBe("sequence");
    expect(sequence.elements).toEqual(collaboration.elements);
    expect(sequence.relationships).toEqual(collaboration.relationships);
    expect(sequence.interactions).toEqual(collaboration.interactions);
  });

  it("selects one environment, nested nodes, instances, and relevant infrastructure", () => {
    const deployment = resolvedByKind().get("deployment")!;

    expect(deployment.deploymentEnvironment?.id).toBe("production");
    expect(deployment.deploymentNodes.map(({ id }) => id)).toEqual([
      "prod-cloud",
      "prod-cluster",
      "prod-data",
    ]);
    expect(deployment.infrastructureNodes.map(({ id }) => id)).toEqual([
      "prod-gateway",
    ]);
    expect(deployment.deploymentInstances.map(({ id }) => id)).not.toContain(
      "stage-api",
    );
    const apiInstance = deployment.deploymentInstances.find(
      ({ id }) => id === "prod-api",
    );
    expect(
      deployment.elements.find(({ id }) => id === "cultivation-api"),
    ).toBe(signalGardenModel.elements.find(({ id }) => id === "cultivation-api"));
    expect(apiInstance?.kind).toBe("container-instance");
  });

  it("follows relevant infrastructure chains without pulling in another system", () => {
    const deployment = signalGardenModel.deployment!;
    const model: ArchitectureModel = {
      ...signalGardenModel,
      deployment: {
        ...deployment,
        infrastructureNodes: [
          ...deployment.infrastructureNodes,
          {
            id: "prod-dns",
            kind: "infrastructure-node",
            environmentId: "production",
            nodeId: "prod-cloud",
            name: "Service DNS",
            description: "Resolves the public cultivation service name.",
            technology: "Managed DNS",
          },
        ],
        relationships: [
          ...deployment.relationships,
          {
            id: "prod-dns-gateway",
            sourceId: "prod-dns",
            targetId: "prod-gateway",
            description: "Resolves the gateway endpoint",
            technology: "DNS",
          },
        ],
      },
    };
    const view = signalGardenViews.find(
      (candidate) => candidate.kind === "deployment",
    )!;

    const resolved = resolveArchitectureView(model, view).views[0]!;

    expect(resolved.infrastructureNodes.map(({ id }) => id)).toEqual([
      "prod-dns",
      "prod-gateway",
    ]);
    expect(resolved.deploymentRelationships.map(({ id }) => id)).toContain(
      "prod-dns-gateway",
    );
  });

  it("rejects removal of a Deployment Node required by a visible instance", () => {
    const view = signalGardenViews.find(
      (candidate) => candidate.kind === "deployment",
    )!;
    const result = resolveArchitectureView(signalGardenModel, {
      ...view,
      selection: { excludeElementIds: ["prod-cloud"] },
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "C4ML-DVIEW-004" }),
      ]),
    );
  });

  it.each([
    ["system-context", "studio-ui"],
    ["container", "plan-controller"],
    ["code", "request-mapper"],
  ] as const)(
    "rejects illegal cross-level selection in a %s view",
    (kind, illegalElementId) => {
      const view = signalGardenViews.find((candidate) => candidate.kind === kind)!;
      const result = resolveArchitectureView(signalGardenModel, {
        ...view,
        selection: { includeElementIds: [illegalElementId] },
      });

      expect(result.valid).toBe(false);
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "C4ML-VIEW-011" }),
        ]),
      );
    },
  );

  it("reports mixed Dynamic levels unless the author acknowledges them", () => {
    const dynamic = signalGardenViews.find(
      (view): view is Extract<ArchitectureView, { kind: "dynamic" }> =>
        view.kind === "dynamic",
    )!;
    const mixed: ArchitectureView = {
      ...dynamic,
      id: "mixed-level-flow",
      interactions: [
        {
          id: "mixed",
          order: 1,
          sourceId: "studio-ui",
          targetId: "plan-controller",
          description: "Sends validated planning input",
          relationshipId: "ui-invokes-controller",
        },
      ],
    };

    const warning = resolveArchitectureView(signalGardenModel, mixed);
    const acknowledged = resolveArchitectureView(signalGardenModel, {
      ...mixed,
      allowMixedLevels: true,
    });

    expect(warning.valid).toBe(true);
    expect(warning.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "C4ML-DYN-008",
          severity: "warning",
        }),
      ]),
    );
    expect(acknowledged.diagnostics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "C4ML-DYN-008" }),
      ]),
    );
  });

  it("produces deterministic projections when model declarations are reordered", () => {
    const deployment = signalGardenModel.deployment!;
    const reordered: ArchitectureModel = {
      elements: [...signalGardenModel.elements].reverse(),
      relationships: [...signalGardenModel.relationships].reverse(),
      deployment: {
        environments: [...deployment.environments].reverse(),
        nodes: [...deployment.nodes].reverse(),
        infrastructureNodes: [...deployment.infrastructureNodes].reverse(),
        instances: [...deployment.instances].reverse(),
        relationships: [...deployment.relationships].reverse(),
      },
    };

    const expected = resolveArchitectureViews(signalGardenModel, signalGardenViews);
    const actual = resolveArchitectureViews(reordered, [...signalGardenViews].reverse());

    expect(actual.diagnostics).toEqual(expected.diagnostics);
    expect(
      actual.views.map((view) => ({
        id: view.id,
        elements: view.elements.map(({ id }) => id),
        relationships: view.relationships.map(({ id }) => id),
        deploymentNodes: view.deploymentNodes.map(({ id }) => id),
        instances: view.deploymentInstances.map(({ id }) => id),
      })),
    ).toEqual(
      expected.views.map((view) => ({
        id: view.id,
        elements: view.elements.map(({ id }) => id),
        relationships: view.relationships.map(({ id }) => id),
        deploymentNodes: view.deploymentNodes.map(({ id }) => id),
        instances: view.deploymentInstances.map(({ id }) => id),
      })),
    );
  });
});
