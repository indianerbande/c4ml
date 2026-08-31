import {
  createAnalysisFinding,
  type AnalysisEvidence,
  type AnalysisFinding,
  type ObservationConfirmation,
} from "./analysis.js";
import {
  createArchitectureGraphIndex,
  type ArchitectureGraphItemKey,
  type ArchitectureGraphItemKind,
} from "./architecture-graph.js";
import type {
  ArchitectureSnapshot,
  CanonicalObject,
  CanonicalValue,
} from "./architecture-snapshot.js";
import type { ArchitectureModel } from "./model.js";
import { compareText } from "./ordering.js";
import { sourceOf, type SourceReference } from "./source.js";
import type { ArchitectureView } from "./views.js";

export const architectureObservationSetVersion = 1 as const;

export type ArchitectureObservationField =
  | "classification"
  | "description"
  | "environment"
  | "kind"
  | "name"
  | "node"
  | "parent"
  | "protocol"
  | "purpose"
  | "scope"
  | "source"
  | "static-element"
  | "static-relationship"
  | "target"
  | "technology"
  | "title";

export type ArchitectureObservationClaim =
  | {
      readonly kind: "field";
      readonly field: ArchitectureObservationField;
      readonly value: CanonicalValue;
    }
  | {
      readonly kind: "presence";
      readonly value: boolean;
    };

export interface ArchitectureObservation {
  readonly id: string;
  readonly subjectKey: ArchitectureGraphItemKey;
  readonly adapterId: string;
  readonly observedAt: string;
  readonly confirmation: ObservationConfirmation;
  readonly claim: ArchitectureObservationClaim;
}

export interface ArchitectureObservationSet {
  readonly version: typeof architectureObservationSetVersion;
  readonly id: string;
  readonly name?: string;
  readonly observations: readonly ArchitectureObservation[];
}

export interface ArchitectureObservationSetInput {
  readonly id: string;
  readonly name?: string;
  readonly observations: readonly ArchitectureObservation[];
}

export type ArchitectureObservationComparisonStatus =
  | "consistent"
  | "drift"
  | "uncertain";

export interface ArchitectureObservationComparison {
  readonly observationId: string;
  readonly subjectKey: ArchitectureGraphItemKey;
  readonly status: ArchitectureObservationComparisonStatus;
  readonly claim: ArchitectureObservationClaim;
  readonly authoredValue?: CanonicalValue;
  readonly evidence: readonly AnalysisEvidence[];
}

export interface ArchitectureObservationEvaluation {
  readonly comparisons: readonly ArchitectureObservationComparison[];
  readonly findings: readonly AnalysisFinding[];
}

export interface ArchitectureObservationEvaluationInput {
  readonly model: ArchitectureModel;
  readonly views: readonly ArchitectureView[];
  readonly snapshot: ArchitectureSnapshot;
  readonly observationSet: ArchitectureObservationSet;
  readonly resourceSource?: SourceReference;
}

export type ArchitectureObservationSetParseResult =
  | {
      readonly valid: true;
      readonly observationSet: ArchitectureObservationSet;
      readonly error: undefined;
    }
  | {
      readonly valid: false;
      readonly observationSet: undefined;
      readonly error: ArchitectureObservationError;
    };

export class ArchitectureObservationError extends Error {
  constructor(
    readonly code:
      | "C4ML-OBSERVATION-001"
      | "C4ML-OBSERVATION-002",
    message: string,
  ) {
    super(message);
    this.name = "ArchitectureObservationError";
  }
}

export function parseArchitectureObservationSet(
  source: string,
): ArchitectureObservationSetParseResult {
  let candidate: unknown;
  try {
    candidate = JSON.parse(source);
  } catch {
    return invalidParse("An architecture observation resource must contain valid JSON.");
  }
  try {
    if (!isRecord(candidate) || candidate["version"] !== architectureObservationSetVersion) {
      malformed(
        `An architecture observation resource must declare version ${architectureObservationSetVersion}.`,
      );
    }
    return {
      valid: true,
      observationSet: createArchitectureObservationSet({
        id: candidate["id"] as string,
        ...(candidate["name"] === undefined
          ? {}
          : { name: candidate["name"] as string }),
        observations: candidate["observations"] as ArchitectureObservation[],
      }),
      error: undefined,
    };
  } catch (error: unknown) {
    return {
      valid: false,
      observationSet: undefined,
      error: error instanceof ArchitectureObservationError
        ? error
        : new ArchitectureObservationError(
            "C4ML-OBSERVATION-001",
            "The architecture observation resource is malformed.",
          ),
    };
  }
}

