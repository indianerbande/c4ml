import {
  architectureGraphItemKey,
  createArchitectureGraphIndex,
  type ArchitectureGraphItemKey,
} from "./architecture-graph.js";
import type { ArchitectureSnapshot, SnapshotElement } from "./architecture-snapshot.js";
import {
  createAnalysisFinding,
  type AnalysisFinding,
  type ProposedAnalysisCorrection,
} from "./analysis.js";
import type { DiagnosticSeverity } from "./diagnostics.js";
import type { ArchitectureModel } from "./model.js";
import { compareText } from "./ordering.js";
import { sourceOf, type SourceReference } from "./source.js";
import {
  isProposedProjectSourceChangeSet,
  isProposedSourceChangeSet,
} from "./source-changes.js";
import type { ArchitectureView } from "./views.js";

export const architecturePolicySetVersion = 1 as const;

export interface ArchitecturePolicyCorrection {
  readonly subjectKey: ArchitectureGraphItemKey;
  readonly changeSet: ProposedAnalysisCorrection;
}

interface ArchitecturePolicyBase {
  readonly id: string;
  readonly title: string;
  readonly severity: DiagnosticSeverity;
  readonly source?: SourceReference;
  readonly corrections?: readonly ArchitecturePolicyCorrection[];
}

export interface ForbiddenDependencyPolicy extends ArchitecturePolicyBase {
  readonly kind: "forbidden-dependency";
  readonly sourceKeys: readonly ArchitectureGraphItemKey[];
  readonly targetKeys: readonly ArchitectureGraphItemKey[];
}

export interface RequiredProtocolPolicy extends ArchitecturePolicyBase {
  readonly kind: "required-protocol";
  readonly relationshipKeys: readonly ArchitectureGraphItemKey[];
  readonly allowedProtocols?: readonly string[];
}

export interface RequiredOwnershipPolicy extends ArchitecturePolicyBase {
  readonly kind: "required-ownership";
  readonly subjectKeys: readonly ArchitectureGraphItemKey[];
  readonly allowedOwnerKeys: readonly ArchitectureGraphItemKey[];
}

export interface AllowedDirectionPolicy extends ArchitecturePolicyBase {
  readonly kind: "allowed-direction";
  readonly relationshipKeys: readonly ArchitectureGraphItemKey[];
  readonly allowedSourceKeys: readonly ArchitectureGraphItemKey[];
  readonly allowedTargetKeys: readonly ArchitectureGraphItemKey[];
}

export interface DeploymentConsistencyPolicy extends ArchitecturePolicyBase {
  readonly kind: "deployment-consistency";
  readonly staticElementKeys: readonly ArchitectureGraphItemKey[];
  readonly environmentIds: readonly string[];
  readonly minimumInstances?: number;
}

export type RequiredMetadataRequirement =
  | { readonly kind: "metadata"; readonly key: string }
  | { readonly kind: "property"; readonly property: "classification" | "description" | "technology" }
  | { readonly kind: "tag"; readonly tag: string };

export interface RequiredMetadataPolicy extends ArchitecturePolicyBase {
  readonly kind: "required-metadata";
  readonly subjectKeys: readonly ArchitectureGraphItemKey[];
  readonly requirements: readonly RequiredMetadataRequirement[];
}

export type ArchitecturePolicy =
  | AllowedDirectionPolicy
  | DeploymentConsistencyPolicy
  | ForbiddenDependencyPolicy
  | RequiredMetadataPolicy
  | RequiredOwnershipPolicy
  | RequiredProtocolPolicy;

export interface ArchitecturePolicySet {
  readonly version: typeof architecturePolicySetVersion;
  readonly id: string;
  readonly name?: string;
  readonly policies: readonly ArchitecturePolicy[];
}

export interface ArchitecturePolicySetInput {
  readonly id: string;
  readonly name?: string;
  readonly policies: readonly ArchitecturePolicy[];
}

