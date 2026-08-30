import {
  architectureGraphItemKey,
  type ArchitectureGraphItemKey,
} from "./architecture-graph.js";
import {
  architectureSnapshotVersion,
  type ArchitectureSnapshot,
  type CanonicalObject,
  type CanonicalValue,
  type SnapshotDeploymentEnvironment,
  type SnapshotDeploymentInstance,
  type SnapshotDeploymentNode,
  type SnapshotDeploymentRelationship,
  type SnapshotElement,
  type SnapshotInfrastructureNode,
  type SnapshotRelationship,
  type SnapshotView,
} from "./architecture-snapshot.js";
import { compareText } from "./ordering.js";

export const architectureDifferenceVersion = 1 as const;

export type ArchitectureChangeCategory =
  | "deployment"
  | "layout"
  | "model"
  | "presentation"
  | "relationship"
  | "view";

export type ArchitectureChangeKind =
  | "added"
  | "modified"
  | "removed"
  | "renamed";

export interface ArchitecturePropertyChange {
  readonly path: string;
  readonly before?: CanonicalValue;
  readonly after?: CanonicalValue;
}

export interface ArchitectureChange {
  readonly id: string;
  readonly category: ArchitectureChangeCategory;
  readonly kind: ArchitectureChangeKind;
  readonly subjectKey: ArchitectureGraphItemKey;
  readonly properties: readonly ArchitecturePropertyChange[];
}

export interface ArchitectureDifferenceSummary {
  readonly total: number;
  readonly architecture: number;
  readonly presentation: number;
  readonly layout: number;
}

export interface ArchitectureDifference {
  readonly version: typeof architectureDifferenceVersion;
  readonly beforeSnapshotVersion: typeof architectureSnapshotVersion;
  readonly afterSnapshotVersion: typeof architectureSnapshotVersion;
  readonly changes: readonly ArchitectureChange[];
  readonly summary: ArchitectureDifferenceSummary;
}

export class ArchitectureDifferenceError extends Error {
  constructor(
    readonly code:
      | "C4ML-DIFF-001"
      | "C4ML-DIFF-002"
      | "C4ML-DIFF-003",
    message: string,
  ) {
    super(message);
    this.name = "ArchitectureDifferenceError";
  }
}

export function compareArchitectureSnapshots(
  before: ArchitectureSnapshot,
  after: ArchitectureSnapshot,
): ArchitectureDifference {
  if (
    before.version !== architectureSnapshotVersion ||
    after.version !== architectureSnapshotVersion
  ) {
    throw new ArchitectureDifferenceError(
      "C4ML-DIFF-001",
      "Architecture comparison requires supported canonical snapshot versions.",
    );
  }

  const changes: ArchitectureChange[] = [];
  compareCollection(
    changes,
    "model",
    before.elements,
    after.elements,
    (item) => architectureGraphItemKey("element", item.id),
    "name",
  );
  compareCollection(
    changes,
    "relationship",
    before.relationships,
    after.relationships,
    (item) => architectureGraphItemKey("relationship", item.id),
  );
  compareDeployment(changes, before, after);
  compareViews(changes, before.views, after.views);

  changes.sort(compareChange);
  const presentation = changes.filter(
    ({ category }) => category === "presentation",
  ).length;
  const layout = changes.filter(({ category }) => category === "layout").length;
  return {
    version: architectureDifferenceVersion,
    beforeSnapshotVersion: before.version,
    afterSnapshotVersion: after.version,
    changes,
    summary: {
      total: changes.length,
      architecture: changes.length - presentation - layout,
      presentation,
      layout,
    },
  };
}

export function serializeArchitectureDifference(
  difference: ArchitectureDifference,
): string {
  return JSON.stringify(difference);
}

