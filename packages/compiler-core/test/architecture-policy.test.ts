import { describe, expect, it } from "vitest";

import {
  ArchitecturePolicyError,
  architectureGraphItemKey,
  createArchitecturePolicySet,
  createArchitectureProjectInput,
  createProposedProjectSourceChangeSet,
  evaluateArchitecturePolicies,
  isArchitecturePolicySet,
  resolveArchitectureSnapshot,
  type ArchitecturePolicy,
} from "../src/index.js";
import {
  signalGardenModel,
  signalGardenViews,
} from "./signal-garden.fixture.js";

const snapshot = resolveArchitectureSnapshot(
  signalGardenModel,
  signalGardenViews,
).snapshot!;

function policyBase(id: string) {
  return {
    id,
    title: id.replaceAll("-", " "),
    severity: "warning" as const,
  };
}

function evaluate(policies: readonly ArchitecturePolicy[]) {
  return evaluateArchitecturePolicies({
    model: signalGardenModel,
    views: signalGardenViews,
    snapshot,
    policySet: createArchitecturePolicySet({
      id: "signal-garden-policies",
      name: "Signal Garden architecture policies",
      policies,
    }),
  });
}

describe("portable architecture policy contract", () => {
  it("evaluates every version-one policy family as deterministic findings", () => {
    const policies: ArchitecturePolicy[] = [
      {
        ...policyBase("garden.forbidden-ledger-access"),
        kind: "forbidden-dependency",
        sourceKeys: [architectureGraphItemKey("element", "cultivation-api")],
        targetKeys: [architectureGraphItemKey("element", "ledger-store")],
      },
      {
        ...policyBase("garden.https-protocol"),
        kind: "required-protocol",
        relationshipKeys: [architectureGraphItemKey("relationship", "ui-calls-api")],
        allowedProtocols: ["HTTPS"],
      },
      {
        ...policyBase("garden.engine-owner"),
        kind: "required-ownership",
        subjectKeys: [architectureGraphItemKey("element", "recommendation-engine")],
        allowedOwnerKeys: [architectureGraphItemKey("element", "studio-ui")],
      },
      {
        ...policyBase("garden.ledger-direction"),
        kind: "allowed-direction",
        relationshipKeys: [architectureGraphItemKey("relationship", "api-writes-ledger")],
        allowedSourceKeys: [architectureGraphItemKey("element", "ledger-store")],
        allowedTargetKeys: [architectureGraphItemKey("element", "cultivation-api")],
      },
      {
        ...policyBase("garden.staging-worker"),
        kind: "deployment-consistency",
        staticElementKeys: [architectureGraphItemKey("element", "notify-worker")],
        environmentIds: ["staging"],
        minimumInstances: 1,
      },
      {
        ...policyBase("garden.critical-api"),
        kind: "required-metadata",
        subjectKeys: [architectureGraphItemKey("element", "cultivation-api")],
        requirements: [
          { kind: "property", property: "technology" },
          { kind: "tag", tag: "critical" },
          { kind: "metadata", key: "owner" },
        ],
      },
    ];

    const findings = evaluate(policies);
    const reversed = evaluate([...policies].reverse());

    expect(findings).toHaveLength(6);
    expect(JSON.stringify(reversed)).toBe(JSON.stringify(findings));
    expect(findings.map(({ ruleId }) => ruleId)).toEqual([
      "garden.critical-api",
      "garden.engine-owner",
      "garden.forbidden-ledger-access",
      "garden.https-protocol",
      "garden.ledger-direction",
      "garden.staging-worker",
    ]);
    expect(findings.every(({ sourceLocations }) => sourceLocations.length > 0)).toBe(true);
    expect(findings.find(({ ruleId }) => ruleId === "garden.critical-api")?.message)
      .toContain("metadata:owner, tag:critical");
  });

  it("accepts a complete project source change set as the only correction form", () => {
    const project = createArchitectureProjectInput({
      id: "signal-garden",
      documents: [{ uri: "architecture.c4ml", text: "relationship ui-calls-api {}" }],
    });
    const correction = createProposedProjectSourceChangeSet(project, {
      id: "declare-https-protocol",
      intent: {
        id: "garden.https-protocol",
        kind: "policy",
        summary: "Declare the required protocol.",
      },
      affectedIds: ["ui-calls-api"],
      edits: [{
        documentUri: "architecture.c4ml",
        startOffset: 26,
        endOffset: 26,
        text: '\n  protocol = "HTTPS"',
      }],
    });
    const relationshipKey = architectureGraphItemKey("relationship", "ui-calls-api");
    const policySet = createArchitecturePolicySet({
      id: "correctable",
      policies: [{
        ...policyBase("garden.https-protocol"),
        kind: "required-protocol",
        relationshipKeys: [relationshipKey],
        corrections: [{ subjectKey: relationshipKey, changeSet: correction }],
      }],
    });

    const [finding] = evaluateArchitecturePolicies({
      model: signalGardenModel,
      views: signalGardenViews,
      snapshot,
      policySet,
    });

    expect(finding?.correction).toEqual(correction);
    expect(finding?.correction?.intent.kind).toBe("policy");
    expect(isArchitecturePolicySet(policySet)).toBe(true);
  });

  it("rejects malformed, unknown, and inapplicable policies with stable codes", () => {
    expect(() =>
      createArchitecturePolicySet({
        id: "invalid",
        policies: [{
          ...policyBase("garden.unknown"),
          kind: "not-a-policy",
        } as unknown as ArchitecturePolicy],
      })
    ).toThrowError(expect.objectContaining<Partial<ArchitecturePolicyError>>({
      code: "C4ML-POLICY-001",
    }));

    expect(() => evaluate([{
      ...policyBase("garden.missing"),
      kind: "required-metadata",
      subjectKeys: [architectureGraphItemKey("element", "missing")],
      requirements: [{ kind: "tag", tag: "owned" }],
    }])).toThrowError(expect.objectContaining<Partial<ArchitecturePolicyError>>({
      code: "C4ML-POLICY-002",
    }));

    expect(() => evaluate([{
      ...policyBase("garden.code-deployment"),
      kind: "deployment-consistency",
      staticElementKeys: [architectureGraphItemKey("element", "zone-policy")],
      environmentIds: ["production"],
    }])).toThrowError(expect.objectContaining<Partial<ArchitecturePolicyError>>({
      code: "C4ML-POLICY-003",
    }));
  });
});