export function createArchitectureObservationSet(
  input: ArchitectureObservationSetInput,
): ArchitectureObservationSet {
  requireText(input.id, "observation-set identity");
  if (input.name !== undefined) requireText(input.name, "observation-set name");
  if (!Array.isArray(input.observations) || input.observations.length === 0) {
    malformed("An architecture observation set requires at least one observation.");
  }
  const observations = input.observations
    .map(normalizeObservation)
    .sort((left, right) => compareText(left.id, right.id));
  if (new Set(observations.map(({ id }) => id)).size !== observations.length) {
    malformed("Architecture observation identities must be unique within a set.");
  }
  return {
    version: architectureObservationSetVersion,
    id: input.id,
    ...(input.name === undefined ? {} : { name: input.name }),
    observations,
  };
}

export function evaluateArchitectureObservations(
  input: ArchitectureObservationEvaluationInput,
): ArchitectureObservationEvaluation {
  const observationSet = createArchitectureObservationSet({
    id: input.observationSet.id,
    ...(input.observationSet.name === undefined
      ? {}
      : { name: input.observationSet.name }),
    observations: input.observationSet.observations,
  });
  const graphKeys = new Set(createArchitectureGraphIndex(input.snapshot).itemKeys);
  const sources = createSourceIndex(input.model, input.views);
  const comparisons = observationSet.observations.map((observation) => {
    const authoredValue = authoredClaimValue(
      input.snapshot,
      graphKeys,
      observation,
    );
    const same = canonicalEqual(authoredValue, observation.claim.value);
    const status: ArchitectureObservationComparisonStatus =
      observation.confirmation !== "confirmed"
        ? "uncertain"
        : same
          ? "consistent"
          : "drift";
    const architectureSource = sources.get(observation.subjectKey);
    const evidence = comparisonEvidence(
      observation,
      authoredValue,
      architectureSource,
      input.resourceSource,
    );
    return {
      observationId: observation.id,
      subjectKey: observation.subjectKey,
      status,
      claim: observation.claim,
      ...(authoredValue === undefined ? {} : { authoredValue }),
      evidence,
    } satisfies ArchitectureObservationComparison;
  });
  const findings = comparisons.flatMap((comparison) =>
    comparison.status === "consistent"
      ? []
      : [observationFinding(
          comparison,
          observationSet.observations.find(
            ({ id }) => id === comparison.observationId,
          )!,
          sources.get(comparison.subjectKey),
          input.resourceSource,
        )]
  );
  return { comparisons, findings };
}

function normalizeObservation(
  observation: ArchitectureObservation,
): ArchitectureObservation {
  if (!isRecord(observation)) malformed("Every architecture observation must be an object.");
  requireText(observation.id, "observation identity");
  requireText(observation.adapterId, `adapter identity for observation "${observation.id}"`);
  if (!isArchitectureGraphItemKey(observation.subjectKey)) {
    malformed(`Observation "${observation.id}" requires a qualified architecture identity.`);
  }
  if (!isConfirmation(observation.confirmation)) {
    malformed(`Observation "${observation.id}" has an unknown confirmation state.`);
  }
  if (!isTimestamp(observation.observedAt)) {
    malformed(`Observation "${observation.id}" requires an ISO observation time with timezone.`);
  }
  return {
    id: observation.id,
    subjectKey: observation.subjectKey,
    adapterId: observation.adapterId,
    observedAt: new Date(observation.observedAt).toISOString(),
    confirmation: observation.confirmation,
    claim: normalizeClaim(observation.id, observation.claim),
  };
}

function normalizeClaim(
  observationId: string,
  claim: ArchitectureObservationClaim,
): ArchitectureObservationClaim {
  if (!isRecord(claim)) malformed(`Observation "${observationId}" requires a claim.`);
  if (claim.kind === "presence") {
    if (typeof claim.value !== "boolean") {
      malformed(`Observation "${observationId}" presence must be boolean.`);
    }
    return { kind: "presence", value: claim.value };
  }
  if (claim.kind === "field" && isObservationField(claim.field)) {
    return {
      kind: "field",
      field: claim.field,
      value: normalizeCanonicalValue(claim.value, observationId),
    };
  }
  malformed(`Observation "${observationId}" has an unknown claim kind or field.`);
}

