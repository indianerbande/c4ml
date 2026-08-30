import { describe, expect, it } from "vitest";

import {
  compareArchitectureSnapshots,
  deriveArchitectureImpacts,
  resolveArchitectureSnapshot,
  serializeArchitectureImpactReport,
  type ArchitectureSnapshot,
} from "../src/index.js";
import { signalGardenModel, signalGardenViews } from "./signal-garden.fixture.js";

function snapshot(): ArchitectureSnapshot {
  return resolveArchitectureSnapshot(signalGardenModel, signalGardenViews).snapshot!;
}

describe("semantic architecture impact", () => {
  it("derives deterministic upstream and downstream paths for a changed element", () => {
    const before = snapshot();
    const after: ArchitectureSnapshot = {
      ...before,
      elements: before.elements.map((element) =>
        element.id === "cultivation-api"
          ? { ...element, description: "Coordinates garden work." }
          : element,
      ),
    };
    const difference = compareArchitectureSnapshots(before, after);

    const first = deriveArchitectureImpacts(before, after, difference);
    const second = deriveArchitectureImpacts(before, after, difference);

    expect(first.impacts).toHaveLength(1);
    expect(first.impacts[0]).toMatchObject({
      subjectKey: "element:cultivation-api",
      directlyAffectedItemKeys: ["element:cultivation-api"],
    });
    expect(first.impacts[0]!.upstreamPaths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          startKey: "element:cultivation-api",
          endKey: "element:studio-ui",
          relationshipKeys: ["relationship:ui-calls-api"],
        }),
      ]),
    );
    expect(first.impacts[0]!.downstreamPaths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          startKey: "element:cultivation-api",
          endKey: "element:ledger-store",
          relationshipKeys: ["relationship:api-writes-ledger"],
        }),
      ]),
    );
    expect(first.impacts[0]!.affectedViewKeys).toContain("view:signal-containers");
    expect(serializeArchitectureImpactReport(first)).toBe(
      serializeArchitectureImpactReport(second),
    );
  });

  it("uses relationship endpoints and the correct state for additions and removals", () => {
    const before = snapshot();
    const removed = before.relationships.find(({ id }) => id === "ui-calls-api")!;
    const after: ArchitectureSnapshot = {
      ...before,
      relationships: before.relationships.filter(({ id }) => id !== removed.id),
    };
    const difference = compareArchitectureSnapshots(before, after);

    const impact = deriveArchitectureImpacts(before, after, difference).impacts[0]!;

    expect(impact).toMatchObject({
      subjectKey: "relationship:ui-calls-api",
      directlyAffectedItemKeys: [
        "element:cultivation-api",
        "element:studio-ui",
        "relationship:ui-calls-api",
      ],
    });
    expect(impact.downstreamPaths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          startKey: "element:cultivation-api",
          endKey: "element:ledger-store",
        }),
      ]),
    );
  });

  it("keeps presentation and layout changes out of semantic impact traversal", () => {
    const before = snapshot();
    const after: ArchitectureSnapshot = {
      ...before,
      views: before.views.map((view) =>
        view.id === "signal-context"
          ? {
              ...view,
              presentation: { theme: "c4ml-garden" },
              layout: { direction: "down" },
            }
          : view,
      ),
    };

    const report = deriveArchitectureImpacts(
      before,
      after,
      compareArchitectureSnapshots(before, after),
    );

    expect(report.impacts).toHaveLength(2);
    expect(report.impacts.every((impact) =>
      impact.upstreamPaths.length === 0 && impact.downstreamPaths.length === 0
    )).toBe(true);
    expect(report.impacts.every((impact) =>
      impact.directlyAffectedItemKeys.length === 1 &&
      impact.directlyAffectedItemKeys[0] === "view:signal-context"
    )).toBe(true);
  });
});