export interface ArchitecturePolicyEvaluationInput {
  readonly model: ArchitectureModel;
  readonly views: readonly ArchitectureView[];
  readonly snapshot: ArchitectureSnapshot;
  readonly policySet: ArchitecturePolicySet;
}

export type ArchitecturePolicySetParseResult =
  | {
      readonly valid: true;
      readonly policySet: ArchitecturePolicySet;
      readonly error: undefined;
    }
  | {
      readonly valid: false;
      readonly policySet: undefined;
      readonly error: ArchitecturePolicyError;
    };

export class ArchitecturePolicyError extends Error {
  constructor(
    readonly code:
      | "C4ML-POLICY-001"
      | "C4ML-POLICY-002"
      | "C4ML-POLICY-003",
    message: string,
  ) {
    super(message);
    this.name = "ArchitecturePolicyError";
  }
}

export function parseArchitecturePolicySet(
  source: string,
): ArchitecturePolicySetParseResult {
  let candidate: unknown;
  try {
    candidate = JSON.parse(source);
  } catch {
    return {
      valid: false,
      policySet: undefined,
      error: new ArchitecturePolicyError(
        "C4ML-POLICY-001",
        "An architecture policy resource must contain valid JSON.",
      ),
    };
  }
  try {
    if (!isRecord(candidate)) {
      malformed("An architecture policy resource must contain one JSON object.");
    }
    if (candidate["version"] !== architecturePolicySetVersion) {
      malformed(
        `An architecture policy resource must declare version ${architecturePolicySetVersion}.`,
      );
    }
    return {
      valid: true,
      policySet: createArchitecturePolicySet({
        id: candidate["id"] as string,
        ...(candidate["name"] === undefined
          ? {}
          : { name: candidate["name"] as string }),
        policies: candidate["policies"] as ArchitecturePolicy[],
      }),
      error: undefined,
    };
  } catch (error: unknown) {
    return {
      valid: false,
      policySet: undefined,
      error: error instanceof ArchitecturePolicyError
        ? error
        : new ArchitecturePolicyError(
            "C4ML-POLICY-001",
            "The architecture policy resource is malformed.",
          ),
    };
  }
}

export function createArchitecturePolicySet(
  input: ArchitecturePolicySetInput,
): ArchitecturePolicySet {
  requireText(input.id, "policy-set identity");
  if (input.name !== undefined) requireText(input.name, "policy-set name");
  if (!Array.isArray(input.policies) || input.policies.length === 0) {
    malformed("An architecture policy set requires at least one policy.");
  }
  const policies = input.policies.map(normalizePolicy).sort((left, right) =>
    compareText(left.id, right.id)
  );
  if (new Set(policies.map(({ id }) => id)).size !== policies.length) {
    malformed("Architecture policy identities must be unique within a policy set.");
  }
  return {
    version: architecturePolicySetVersion,
    id: input.id,
    ...(input.name === undefined ? {} : { name: input.name }),
    policies,
  };
}

export function isArchitecturePolicySet(value: unknown): value is ArchitecturePolicySet {
  if (!isRecord(value) || value["version"] !== architecturePolicySetVersion) {
    return false;
  }
  try {
    createArchitecturePolicySet({
      id: value["id"] as string,
      ...(value["name"] === undefined ? {} : { name: value["name"] as string }),
      policies: value["policies"] as ArchitecturePolicy[],
    });
    return true;
  } catch {
    return false;
  }
}