function authoredClaimValue(
  snapshot: ArchitectureSnapshot,
  graphKeys: ReadonlySet<ArchitectureGraphItemKey>,
  observation: ArchitectureObservation,
): CanonicalValue | undefined {
  if (observation.claim.kind === "presence") {
    return graphKeys.has(observation.subjectKey);
  }
  const [kind, id] = splitKey(observation.subjectKey);
  if (!fieldsByKind[kind].has(observation.claim.field)) {
    throw new ArchitectureObservationError(
      "C4ML-OBSERVATION-002",
      `Observation "${observation.id}" cannot inspect field "${observation.claim.field}" on ${kind}.`,
    );
  }
  return snapshotRecord(snapshot, kind, id)?.[observation.claim.field];
}

const fieldsByKind: Readonly<Record<ArchitectureGraphItemKind, ReadonlySet<ArchitectureObservationField>>> = {
  "deployment-environment": new Set(["kind", "name", "description"]),
  "deployment-instance": new Set(["kind", "environment", "node", "static-element"]),
  "deployment-node": new Set(["kind", "name", "description", "technology", "environment", "parent"]),
  "deployment-relationship": new Set(["description", "technology", "source", "target", "static-relationship"]),
  element: new Set(["kind", "name", "description", "classification", "technology", "parent"]),
  group: new Set(["kind", "title", "description"]),
  "infrastructure-node": new Set(["kind", "name", "description", "technology", "environment", "node"]),
  interaction: new Set(["description", "source", "target"]),
  relationship: new Set(["description", "technology", "protocol", "source", "target"]),
  view: new Set(["kind", "title", "purpose", "scope"]),
};

function snapshotRecord(
  snapshot: ArchitectureSnapshot,
  kind: ArchitectureGraphItemKind,
  id: string,
): CanonicalObject | undefined {
  switch (kind) {
    case "element": {
      const item = snapshot.elements.find((candidate) => candidate.id === id);
      return item === undefined ? undefined : compact({
        kind: item.kind,
        name: item.name,
        description: item.description,
        classification: item.classification,
        technology: item.technology,
        parent: item.parentId,
      });
    }
    case "relationship": {
      const item = snapshot.relationships.find((candidate) => candidate.id === id);
      return item === undefined ? undefined : compact({
        description: item.description,
        technology: item.technology,
        protocol: item.protocol,
        source: item.sourceId,
        target: item.targetId,
      });
    }
    case "view": {
      const item = snapshot.views.find((candidate) => candidate.id === id);
      return item === undefined ? undefined : compact({
        kind: item.kind,
        title: item.title,
        purpose: item.purpose,
        scope: item.scope,
      });
    }
    case "group": {
      const nested = nestedItem(snapshot, id, "group");
      return nested === undefined ? undefined : compact({
        kind: "group",
        title: nested.item.title,
        description: nested.item.description,
      });
    }
    case "interaction": {
      const nested = nestedItem(snapshot, id, "interaction");
      return nested === undefined ? undefined : compact({
        description: nested.item.description,
        source: nested.item.sourceId,
        target: nested.item.targetId,
      });
    }
    default:
      return deploymentRecord(snapshot, kind, id);
  }
}

function deploymentRecord(
  snapshot: ArchitectureSnapshot,
  kind: Exclude<ArchitectureGraphItemKind, "element" | "group" | "interaction" | "relationship" | "view">,
  id: string,
): CanonicalObject | undefined {
  const deployment = snapshot.deployment;
  if (deployment === undefined) return undefined;
  switch (kind) {
    case "deployment-environment": {
      const item = deployment.environments.find((candidate) => candidate.id === id);
      return item === undefined ? undefined : compact({
        kind,
        name: item.name,
        description: item.description,
      });
    }
    case "deployment-node": {
      const item = deployment.nodes.find((candidate) => candidate.id === id);
      return item === undefined ? undefined : compact({
        kind,
        name: item.name,
        description: item.description,
        technology: item.technology,
        environment: item.environmentId,
        parent: item.parentNodeId,
      });
    }
    case "infrastructure-node": {
      const item = deployment.infrastructureNodes.find((candidate) => candidate.id === id);
      return item === undefined ? undefined : compact({
        kind,
        name: item.name,
        description: item.description,
        technology: item.technology,
        environment: item.environmentId,
        node: item.nodeId,
      });
    }
    case "deployment-instance": {
      const item = deployment.instances.find((candidate) => candidate.id === id);
      return item === undefined ? undefined : compact({
        kind: item.kind,
        environment: item.environmentId,
        node: item.nodeId,
        "static-element": item.staticElementId,
      });
    }
    case "deployment-relationship": {
      const item = deployment.relationships.find((candidate) => candidate.id === id);
      return item === undefined ? undefined : compact({
        description: item.description,
        technology: item.technology,
        source: item.sourceId,
        target: item.targetId,
        "static-relationship": item.staticRelationshipId,
      });
    }
  }
}