export function isArchitectureDifference(
  value: unknown,
): value is ArchitectureDifference {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ArchitectureDifference>;
  if (
    candidate.version === architectureDifferenceVersion &&
    candidate.beforeSnapshotVersion === architectureSnapshotVersion &&
    candidate.afterSnapshotVersion === architectureSnapshotVersion &&
    Array.isArray(candidate.changes) &&
    candidate.changes.every(isArchitectureChange) &&
    isDifferenceSummary(candidate.summary)
  ) {
    const changes = candidate.changes;
    const ids = changes.map(({ id }) => id);
    const presentation = changes.filter(
      ({ category }) => category === "presentation",
    ).length;
    const layout = changes.filter(
      ({ category }) => category === "layout",
    ).length;
    return (
      new Set(ids).size === ids.length &&
      changes.every(
        (change, index) =>
          index === 0 || compareChange(changes[index - 1]!, change) <= 0,
      ) &&
      candidate.summary.total === changes.length &&
      candidate.summary.presentation === presentation &&
      candidate.summary.layout === layout &&
      candidate.summary.architecture === changes.length - presentation - layout
    );
  }
  return false;
}

function compareDeployment(
  changes: ArchitectureChange[],
  before: ArchitectureSnapshot,
  after: ArchitectureSnapshot,
): void {
  compareCollection(
    changes,
    "deployment",
    before.deployment?.environments ?? [],
    after.deployment?.environments ?? [],
    (item) => architectureGraphItemKey("deployment-environment", item.id),
    "name",
  );
  compareCollection(
    changes,
    "deployment",
    before.deployment?.nodes ?? [],
    after.deployment?.nodes ?? [],
    (item) => architectureGraphItemKey("deployment-node", item.id),
    "name",
  );
  compareCollection(
    changes,
    "deployment",
    before.deployment?.infrastructureNodes ?? [],
    after.deployment?.infrastructureNodes ?? [],
    (item) => architectureGraphItemKey("infrastructure-node", item.id),
    "name",
  );
  compareCollection(
    changes,
    "deployment",
    before.deployment?.instances ?? [],
    after.deployment?.instances ?? [],
    (item) => architectureGraphItemKey("deployment-instance", item.id),
  );
  compareCollection(
    changes,
    "deployment",
    before.deployment?.relationships ?? [],
    after.deployment?.relationships ?? [],
    (item) => architectureGraphItemKey("deployment-relationship", item.id),
  );
}

function compareViews(
  changes: ArchitectureChange[],
  beforeViews: readonly SnapshotView[],
  afterViews: readonly SnapshotView[],
): void {
  const before = uniqueById(beforeViews, "view");
  const after = uniqueById(afterViews, "view");
  for (const id of stableUnion(before.keys(), after.keys())) {
    const beforeView = before.get(id);
    const afterView = after.get(id);
    const subjectKey = architectureGraphItemKey("view", id);
    if (beforeView === undefined) {
      changes.push(
        createWholeChange("view", "added", subjectKey, undefined, afterView),
      );
      continue;
    }
    if (afterView === undefined) {
      changes.push(
        createWholeChange("view", "removed", subjectKey, beforeView, undefined),
      );
      continue;
    }
    appendModifiedChanges(
      changes,
      "view",
      subjectKey,
      viewArchitecture(beforeView),
      viewArchitecture(afterView),
      "title",
    );
    appendModifiedChanges(
      changes,
      "presentation",
      subjectKey,
      viewPresentation(beforeView),
      viewPresentation(afterView),
    );
    appendModifiedChanges(
      changes,
      "layout",
      subjectKey,
      viewLayout(beforeView),
      viewLayout(afterView),
    );
  }
}

type SnapshotEntity =
  | SnapshotDeploymentEnvironment
  | SnapshotDeploymentInstance
  | SnapshotDeploymentNode
  | SnapshotDeploymentRelationship
  | SnapshotElement
  | SnapshotInfrastructureNode
  | SnapshotRelationship;

function compareCollection<T extends SnapshotEntity>(
  changes: ArchitectureChange[],
  category: ArchitectureChangeCategory,
  beforeItems: readonly T[],
  afterItems: readonly T[],
  subjectKey: (item: T) => ArchitectureGraphItemKey,
  renameProperty?: string,
): void {
  const before = uniqueById(beforeItems, category);
  const after = uniqueById(afterItems, category);
  for (const id of stableUnion(before.keys(), after.keys())) {
    const beforeItem = before.get(id);
    const afterItem = after.get(id);
    const key = subjectKey(afterItem ?? beforeItem!);
    if (beforeItem === undefined) {
      changes.push(
        createWholeChange(category, "added", key, undefined, afterItem),
      );
    } else if (afterItem === undefined) {
      changes.push(
        createWholeChange(category, "removed", key, beforeItem, undefined),
      );
    } else {
      appendModifiedChanges(
        changes,
        category,
        key,
        beforeItem,
        afterItem,
        renameProperty,
      );
    }
  }
}