export function evaluateArchitecturePolicies(
  input: ArchitecturePolicyEvaluationInput,
): AnalysisFinding[] {
  const policySet = createArchitecturePolicySet({
    id: input.policySet.id,
    ...(input.policySet.name === undefined ? {} : { name: input.policySet.name }),
    policies: input.policySet.policies,
  });
  const graph = createArchitectureGraphIndex(input.snapshot);
  const knownKeys = new Set(graph.itemKeys);
  const elements = new Map(input.snapshot.elements.map((element) => [element.id, element]));
  const relationships = new Map(
    input.snapshot.relationships.map((relationship) => [relationship.id, relationship]),
  );
  const sources = createSourceIndex(input.model, input.views);
  const findings = policySet.policies.flatMap((policy) => {
    validatePolicyApplicability(policy, input.snapshot, knownKeys, elements, relationships);
    switch (policy.kind) {
      case "allowed-direction":
        return policy.relationshipKeys.flatMap((key) => {
          const relationship = relationships.get(keyId(key))!;
          const sourceKey = architectureGraphItemKey("element", relationship.sourceId);
          const targetKey = architectureGraphItemKey("element", relationship.targetId);
          return policy.allowedSourceKeys.includes(sourceKey) &&
              policy.allowedTargetKeys.includes(targetKey)
            ? []
            : [policyFinding(
                policy,
                key,
                [key, sourceKey, targetKey],
                `Relationship "${relationship.id}" points from ${sourceKey} to ${targetKey}, outside the allowed direction.`,
                "The canonical Relationship endpoints do not match the allowed source and target sets.",
                sources,
              )];
        });
      case "deployment-consistency": {
        const deployment = input.snapshot.deployment!;
        const minimum = policy.minimumInstances ?? 1;
        return policy.staticElementKeys.flatMap((key) =>
          policy.environmentIds.flatMap((environmentId) => {
            const count = deployment.instances.filter(
              (instance) =>
                instance.staticElementId === keyId(key) &&
                instance.environmentId === environmentId,
            ).length;
            return count >= minimum
              ? []
              : [policyFinding(
                  policy,
                  key,
                  [key],
                  `${key} has ${count} deployment instance(s) in environment "${environmentId}"; policy requires at least ${minimum}.`,
                  "The canonical deployment snapshot does not contain the required number of matching instances.",
                  sources,
                  environmentId,
                )];
          })
        );
      }
      case "forbidden-dependency":
        return input.snapshot.relationships.flatMap((relationship) => {
          const key = architectureGraphItemKey("relationship", relationship.id);
          const sourceKey = architectureGraphItemKey("element", relationship.sourceId);
          const targetKey = architectureGraphItemKey("element", relationship.targetId);
          return policy.sourceKeys.includes(sourceKey) && policy.targetKeys.includes(targetKey)
            ? [policyFinding(
                policy,
                key,
                [key, sourceKey, targetKey],
                `Relationship "${relationship.id}" creates a forbidden dependency from ${sourceKey} to ${targetKey}.`,
                "The canonical architecture contains a Relationship between the forbidden endpoint sets.",
                sources,
              )]
            : [];
        });
      case "required-metadata":
        return policy.subjectKeys.flatMap((key) => {
          const element = elements.get(keyId(key))!;
          const missing = policy.requirements.filter((requirement) =>
            !hasMetadataRequirement(element, requirement)
          );
          return missing.length === 0
            ? []
            : [policyFinding(
                policy,
                key,
                [key],
                `${key} is missing required architecture metadata: ${missing.map(describeRequirement).join(", ")}.`,
                "The canonical element does not contain every metadata value required by the policy.",
                sources,
              )];
        });
      case "required-ownership":
        return policy.subjectKeys.flatMap((key) => {
          const element = elements.get(keyId(key))!;
          const ownerKey = architectureGraphItemKey("element", element.parentId!);
          return policy.allowedOwnerKeys.includes(ownerKey)
            ? []
            : [policyFinding(
                policy,
                key,
                [key, ownerKey],
                `${key} is owned by ${ownerKey}, outside the allowed ownership set.`,
                "The canonical containment parent is not one of the policy's allowed owners.",
                sources,
              )];
        });
      case "required-protocol":
        return policy.relationshipKeys.flatMap((key) => {
          const relationship = relationships.get(keyId(key))!;
          const protocol = relationship.protocol?.trim();
          const valid = protocol !== undefined && protocol.length > 0 &&
            (policy.allowedProtocols === undefined || policy.allowedProtocols.includes(protocol));
          return valid
            ? []
            : [policyFinding(
                policy,
                key,
                [key],
                policy.allowedProtocols === undefined
                  ? `Relationship "${relationship.id}" must declare a protocol.`
                  : `Relationship "${relationship.id}" must use one of these protocols: ${policy.allowedProtocols.join(", ")}.`,
                protocol === undefined || protocol.length === 0
                  ? "The canonical Relationship has no authored protocol."
                  : `The authored protocol is "${protocol}", which is outside the allowed set.`,
                sources,
              )];
        });
    }
  });
  return findings.sort((left, right) => compareText(left.id, right.id));
}

