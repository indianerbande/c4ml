import { describe, expect, it } from "vitest";

import {
  ArchitectureObservationError,
  createArchitectureObservationSet,
  evaluateArchitectureObservations,
  parseArchitectureObservationSet,
  resolveArchitectureSnapshot,
  type ArchitectureObservation,
  type SourceReference,
} from "../src/index.js";
import {
  signalGardenModel,
  signalGardenViews,
} from "./signal-garden.fixture.js";

const snapshot = resolveArchitectureSnapshot(
  signalGardenModel,
  signalGardenViews,
).snapshot!;
const cultivationSource = signalGardenModel.elements.find(
  ({ id }) => id === "cultivation-api",
)!.source;

const resourceSource: SourceReference = {
  file: "signal-garden.c4ml-observations.json",
  range: {
    start: { offset: 0, line: 0, column: 0 },
    end: { offset: 120, line: 4, column: 1 },
  },
};

function observation(
  id: string,
  overrides: Partial<ArchitectureObservation> = {},
): ArchitectureObservation {
  return {
    id,
    subjectKey: "element:cultivation-api",
    adapterId: "c4ml.local-inventory/v1",
    observedAt: "2026-08-31T08:15:00Z",
    confirmation: "confirmed",
    claim: { kind: "field", field: "technology", value: "TypeScript service" },
    ...overrides,
  };
}

function evaluate(observations: readonly ArchitectureObservation[]) {
  return evaluateArchitectureObservations({
    model: signalGardenModel,
    views: signalGardenViews,
    snapshot,
    observationSet: createArchitectureObservationSet({
      id: "signal-garden-observations",
      observations,
    }),
    resourceSource,
  });
}

describe("portable architecture observation contract", () => {
  it("parses and normalizes one versioned local observation resource", () => {
    const parsed = parseArchitectureObservationSet(JSON.stringify({
      version: 1,
      id: "signal-garden-observations",
      observations: [observation("runtime-technology", {
        observedAt: "2026-08-31T10:15:00+02:00",
      })],
    }));

    expect(parsed).toMatchObject({
      valid: true,
      observationSet: {
        version: 1,
        id: "signal-garden-observations",
        observations: [{
          id: "runtime-technology",
          observedAt: "2026-08-31T08:15:00.000Z",
        }],
      },
    });
    expect(parseArchitectureObservationSet("{")).toMatchObject({
      valid: false,
      error: { code: "C4ML-OBSERVATION-001" },
    });
    expect(parseArchitectureObservationSet(JSON.stringify({
      version: 2,
      id: "future-observations",
      observations: [],
    }))).toMatchObject({
      valid: false,
      error: { code: "C4ML-OBSERVATION-001" },
    });
  });

  it("separates consistent claims, confirmed drift, and uncertain observations", () => {
    const result = evaluate([
      observation("consistent"),
      observation("confirmed-drift", {
        claim: { kind: "field", field: "technology", value: "Python service" },
      }),
      observation("unreviewed-match", { confirmation: "unreviewed" }),
      observation("disputed-difference", {
        confirmation: "disputed",
        claim: { kind: "field", field: "technology", value: "Go service" },
      }),
    ]);

    expect(result.comparisons.map(({ observationId, status }) => [
      observationId,
      status,
    ])).toEqual([
      ["confirmed-drift", "drift"],
      ["consistent", "consistent"],
      ["disputed-difference", "uncertain"],
      ["unreviewed-match", "uncertain"],
    ]);
    expect(result.findings.map(({ ruleId, severity }) => [ruleId, severity]))
      .toEqual([
        ["c4ml.observation.drift", "warning"],
        ["c4ml.observation.uncertain", "information"],
        ["c4ml.observation.uncertain", "information"],
      ]);
    expect(result.findings[0]).toMatchObject({
      subjectKeys: ["element:cultivation-api"],
      sourceLocations: [cultivationSource],
      evidence: [
        { origin: "authored" },
        {
          origin: "observed",
          adapterId: "c4ml.local-inventory/v1",
          observedAt: "2026-08-31T08:15:00.000Z",
          confirmation: "confirmed",
          source: resourceSource,
        },
      ],
    });
  });

  it("reports a confirmed presence disagreement without inventing authored source", () => {
    const result = evaluate([observation("unexpected-runtime", {
      subjectKey: "element:runtime-only-service",
      claim: { kind: "presence", value: true },
    })]);

    expect(result.comparisons[0]).toMatchObject({
      authoredValue: false,
      status: "drift",
    });
    expect(result.findings[0]).toMatchObject({
      sourceLocations: [resourceSource],
      evidence: [
        { origin: "authored", statement: expect.stringContaining("false") },
        { origin: "observed", statement: expect.stringContaining("true") },
      ],
    });
  });

  it("rejects duplicate identities and fields that do not apply to the subject kind", () => {
    expect(() => createArchitectureObservationSet({
      id: "duplicates",
      observations: [observation("same"), observation("same")],
    })).toThrowError(
      expect.objectContaining<Partial<ArchitectureObservationError>>({
        code: "C4ML-OBSERVATION-001",
      }),
    );
    expect(() => evaluate([observation("relationship-name", {
      subjectKey: "relationship:ui-calls-api",
      claim: { kind: "field", field: "name", value: "not applicable" },
    })])).toThrowError(
      expect.objectContaining<Partial<ArchitectureObservationError>>({
        code: "C4ML-OBSERVATION-002",
      }),
    );
  });

  it("is deterministic and does not reconcile observations into authored state", () => {
    const beforeModel = JSON.stringify(signalGardenModel);
    const beforeSnapshot = JSON.stringify(snapshot);
    const first = evaluate([
      observation("z-drift", {
        claim: { kind: "field", field: "technology", value: "Python service" },
      }),
      observation("a-consistent"),
    ]);
    const second = evaluate([
      observation("a-consistent"),
      observation("z-drift", {
        claim: { kind: "field", field: "technology", value: "Python service" },
      }),
    ]);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(JSON.stringify(signalGardenModel)).toBe(beforeModel);
    expect(JSON.stringify(snapshot)).toBe(beforeSnapshot);
    expect(snapshot.elements.find(({ id }) => id === "cultivation-api")?.technology)
      .toBe("TypeScript service");
  });
});
