import { describe, expect, it } from "vitest";

import {
  ArchitectureQueryError,
  createTemporaryArchitectureView,
  executeArchitectureQuery,
  resolveArchitectureSnapshot,
} from "../src/index.js";
import {
  signalGardenModel,
  signalGardenViews,
} from "./signal-garden.fixture.js";

const snapshot = resolveArchitectureSnapshot(
  signalGardenModel,
  signalGardenViews,
).snapshot!;

describe("architecture graph queries", () => {
  it("explains deterministic upstream and downstream traversals", () => {
    const downstream = executeArchitectureQuery(snapshot, {
      id: "query:api-downstream",
      kind: "downstream",
      subjectKey: "element:cultivation-api",
    });
    const upstream = executeArchitectureQuery(snapshot, {
      id: "query:api-upstream",
      kind: "upstream",
      subjectKey: "element:cultivation-api",
    });

    expect(downstream.itemKeys).toEqual([
      "element:cultivation-api",
      "element:ledger-store",
      "element:notify-worker",
    ]);
    expect(downstream.relationshipKeys).toEqual([
      "relationship:api-enqueues-notice",
      "relationship:api-writes-ledger",
    ]);
    expect(upstream.itemKeys).toContain("element:grower");
    expectEveryIncludedIdentityIsExplained(downstream);
    expectEveryIncludedIdentityIsExplained(upstream);
  });

  it("finds one stable shortest path and rejects an absent path", () => {
    const result = executeArchitectureQuery(snapshot, {
      id: "query:grower-to-ledger",
      kind: "path",
      subjectKey: "element:grower",
      targetKey: "element:ledger-store",
    });

    expect(result.itemKeys).toEqual([
      "element:cultivation-api",
      "element:grower",
      "element:ledger-store",
      "element:studio-ui",
    ]);
    expect(result.relationshipKeys).toEqual([
      "relationship:api-writes-ledger",
      "relationship:grower-edits-ui",
      "relationship:ui-calls-api",
    ]);
    expectEveryIncludedIdentityIsExplained(result);
    expect(() =>
      executeArchitectureQuery(snapshot, {
        id: "query:no-path",
        kind: "path",
        subjectKey: "element:ledger-store",
        targetKey: "element:grower",
      }),
    ).toThrowError(
      expect.objectContaining<Partial<ArchitectureQueryError>>({
        code: "C4ML-QUERY-002",
      }),
    );
  });

  it("projects containment without copying canonical definitions", () => {
    const result = executeArchitectureQuery(snapshot, {
      id: "query:controller-containment",
      kind: "containment",
      subjectKey: "element:plan-controller",
      scope: "both",
    });
    const focus = createTemporaryArchitectureView(result, {
      id: "focus:controller",
      title: "Plan controller context",
    });

    expect(result.itemKeys).toEqual([
      "element:cultivation-api",
      "element:plan-controller",
      "element:request-mapper",
      "element:signal-garden",
    ]);
    expect(focus).toMatchObject({
      version: 1,
      queryId: "query:controller-containment",
      resultKind: "containment",
      itemKeys: result.itemKeys,
    });
    expect(focus).not.toHaveProperty("elements");
    expect(focus.explanations).toHaveLength(result.itemKeys.length);
  });

  it("connects static architecture to deployment placement", () => {
    const result = executeArchitectureQuery(snapshot, {
      id: "query:api-deployment",
      kind: "deployment",
      subjectKey: "element:cultivation-api",
    });

    expect(result.itemKeys).toEqual([
      "deployment-environment:production",
      "deployment-environment:staging",
      "deployment-instance:prod-api",
      "deployment-instance:stage-api",
      "deployment-node:prod-cloud",
      "deployment-node:prod-cluster",
      "deployment-node:stage-host",
      "element:cultivation-api",
    ]);
    expectEveryIncludedIdentityIsExplained(result);
  });

  it("reports every View containing a canonical item", () => {
    const result = executeArchitectureQuery(snapshot, {
      id: "query:api-coverage",
      kind: "view-coverage",
      subjectKey: "element:cultivation-api",
    });

    expect(result.itemKeys).toEqual([
      "element:cultivation-api",
      "view:plan-cycle",
      "view:production-deployment",
      "view:signal-containers",
    ]);
    expectEveryIncludedIdentityIsExplained(result);
  });

  it("rejects unknown query identities", () => {
    expect(() =>
      executeArchitectureQuery(snapshot, {
        id: "query:unknown",
        kind: "downstream",
        subjectKey: "element:missing",
      }),
    ).toThrowError(
      expect.objectContaining<Partial<ArchitectureQueryError>>({
        code: "C4ML-QUERY-002",
      }),
    );
  });
});

function expectEveryIncludedIdentityIsExplained(
  result: ReturnType<typeof executeArchitectureQuery>,
): void {
  const explained = new Set(result.evidence.map(({ subjectKey }) => subjectKey));
  for (const itemKey of [...result.itemKeys, ...result.relationshipKeys]) {
    expect(explained.has(itemKey), itemKey).toBe(true);
  }
}