function normalizePolicy(policy: ArchitecturePolicy): ArchitecturePolicy {
  if (!isRecord(policy)) malformed("Every architecture policy must be an object.");
  requireText(policy.id, "policy identity");
  requireText(policy.title, "policy title");
  if (!isSeverity(policy.severity)) malformed(`Policy "${policy.id}" has an invalid severity.`);
  const base = {
    id: policy.id,
    title: policy.title,
    severity: policy.severity,
    ...(policy.source === undefined ? {} : { source: cloneSource(policy.source) }),
    ...(policy.corrections === undefined
      ? {}
      : { corrections: normalizeCorrections(policy.id, policy.corrections) }),
  };
  switch (policy.kind) {
    case "allowed-direction":
      return {
        ...base,
        kind: policy.kind,
        relationshipKeys: requireKeys(policy.relationshipKeys, policy.id, "Relationship"),
        allowedSourceKeys: requireKeys(policy.allowedSourceKeys, policy.id, "allowed source"),
        allowedTargetKeys: requireKeys(policy.allowedTargetKeys, policy.id, "allowed target"),
      };
    case "deployment-consistency":
      if (policy.minimumInstances !== undefined &&
          (!Number.isInteger(policy.minimumInstances) || policy.minimumInstances < 1)) {
        malformed(`Policy "${policy.id}" requires a positive integer minimumInstances value.`);
      }
      return {
        ...base,
        kind: policy.kind,
        staticElementKeys: requireKeys(policy.staticElementKeys, policy.id, "static element"),
        environmentIds: requireTexts(policy.environmentIds, policy.id, "environment"),
        ...(policy.minimumInstances === undefined ? {} : { minimumInstances: policy.minimumInstances }),
      };
    case "forbidden-dependency":
      return {
        ...base,
        kind: policy.kind,
        sourceKeys: requireKeys(policy.sourceKeys, policy.id, "source"),
        targetKeys: requireKeys(policy.targetKeys, policy.id, "target"),
      };
    case "required-metadata":
      if (!Array.isArray(policy.requirements) || policy.requirements.length === 0) {
        malformed(`Policy "${policy.id}" requires at least one metadata requirement.`);
      }
      const requirements = policy.requirements
        .map((requirement) => normalizeRequirement(policy.id, requirement))
        .sort((left, right) => compareText(describeRequirement(left), describeRequirement(right)));
      if (new Set(requirements.map(describeRequirement)).size !== requirements.length) {
        malformed(`Policy "${policy.id}" has duplicate metadata requirements.`);
      }
      return {
        ...base,
        kind: policy.kind,
        subjectKeys: requireKeys(policy.subjectKeys, policy.id, "subject"),
        requirements,
      };
    case "required-ownership":
      return {
        ...base,
        kind: policy.kind,
        subjectKeys: requireKeys(policy.subjectKeys, policy.id, "subject"),
        allowedOwnerKeys: requireKeys(policy.allowedOwnerKeys, policy.id, "allowed owner"),
      };
    case "required-protocol":
      return {
        ...base,
        kind: policy.kind,
        relationshipKeys: requireKeys(policy.relationshipKeys, policy.id, "Relationship"),
        ...(policy.allowedProtocols === undefined
          ? {}
          : { allowedProtocols: requireTexts(policy.allowedProtocols, policy.id, "protocol") }),
      };
    default:
      malformed(`Unknown architecture policy kind "${String((policy as { kind?: unknown }).kind)}".`);
  }
}