function appendModifiedChanges(
  changes: ArchitectureChange[],
  category: ArchitectureChangeCategory,
  subjectKey: ArchitectureGraphItemKey,
  before: unknown,
  after: unknown,
  renameProperty?: string,
): void {
  const properties = compareProperties(before, after);
  const renamed =
    renameProperty === undefined
      ? []
      : properties.filter(({ path }) => path === renameProperty);
  const modified = properties.filter(({ path }) => path !== renameProperty);
  if (renamed.length > 0) {
    changes.push(createChange(category, "renamed", subjectKey, renamed));
  }
  if (modified.length > 0) {
    changes.push(createChange(category, "modified", subjectKey, modified));
  }
}

function createWholeChange(
  category: ArchitectureChangeCategory,
  kind: "added" | "removed",
  subjectKey: ArchitectureGraphItemKey,
  before: unknown,
  after: unknown,
): ArchitectureChange {
  return createChange(category, kind, subjectKey, [
    {
      path: "$",
      ...(before === undefined ? {} : { before: toCanonicalValue(before) }),
      ...(after === undefined ? {} : { after: toCanonicalValue(after) }),
    },
  ]);
}

function createChange(
  category: ArchitectureChangeCategory,
  kind: ArchitectureChangeKind,
  subjectKey: ArchitectureGraphItemKey,
  properties: readonly ArchitecturePropertyChange[],
): ArchitectureChange {
  return {
    id: `${category}:${kind}:${subjectKey}`,
    category,
    kind,
    subjectKey,
    properties,
  };
}

function compareProperties(
  before: unknown,
  after: unknown,
): ArchitecturePropertyChange[] {
  const left = toCanonicalValue(before);
  const right = toCanonicalValue(after);
  if (canonicalEqual(left, right)) return [];
  if (isCanonicalObject(left) && isCanonicalObject(right)) {
    const result: ArchitecturePropertyChange[] = [];
    for (const key of stableUnion(Object.keys(left), Object.keys(right))) {
      const beforeValue = left[key];
      const afterValue = right[key];
      if (beforeValue === undefined && afterValue === undefined) continue;
      if (!canonicalEqual(beforeValue, afterValue)) {
        result.push({
          path: key,
          ...(beforeValue === undefined ? {} : { before: beforeValue }),
          ...(afterValue === undefined ? {} : { after: afterValue }),
        });
      }
    }
    return result;
  }
  return [{ path: "$", before: left, after: right }];
}

function viewArchitecture(view: SnapshotView): CanonicalObject {
  return toCanonicalValue({
    id: view.id,
    kind: view.kind,
    title: view.title,
    purpose: view.purpose,
    ...(view.scopeIdentity === undefined
      ? { scope: view.scope }
      : { scopeIdentity: view.scopeIdentity }),
    audience: view.audience,
    recommendation: view.recommendation,
    legend: view.legend,
    elementIds: view.elementIds,
    relationshipIds: view.relationshipIds,
    interactions: view.interactions,
    groups: view.groups.map(
      ({ presentation: _presentation, layout: _layout, ...group }) => group,
    ),
    ...(view.dynamicDisplay === undefined
      ? {}
      : { dynamicDisplay: view.dynamicDisplay }),
    ...(view.deploymentEnvironmentId === undefined
      ? {}
      : { deploymentEnvironmentId: view.deploymentEnvironmentId }),
    deploymentNodeIds: view.deploymentNodeIds,
    infrastructureNodeIds: view.infrastructureNodeIds,
    deploymentInstanceIds: view.deploymentInstanceIds,
    deploymentRelationshipIds: view.deploymentRelationshipIds,
  }) as CanonicalObject;
}

function viewPresentation(view: SnapshotView): CanonicalObject {
  return toCanonicalValue({
    ...(view.presentation === undefined ? {} : { view: view.presentation }),
    groups: view.groups
      .filter(({ presentation }) => presentation !== undefined)
      .map(({ id, presentation }) => ({ id, presentation })),
  }) as CanonicalObject;
}

function viewLayout(view: SnapshotView): CanonicalObject {
  return toCanonicalValue({
    ...(view.layout === undefined ? {} : { view: view.layout }),
    groups: view.groups.map(({ id, layout }) => ({ id, layout })),
  }) as CanonicalObject;
}

