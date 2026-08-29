import { describe, expect, it } from "vitest";

import {
  AnalysisContractError,
  architectureGraphItemKey,
  createAnalysisFinding,
  createArchitectureAnalysisReport,
  createArchitectureQueryResult,
  createProposedSourceChangeSet,
  type SourceReference,
} from "../src/index.js";
import {
  signalGardenModel,
  signalGardenViews,
} from "./signal-garden.fixture.js";
import { resolveArchitectureSnapshot } from "../src/architecture-snapshot.js";

function source(line: number): SourceReference {
  return {
    file: "policy.c4ml",
    range: {
      start: { offset: line * 10, line, column: 0 },
      end: { offset: line * 10 + 5, line, column: 5 },
    },
  };
}

describe("analysis finding and evidence contracts", () => {
  it("creates a deterministic portable analysis report", () => {
    const snapshot = resolveArchitectureSnapshot(
      signalGardenModel,
      signalGardenViews,
    ).snapshot!;
    const later = createAnalysisFinding({
      id: "finding:z",
      ruleId: "c4ml.example.z",
      severity: "warning",
      message: "Later finding.",
      subjectKeys: [architectureGraphItemKey("element", "cultivation-api")],
      evidence: [
        {
          id: "evidence:z",
          origin: "derived",
          subjectKey: architectureGraphItemKey("element", "cultivation-api"),
          statement: "Derived from the canonical architecture.",
        },
      ],
    });
    const earlier = createAnalysisFinding({
      ...later,
      id: "finding:a",
      ruleId: "c4ml.example.a",
      evidence: [{ ...later.evidence[0]!, id: "evidence:a" }],
    });

    const report = createArchitectureAnalysisReport(snapshot, [later, earlier]);

    expect(report.version).toBe(1);
    expect(report.findings.map(({ id }) => id)).toEqual([
      "finding:a",
      "finding:z",
    ]);
    expect(report.snapshot).toBe(snapshot);
  });

  it("normalizes a deterministic source-located finding with a proposed correction", () => {
    const authoredSource = 'relationship api-to-ledger { protocol = "" }';
    const valueStart = authoredSource.indexOf('""');
    const correction = createProposedSourceChangeSet(authoredSource, {
      id: "set-ledger-protocol",
      intent: {
        id: "policy:required-protocol",
        kind: "policy",
        summary: "Declare the database protocol.",
      },
      affectedIds: ["api-to-ledger"],
      edits: [
        {
          startOffset: valueStart,
          endOffset: valueStart + 2,
          text: '"PostgreSQL wire protocol"',
        },
      ],
    });

    const finding = createAnalysisFinding({
      id: "finding:api-to-ledger:protocol",
      ruleId: "c4ml.relationship.protocol-required",
      severity: "error",
      message: "Container relationships require a protocol.",
      subjectKeys: [architectureGraphItemKey("relationship", "api-to-ledger")],
      evidence: [
        {
          id: "evidence:relationship-kind",
          origin: "derived",
          subjectKey: architectureGraphItemKey("relationship", "api-to-ledger"),
          statement: "Both endpoints are Containers.",
          source: source(8),
        },
        {
          id: "evidence:missing-protocol",
          origin: "authored",
          subjectKey: architectureGraphItemKey("relationship", "api-to-ledger"),
          statement: "The authored protocol is empty.",
          source: source(9),
        },
      ],
      sourceLocations: [source(9), source(8)],
      correction,
    });

    expect(finding).toMatchObject({
      ruleId: "c4ml.relationship.protocol-required",
      subjectKeys: ["relationship:api-to-ledger"],
      sourceLocations: [source(8), source(9)],
      correction: { id: "set-ledger-protocol" },
    });
    expect(finding.evidence.map(({ id }) => id)).toEqual([
      "evidence:relationship-kind",
      "evidence:missing-protocol",
    ]);
  });

  it("requires attribution for externally observed evidence", () => {
    expect(() =>
      createAnalysisFinding({
        id: "finding:drift",
        ruleId: "c4ml.observation.drift",
        severity: "warning",
        message: "Observed communication is not authored.",
        subjectKeys: [architectureGraphItemKey("element", "cultivation-api")],
        evidence: [
          {
            id: "observation:kafka",
            origin: "observed",
            subjectKey: architectureGraphItemKey("element", "cultivation-api"),
            statement: "A Kafka client was observed.",
          },
        ],
      }),
    ).toThrowError(
      expect.objectContaining<Partial<AnalysisContractError>>({
        code: "C4ML-ANALYSIS-003",
      }),
    );
  });

  it("normalizes query result sets while preserving the evidence path order", () => {
    const result = createArchitectureQueryResult({
      queryId: "impact:cultivation-api",
      resultKind: "downstream",
      itemKeys: [
        architectureGraphItemKey("element", "notify-worker"),
        architectureGraphItemKey("element", "ledger-store"),
        architectureGraphItemKey("element", "notify-worker"),
      ],
      relationshipKeys: [
        architectureGraphItemKey("relationship", "api-writes-ledger"),
        architectureGraphItemKey("relationship", "api-enqueues-notice"),
      ],
      evidence: [
        {
          id: "path:1",
          origin: "derived",
          subjectKey: architectureGraphItemKey("element", "cultivation-api"),
          statement: "Traversal starts at Cultivation API.",
        },
        {
          id: "path:2",
          origin: "derived",
          subjectKey: architectureGraphItemKey("element", "notify-worker"),
          statement: "The notification relationship reaches this worker.",
        },
      ],
    });

    expect(result.itemKeys).toEqual([
      "element:ledger-store",
      "element:notify-worker",
    ]);
    expect(result.relationshipKeys).toEqual([
      "relationship:api-enqueues-notice",
      "relationship:api-writes-ledger",
    ]);
    expect(result.evidence.map(({ id }) => id)).toEqual(["path:1", "path:2"]);
  });
});