function validatePolicyApplicability(
  policy: ArchitecturePolicy,
  snapshot: ArchitectureSnapshot,
  knownKeys: ReadonlySet<ArchitectureGraphItemKey>,
  elements: ReadonlyMap<string, SnapshotElement>,
  relationships: ReadonlyMap<string, ArchitectureSnapshot["relationships"][number]>,
): void {
  const requireKnown = (keys: readonly ArchitectureGraphItemKey[]): void => {
    const unknown = keys.filter((key) => !knownKeys.has(key));
    if (unknown.length > 0) {
      throw new ArchitecturePolicyError(
        "C4ML-POLICY-002",
        `Policy "${policy.id}" references unknown architecture identities: ${unknown.join(", ")}.`,
      );
    }
  };
  const requireElementKeys = (keys: readonly ArchitectureGraphItemKey[]): void => {
    requireKnown(keys);
    if (keys.some((key) => !key.startsWith("element:") || !elements.has(keyId(key)))) {
      inapplicable(policy, "requires static element identities");
    }
  };
  const requireRelationshipKeys = (keys: readonly ArchitectureGraphItemKey[]): void => {
    requireKnown(keys);
    if (keys.some((key) => !key.startsWith("relationship:") || !relationships.has(keyId(key)))) {
      inapplicable(policy, "requires static Relationship identities");
    }
  };
  requireKnown(policy.corrections?.map(({ subjectKey }) => subjectKey) ?? []);
  switch (policy.kind) {
    case "allowed-direction":
      requireRelationshipKeys(policy.relationshipKeys);
      requireElementKeys(policy.allowedSourceKeys);
      requireElementKeys(policy.allowedTargetKeys);
      break;
    case "deployment-consistency": {
      requireElementKeys(policy.staticElementKeys);
      if (snapshot.deployment === undefined) inapplicable(policy, "requires a deployment model");
      const environments = new Set(snapshot.deployment!.environments.map(({ id }) => id));
      const unknown = policy.environmentIds.filter((id) => !environments.has(id));
      if (unknown.length > 0) {
        throw new ArchitecturePolicyError(
          "C4ML-POLICY-002",
          `Policy "${policy.id}" references unknown deployment environments: ${unknown.join(", ")}.`,
        );
      }
      if (policy.staticElementKeys.some((key) => {
        const kind = elements.get(keyId(key))!.kind;
        return kind !== "container" && kind !== "software-system";
      })) {
        inapplicable(policy, "can require deployment only for Containers or Software Systems");
      }
      break;
    }
    case "forbidden-dependency":
      requireElementKeys(policy.sourceKeys);
      requireElementKeys(policy.targetKeys);
      break;
    case "required-metadata":
      requireElementKeys(policy.subjectKeys);
      break;
    case "required-ownership":
      requireElementKeys(policy.subjectKeys);
      requireElementKeys(policy.allowedOwnerKeys);
      if (policy.subjectKeys.some((key) => elements.get(keyId(key))!.parentId === undefined)) {
        inapplicable(policy, "requires subjects with semantic owners");
      }
      break;
    case "required-protocol":
      requireRelationshipKeys(policy.relationshipKeys);
      break;
  }
}