function uniqueById<T extends { readonly id: string }>(
  values: readonly T[],
  label: string,
): Map<string, T> {
  const result = new Map<string, T>();
  for (const value of values) {
    if (result.has(value.id)) {
      throw new ArchitectureDifferenceError(
        "C4ML-DIFF-002",
        `Architecture comparison requires unique ${label} identity "${value.id}".`,
      );
    }
    result.set(value.id, value);
  }
  return result;
}

function toCanonicalValue(value: unknown): CanonicalValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(toCanonicalValue);
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value) as object | null;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new ArchitectureDifferenceError(
        "C4ML-DIFF-003",
        "Architecture comparison values must be plain data objects.",
      );
    }
    const result: Record<string, CanonicalValue> = {};
    for (const key of Object.keys(value).sort(compareText)) {
      const item = (value as Record<string, unknown>)[key];
      if (item !== undefined) result[key] = toCanonicalValue(item);
    }
    return result;
  }
  throw new ArchitectureDifferenceError(
    "C4ML-DIFF-003",
    "Architecture comparison values must be finite JSON-compatible data.",
  );
}

function canonicalEqual(
  left: CanonicalValue | undefined,
  right: CanonicalValue | undefined,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isCanonicalObject(value: CanonicalValue): value is CanonicalObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableUnion(
  left: Iterable<string>,
  right: Iterable<string>,
): string[] {
  return [...new Set([...left, ...right])].sort(compareText);
}

function compareChange(
  left: ArchitectureChange,
  right: ArchitectureChange,
): number {
  return (
    categoryOrder(left.category) - categoryOrder(right.category) ||
    compareText(left.subjectKey, right.subjectKey) ||
    kindOrder(left.kind) - kindOrder(right.kind)
  );
}

function categoryOrder(category: ArchitectureChangeCategory): number {
  return [
    "model",
    "relationship",
    "deployment",
    "view",
    "presentation",
    "layout",
  ].indexOf(category);
}

function kindOrder(kind: ArchitectureChangeKind): number {
  return ["added", "removed", "renamed", "modified"].indexOf(kind);
}

function isArchitectureChange(value: unknown): value is ArchitectureChange {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ArchitectureChange>;
  return (
    typeof candidate.id === "string" &&
    isChangeCategory(candidate.category) &&
    isChangeKind(candidate.kind) &&
    typeof candidate.subjectKey === "string" &&
    candidate.subjectKey.includes(":") &&
    Array.isArray(candidate.properties) &&
    candidate.properties.length > 0 &&
    candidate.properties.every(isPropertyChange) &&
    candidate.id ===
      `${candidate.category}:${candidate.kind}:${candidate.subjectKey}`
  );
}

function isPropertyChange(value: unknown): value is ArchitecturePropertyChange {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ArchitecturePropertyChange>;
  const hasBefore = Object.hasOwn(value, "before");
  const hasAfter = Object.hasOwn(value, "after");
  return (
    typeof candidate.path === "string" &&
    candidate.path.length > 0 &&
    (hasBefore || hasAfter) &&
    (!hasBefore || isCanonicalValue(candidate.before)) &&
    (!hasAfter || isCanonicalValue(candidate.after))
  );
}

function isChangeCategory(value: unknown): value is ArchitectureChangeCategory {
  return (
    value === "deployment" ||
    value === "layout" ||
    value === "model" ||
    value === "presentation" ||
    value === "relationship" ||
    value === "view"
  );
}

function isChangeKind(value: unknown): value is ArchitectureChangeKind {
  return (
    value === "added" ||
    value === "modified" ||
    value === "removed" ||
    value === "renamed"
  );
}

function isDifferenceSummary(
  value: unknown,
): value is ArchitectureDifferenceSummary {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ArchitectureDifferenceSummary>;
  return (
    isNonNegativeInteger(candidate.total) &&
    isNonNegativeInteger(candidate.architecture) &&
    isNonNegativeInteger(candidate.presentation) &&
    isNonNegativeInteger(candidate.layout)
  );
}

function isCanonicalValue(value: unknown): value is CanonicalValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isCanonicalValue);
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Object.values(value).every(isCanonicalValue);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}