function nestedItem(
  snapshot: ArchitectureSnapshot,
  qualifiedId: string,
  kind: "group",
): { readonly item: ArchitectureSnapshot["views"][number]["groups"][number] } | undefined;
function nestedItem(
  snapshot: ArchitectureSnapshot,
  qualifiedId: string,
  kind: "interaction",
): { readonly item: ArchitectureSnapshot["views"][number]["interactions"][number] } | undefined;
function nestedItem(
  snapshot: ArchitectureSnapshot,
  qualifiedId: string,
  kind: "group" | "interaction",
): { readonly item: ArchitectureSnapshot["views"][number]["groups"][number] } |
  { readonly item: ArchitectureSnapshot["views"][number]["interactions"][number] } |
  undefined {
  const separator = qualifiedId.indexOf("/");
  if (separator < 1) return undefined;
  const view = snapshot.views.find(({ id }) => id === qualifiedId.slice(0, separator));
  const localId = qualifiedId.slice(separator + 1);
  if (view === undefined) return undefined;
  if (kind === "group") {
    const item = view.groups.find(({ id }) => id === localId);
    return item === undefined ? undefined : { item };
  }
  const item = view.interactions.find(({ id }) => id === localId);
  return item === undefined ? undefined : { item };
}

function comparisonEvidence(
  observation: ArchitectureObservation,
  authoredValue: CanonicalValue | undefined,
  architectureSource: SourceReference | undefined,
  resourceSource: SourceReference | undefined,
): AnalysisEvidence[] {
  const label = observation.claim.kind === "presence"
    ? "presence"
    : `field ${observation.claim.field}`;
  return [
    {
      id: `evidence:observation:${observation.id}:authored`,
      origin: "authored",
      subjectKey: observation.subjectKey,
      statement: authoredValue === undefined
        ? `The authored architecture has no value for ${label}.`
        : `The authored architecture reports ${label} as ${formatValue(authoredValue)}.`,
      ...(architectureSource === undefined ? {} : { source: architectureSource }),
    },
    {
      id: `evidence:observation:${observation.id}:observed`,
      origin: "observed",
      subjectKey: observation.subjectKey,
      statement: `Adapter "${observation.adapterId}" reported ${label} as ${formatValue(observation.claim.value)}.`,
      adapterId: observation.adapterId,
      observedAt: observation.observedAt,
      confirmation: observation.confirmation,
      ...(resourceSource === undefined ? {} : { source: resourceSource }),
    },
  ];
}

function observationFinding(
  comparison: ArchitectureObservationComparison,
  observation: ArchitectureObservation,
  architectureSource: SourceReference | undefined,
  resourceSource: SourceReference | undefined,
): AnalysisFinding {
  const sourceLocations = architectureSource === undefined
    ? resourceSource === undefined ? [] : [resourceSource]
    : [architectureSource];
  const claim = observation.claim.kind === "presence"
    ? "presence"
    : `field "${observation.claim.field}"`;
  const uncertain = comparison.status === "uncertain";
  return createAnalysisFinding({
    id: `finding:observation:${comparison.status}:${observation.id}`,
    ruleId: uncertain
      ? "c4ml.observation.uncertain"
      : "c4ml.observation.drift",
    severity: uncertain ? "information" : "warning",
    message: uncertain
      ? `Observation "${observation.id}" is ${observation.confirmation} and cannot confirm ${claim} for ${observation.subjectKey}.`
      : `Observed ${claim} for ${observation.subjectKey} differs from the authored architecture.`,
    subjectKeys: [observation.subjectKey],
    evidence: comparison.evidence,
    sourceLocations,
  });
}