function policyFinding(
  policy: ArchitecturePolicy,
  violationKey: ArchitectureGraphItemKey,
  subjectKeys: readonly ArchitectureGraphItemKey[],
  message: string,
  statement: string,
  sources: ReadonlyMap<ArchitectureGraphItemKey, SourceReference>,
  qualifier?: string,
): AnalysisFinding {
  const sourceLocations = subjectKeys.flatMap((key) => {
    const source = sources.get(key);
    return source === undefined ? [] : [source];
  });
  if (policy.source !== undefined) sourceLocations.push(policy.source);
  const correction = policy.corrections?.find(({ subjectKey }) => subjectKey === violationKey)?.changeSet;
  return createAnalysisFinding({
    id: ["finding", "policy", policy.id, violationKey, qualifier].filter(Boolean).join(":"),
    ruleId: policy.id,
    severity: policy.severity,
    message,
    subjectKeys,
    evidence: [
      {
        id: `evidence:policy:${policy.id}:${violationKey}:requirement`,
        origin: "authored",
        subjectKey: violationKey,
        statement: `Policy "${policy.title}" applies to this architecture identity.`,
        ...(policy.source === undefined ? {} : { source: policy.source }),
      },
      {
        id: `evidence:policy:${policy.id}:${violationKey}:violation${qualifier === undefined ? "" : `:${qualifier}`}`,
        origin: "derived",
        subjectKey: violationKey,
        statement,
        ...(sources.get(violationKey) === undefined ? {} : { source: sources.get(violationKey)! }),
      },
    ],
    sourceLocations,
    ...(correction === undefined ? {} : { correction }),
  });
}

function createSourceIndex(
  model: ArchitectureModel,
  views: readonly ArchitectureView[],
): ReadonlyMap<ArchitectureGraphItemKey, SourceReference> {
  const entries: [ArchitectureGraphItemKey, SourceReference][] = [
    ...model.elements.map((item): [ArchitectureGraphItemKey, SourceReference] =>
      [architectureGraphItemKey("element", item.id), sourceOf(item)]),
    ...model.relationships.map((item): [ArchitectureGraphItemKey, SourceReference] =>
      [architectureGraphItemKey("relationship", item.id), sourceOf(item)]),
    ...views.map((item): [ArchitectureGraphItemKey, SourceReference] =>
      [architectureGraphItemKey("view", item.id), sourceOf(item)]),
  ];
  if (model.deployment !== undefined) {
    entries.push(
      ...model.deployment.environments.map((item): [ArchitectureGraphItemKey, SourceReference] =>
        [architectureGraphItemKey("deployment-environment", item.id), sourceOf(item)]),
      ...model.deployment.nodes.map((item): [ArchitectureGraphItemKey, SourceReference] =>
        [architectureGraphItemKey("deployment-node", item.id), sourceOf(item)]),
      ...model.deployment.infrastructureNodes.map((item): [ArchitectureGraphItemKey, SourceReference] =>
        [architectureGraphItemKey("infrastructure-node", item.id), sourceOf(item)]),
      ...model.deployment.instances.map((item): [ArchitectureGraphItemKey, SourceReference] =>
        [architectureGraphItemKey("deployment-instance", item.id), sourceOf(item)]),
      ...model.deployment.relationships.map((item): [ArchitectureGraphItemKey, SourceReference] =>
        [architectureGraphItemKey("deployment-relationship", item.id), sourceOf(item)]),
    );
  }
  return new Map(entries);
}

function normalizeCorrections(
  policyId: string,
  corrections: readonly ArchitecturePolicyCorrection[],
): ArchitecturePolicyCorrection[] {
  if (!Array.isArray(corrections)) malformed(`Policy "${policyId}" corrections must be an array.`);
  const normalized = corrections.map((correction) => {
    if (!isRecord(correction) || !isArchitectureGraphItemKey(correction.subjectKey) ||
        (!isProposedSourceChangeSet(correction.changeSet) &&
          !isProposedProjectSourceChangeSet(correction.changeSet))) {
      malformed(`Policy "${policyId}" corrections must contain complete proposed source change sets.`);
    }
    if (correction.changeSet.intent.kind !== "policy") {
      malformed(`Policy "${policyId}" corrections must use policy source-change intent.`);
    }
    return { subjectKey: correction.subjectKey, changeSet: correction.changeSet };
  }).sort((left, right) => compareText(left.subjectKey, right.subjectKey));
  if (new Set(normalized.map(({ subjectKey }) => subjectKey)).size !== normalized.length) {
    malformed(`Policy "${policyId}" has duplicate corrections for one subject.`);
  }
  return normalized;
}

