import { describe, expect, it } from "vitest";

import {
  AnalysisContractError,
  architectureGraphItemKey,
  createAnalysisFinding,
  createArchitectureAnalysisReport,
  createArchitectureQueryResult,
  evaluateBuiltInArchitectureQuality,
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
  it("turns shared validation guidance into source-located findings", () => {
    const model = {
      ...signalGardenModel,
      relationships: signalGardenModel.relationships.map((relationship) =>
        relationship.id === "grower-plans-system"
          ? { ...relationship, description: "Uses" }
          : relationship,
      ),
    };
    const resolved = resolveArchitectureSnapshot(model, signalGardenViews);
    const findings = evaluateBuiltInArchitectureQuality({
      model,
      views: signalGardenViews,
      snapshot: resolved.snapshot!,
      diagnostics: resolved.diagnostics,
    });
    const finding = findings.find(({ ruleId }) =>
      ruleId === "c4ml.validation.c4ml-sem-014"
    );

    expect(finding).toMatchObject({
      severity: "warning",
      subjectKeys: ["relationship:grower-plans-system"],
      sourceLocations: [signalGardenModel.relationships[0]!.source],
    });
    expect(finding?.message).toContain("State the concrete intent");
  });

  it("reports only explicit coverage and empty-view evidence", () => {
    const uncovered = {
      id: "uncovered-observer",
      kind: "code-element" as const,
      componentId: "plan-controller",
      name: "Uncovered Observer",
      description: "Reviews a model-only concern.",
      codeKind: "module",
      source: source(80),
    };
    const model = {
      ...signalGardenModel,
      elements: [...signalGardenModel.elements, uncovered],
    };
    const resolved = resolveArchitectureSnapshot(model, signalGardenViews);
    const findings = evaluateBuiltInArchitectureQuality({
      model,
      views: signalGardenViews,
      snapshot: resolved.snapshot!,
      diagnostics: resolved.diagnostics,
    });
    expect(findings.find(({ id }) =>
      id === "finding:quality:view-coverage:element:uncovered-observer"
    )).toMatchObject({
      severity: "information",
      sourceLocations: [source(80)],
    });

    const emptyView = {
      id: "empty-landscape",
      kind: "system-landscape" as const,
      title: "Empty landscape",
      purpose: "Shows an intentionally empty selection.",
      scope: "Garden portfolio",
      selection: {
        excludeElementIds: model.elements
          .filter(({ kind }) => kind === "person" || kind === "software-system")
          .map(({ id }) => id),
      },
      source: source(90),
    };
    const emptyResolved = resolveArchitectureSnapshot(model, [emptyView]);
    const emptyFindings = evaluateBuiltInArchitectureQuality({
      model,
      views: [emptyView],
      snapshot: emptyResolved.snapshot!,
      diagnostics: emptyResolved.diagnostics,
    });
    expect(emptyFindings.find(({ ruleId }) =>
      ruleId === "c4ml.quality.empty-view"
    )).toMatchObject({
      subjectKeys: ["view:empty-landscape"],
      sourceLocations: [source(90)],
    });
  });

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

  it("accepts only fully attributed and explicitly confirmed observation evidence", () => {
    const finding = createAnalysisFinding({
      id: "finding:confirmed-observation",
      ruleId: "c4ml.observation.drift",
      severity: "warning",
      message: "A confirmed observation differs from the authored architecture.",
      subjectKeys: [architectureGraphItemKey("element", "cultivation-api")],
      evidence: [{
        id: "observation:runtime-technology",
        origin: "observed",
        subjectKey: architectureGraphItemKey("element", "cultivation-api"),
        statement: "The local inventory reported a Python runtime.",
        adapterId: "c4ml.local-inventory/v1",
        observedAt: "2026-08-31T10:15:00+02:00",
        confirmation: "confirmed",
      }],
    });

    expect(finding.evidence[0]).toMatchObject({
      adapterId: "c4ml.local-inventory/v1",
      observedAt: "2026-08-31T10:15:00+02:00",
      confirmation: "confirmed",
    });
    expect(() => createAnalysisFinding({
      ...finding,
      id: "finding:invalid-observation-time",
      evidence: [{
        ...finding.evidence[0]!,
        id: "observation:invalid-time",
        observedAt: "2026-08-31 10:15",
      }],
    })).toThrowError(
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
          id: "path:ledger",
          origin: "derived",
          subjectKey: architectureGraphItemKey("element", "ledger-store"),
          statement: "The storage relationship reaches the ledger.",
        },
        {
          id: "path:notice",
          origin: "derived",
          subjectKey: architectureGraphItemKey("element", "notify-worker"),
          statement: "The notification relationship reaches this worker.",
        },
        {
          id: "relationship:notice",
          origin: "derived",
          subjectKey: architectureGraphItemKey(
            "relationship",
            "api-enqueues-notice",
          ),
          statement: "This relationship carries the notification path.",
        },
        {
          id: "relationship:ledger",
          origin: "derived",
          subjectKey: architectureGraphItemKey(
            "relationship",
            "api-writes-ledger",
          ),
          statement: "This relationship carries the storage path.",
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
    expect(result.evidence.map(({ id }) => id)).toEqual([
      "path:ledger",
      "path:notice",
      "relationship:notice",
      "relationship:ledger",
    ]);
  });

  it("rejects unexplained query result identities", () => {
    expect(() =>
      createArchitectureQueryResult({
        queryId: "unexplained",
        resultKind: "downstream",
        itemKeys: [architectureGraphItemKey("element", "cultivation-api")],
        relationshipKeys: [],
        evidence: [],
      }),
    ).toThrowError(
      expect.objectContaining<Partial<AnalysisContractError>>({
        code: "C4ML-ANALYSIS-003",
      }),
    );
  });
});