function createSourceIndex(
  model: ArchitectureModel,
  views: readonly ArchitectureView[],
): ReadonlyMap<ArchitectureGraphItemKey, SourceReference> {
  const entries: [ArchitectureGraphItemKey, SourceReference][] = [
    ...model.elements.map((item): [ArchitectureGraphItemKey, SourceReference] =>
      [`element:${item.id}`, sourceOf(item)]),
    ...model.relationships.map((item): [ArchitectureGraphItemKey, SourceReference] =>
      [`relationship:${item.id}`, sourceOf(item)]),
    ...views.map((item): [ArchitectureGraphItemKey, SourceReference] =>
      [`view:${item.id}`, sourceOf(item)]),
  ];
  if (model.deployment !== undefined) {
    entries.push(
      ...model.deployment.environments.map((item): [ArchitectureGraphItemKey, SourceReference] =>
        [`deployment-environment:${item.id}`, sourceOf(item)]),
      ...model.deployment.nodes.map((item): [ArchitectureGraphItemKey, SourceReference] =>
        [`deployment-node:${item.id}`, sourceOf(item)]),
      ...model.deployment.infrastructureNodes.map((item): [ArchitectureGraphItemKey, SourceReference] =>
        [`infrastructure-node:${item.id}`, sourceOf(item)]),
      ...model.deployment.instances.map((item): [ArchitectureGraphItemKey, SourceReference] =>
        [`deployment-instance:${item.id}`, sourceOf(item)]),
      ...model.deployment.relationships.map((item): [ArchitectureGraphItemKey, SourceReference] =>
        [`deployment-relationship:${item.id}`, sourceOf(item)]),
    );
  }
  for (const view of views) {
    for (const group of view.groups ?? []) {
      entries.push([`group:${view.id}/${group.id}`, sourceOf(group)]);
    }
    if (view.kind === "dynamic") {
      for (const interaction of view.interactions) {
        entries.push([`interaction:${view.id}/${interaction.id}`, sourceOf(interaction)]);
      }
    }
  }
  return new Map(entries);
}

function normalizeCanonicalValue(value: unknown, observationId: string): CanonicalValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    return value.map((item) => normalizeCanonicalValue(item, observationId));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value).sort(compareText).map((key) => [
        key,
        normalizeCanonicalValue(value[key], observationId),
      ]),
    );
  }
  malformed(`Observation "${observationId}" contains a non-canonical value.`);
}

function compact(
  input: Readonly<Record<string, CanonicalValue | undefined>>,
): CanonicalObject {
  return Object.fromEntries(
    Object.entries(input).filter((entry): entry is [string, CanonicalValue] =>
      entry[1] !== undefined
    ),
  );
}

function canonicalEqual(
  left: CanonicalValue | undefined,
  right: CanonicalValue,
): boolean {
  return left !== undefined && JSON.stringify(left) === JSON.stringify(right);
}

function formatValue(value: CanonicalValue): string {
  return JSON.stringify(value);
}

function splitKey(
  key: ArchitectureGraphItemKey,
): [ArchitectureGraphItemKind, string] {
  const separator = key.indexOf(":");
  return [
    key.slice(0, separator) as ArchitectureGraphItemKind,
    key.slice(separator + 1),
  ];
}

function isArchitectureGraphItemKey(value: unknown): value is ArchitectureGraphItemKey {
  return typeof value === "string" &&
    /^(deployment-environment|deployment-instance|deployment-node|deployment-relationship|element|group|infrastructure-node|interaction|relationship|view):.+$/u.test(value);
}

function isObservationField(value: unknown): value is ArchitectureObservationField {
  return typeof value === "string" && observationFields.has(value as ArchitectureObservationField);
}

const observationFields: ReadonlySet<ArchitectureObservationField> = new Set([
  "classification", "description", "environment", "kind", "name", "node",
  "parent", "protocol", "purpose", "scope", "source", "static-element",
  "static-relationship", "target", "technology", "title",
]);

function isConfirmation(value: unknown): value is ObservationConfirmation {
  return value === "confirmed" || value === "disputed" || value === "unreviewed";
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && /(?:Z|[+-]\d{2}:\d{2})$/u.test(value) &&
    Number.isFinite(Date.parse(value));
}

function requireText(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    malformed(`Architecture ${label} must not be empty.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidParse(message: string): ArchitectureObservationSetParseResult {
  return {
    valid: false,
    observationSet: undefined,
    error: new ArchitectureObservationError("C4ML-OBSERVATION-001", message),
  };
}

function malformed(message: string): never {
  throw new ArchitectureObservationError("C4ML-OBSERVATION-001", message);
}