function normalizeRequirement(
  policyId: string,
  requirement: RequiredMetadataRequirement,
): RequiredMetadataRequirement {
  if (!isRecord(requirement)) malformed(`Policy "${policyId}" has an invalid metadata requirement.`);
  switch (requirement.kind) {
    case "metadata":
      requireText(requirement.key, "metadata key");
      return { kind: requirement.kind, key: requirement.key };
    case "property":
      if (requirement.property !== "classification" && requirement.property !== "description" &&
          requirement.property !== "technology") {
        malformed(`Policy "${policyId}" has an unknown required property.`);
      }
      return { kind: requirement.kind, property: requirement.property };
    case "tag":
      requireText(requirement.tag, "required tag");
      return { kind: requirement.kind, tag: requirement.tag };
    default:
      malformed(`Policy "${policyId}" has an unknown metadata requirement kind.`);
  }
}

function hasMetadataRequirement(
  element: SnapshotElement,
  requirement: RequiredMetadataRequirement,
): boolean {
  switch (requirement.kind) {
    case "metadata": {
      const value = element.metadata?.[requirement.key];
      return value !== undefined && value !== null && value !== "";
    }
    case "property":
      return typeof element[requirement.property] === "string" &&
        element[requirement.property]!.trim().length > 0;
    case "tag":
      return element.tags.includes(requirement.tag);
  }
}

function describeRequirement(requirement: RequiredMetadataRequirement): string {
  switch (requirement.kind) {
    case "metadata": return `metadata:${requirement.key}`;
    case "property": return requirement.property;
    case "tag": return `tag:${requirement.tag}`;
  }
}

function requireKeys(
  values: readonly ArchitectureGraphItemKey[],
  policyId: string,
  label: string,
): ArchitectureGraphItemKey[] {
  if (!Array.isArray(values) || values.length === 0 ||
      values.some((value) => typeof value !== "string" || value.trim().length === 0)) {
    malformed(`Policy "${policyId}" requires at least one ${label} identity.`);
  }
  return [...new Set(values)].sort(compareText);
}

function requireTexts(values: readonly string[], policyId: string, label: string): string[] {
  if (!Array.isArray(values) || values.length === 0 ||
      values.some((value) => typeof value !== "string" || value.trim().length === 0)) {
    malformed(`Policy "${policyId}" requires at least one ${label} value.`);
  }
  return [...new Set(values)].sort(compareText);
}

function requireText(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    malformed(`Architecture ${label} must not be empty.`);
  }
}

function isSeverity(value: unknown): value is DiagnosticSeverity {
  return value === "error" || value === "information" || value === "warning";
}

function isArchitectureGraphItemKey(value: unknown): value is ArchitectureGraphItemKey {
  return typeof value === "string" &&
    /^(deployment-environment|deployment-instance|deployment-node|deployment-relationship|element|group|infrastructure-node|interaction|relationship|view):.+$/u.test(value);
}

function keyId(key: ArchitectureGraphItemKey): string {
  return key.slice(key.indexOf(":") + 1);
}

function cloneSource(source: SourceReference): SourceReference {
  return {
    file: source.file,
    range: { start: { ...source.range.start }, end: { ...source.range.end } },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function malformed(message: string): never {
  throw new ArchitecturePolicyError("C4ML-POLICY-001", message);
}

function inapplicable(policy: ArchitecturePolicy, message: string): never {
  throw new ArchitecturePolicyError(
    "C4ML-POLICY-003",
    `Policy "${policy.id}" ${message}.`,
  );
}
