import {
  architectureGraphItemKey,
  architectureGraphViewItemKey,
  createArchitectureGraphIndex,
  type ArchitectureGraphItemKey,
} from "./architecture-graph.js";
import type { ArchitectureSnapshot } from "./architecture-snapshot.js";
import {
  createAnalysisFinding,
  type AnalysisFinding,
} from "./analysis.js";
import type { Diagnostic } from "./diagnostics.js";
import type {
  ArchitectureModel,
  DeploymentModel,
} from "./model.js";
import { compareText } from "./ordering.js";
import { sourceOf, type SourceBacked, type SourceReference } from "./source.js";
import type { ArchitectureView } from "./views.js";

export const builtInArchitectureQualityVersion = 1 as const;

export interface BuiltInArchitectureQualityInput {
  readonly model: ArchitectureModel;
  readonly views: readonly ArchitectureView[];
  readonly snapshot: ArchitectureSnapshot;
  readonly diagnostics?: readonly Diagnostic[];
}

/**
 * Evaluates evidence-backed, portable quality rules over a validated model.
 * Blocking parser and semantic errors remain diagnostics because no canonical
 * snapshot exists for them.
 */
export function evaluateBuiltInArchitectureQuality(
  input: BuiltInArchitectureQualityInput,
): AnalysisFinding[] {
  const sources = createSubjectSourceIndex(input.model, input.views);
  return [
    ...diagnosticFindings(input.diagnostics ?? [], sources),
    ...viewCoverageFindings(input, sources),
    ...emptyViewFindings(input, sources),
  ].sort((left, right) => compareText(left.id, right.id));
}

function diagnosticFindings(
  diagnostics: readonly Diagnostic[],
  sources: ReadonlyMap<string, readonly SubjectSource[]>,
): AnalysisFinding[] {
  const findings: AnalysisFinding[] = [];
  for (const diagnostic of diagnostics) {
    if (diagnostic.severity === "error") continue;
    const subjects = sources.get(sourceIdentity(diagnostic.source)) ?? [];
    // A warning may be promoted only when its declaration is unambiguous.
    // Synthetic in-memory ranges can be shared by several programmatic items.
    if (subjects.length !== 1) continue;
    const subjectKeys = subjects.map(({ key }) => key);
    const primary = subjectKeys[0]!;
    findings.push(createAnalysisFinding({
      id: `finding:validation:${diagnostic.code}:${primary}`,
      ruleId: `c4ml.validation.${diagnostic.code.toLowerCase()}`,
      severity: diagnostic.severity,
      message: diagnostic.correction === undefined
        ? diagnostic.message
        : `${diagnostic.message} ${diagnostic.correction}`,
      subjectKeys,
      evidence: [{
        id: `evidence:validation:${diagnostic.code}:${primary}`,
        origin: "derived",
        subjectKey: primary,
        statement: `The shared C4ML validator reported ${diagnostic.code} for this declaration.`,
        source: diagnostic.source,
      }],
      sourceLocations: [
        diagnostic.source,
        ...diagnostic.related.map(({ source }) => source),
      ],
    }));
  }
  return findings;
}

function viewCoverageFindings(
  input: BuiltInArchitectureQualityInput,
  sources: ReadonlyMap<string, readonly SubjectSource[]>,
): AnalysisFinding[] {
  const graph = createArchitectureGraphIndex(input.snapshot);
  const keys = [
    ...input.snapshot.elements.map(({ id }) => architectureGraphItemKey("element", id)),
    ...input.snapshot.relationships.map(({ id }) => architectureGraphItemKey("relationship", id)),
    ...(input.snapshot.deployment === undefined
      ? []
      : [
          ...input.snapshot.deployment.nodes.map(({ id }) =>
            architectureGraphItemKey("deployment-node", id)),
          ...input.snapshot.deployment.infrastructureNodes.map(({ id }) =>
            architectureGraphItemKey("infrastructure-node", id)),
          ...input.snapshot.deployment.instances.map(({ id }) =>
            architectureGraphItemKey("deployment-instance", id)),
          ...input.snapshot.deployment.relationships.map(({ id }) =>
            architectureGraphItemKey("deployment-relationship", id)),
        ]),
  ].sort(compareText);
  const sourceBySubject = invertSubjectSourceIndex(sources);
  return keys.flatMap((key) => {
    if (graph.viewsContaining(key).length > 0) return [];
    const source = sourceBySubject.get(key);
    if (source === undefined) return [];
    const noun = humanSubjectKind(key);
    return [createAnalysisFinding({
      id: `finding:quality:view-coverage:${key}`,
      ruleId: "c4ml.quality.view-coverage",
      severity: "information",
      message: `${noun} ${quotedSubjectId(key)} is not visible in any resolved diagram. Add it to a useful View or keep it intentionally model-only.`,
      subjectKeys: [key],
      evidence: [
        {
          id: `evidence:quality:view-coverage:declared:${key}`,
          origin: "authored",
          subjectKey: key,
          statement: `This ${noun.toLowerCase()} is declared in the architecture model.`,
          source,
        },
        {
          id: `evidence:quality:view-coverage:absent:${key}`,
          origin: "derived",
          subjectKey: key,
          statement: "No resolved View contains this stable architecture identity.",
        },
      ],
      sourceLocations: [source],
    })];
  });
}

function emptyViewFindings(
  input: BuiltInArchitectureQualityInput,
  sources: ReadonlyMap<string, readonly SubjectSource[]>,
): AnalysisFinding[] {
  const sourceBySubject = invertSubjectSourceIndex(sources);
  return input.snapshot.views.flatMap((view) => {
    if (
      view.elementIds.length > 0 ||
      view.relationshipIds.length > 0 ||
      view.interactions.length > 0 ||
      view.deploymentNodeIds.length > 0 ||
      view.infrastructureNodeIds.length > 0 ||
      view.deploymentInstanceIds.length > 0 ||
      view.deploymentRelationshipIds.length > 0
    ) {
      return [];
    }
    const key = architectureGraphItemKey("view", view.id);
    const source = sourceBySubject.get(key);
    if (source === undefined) return [];
    return [createAnalysisFinding({
      id: `finding:quality:empty-view:${key}`,
      ruleId: "c4ml.quality.empty-view",
      severity: "warning",
      message: `View "${view.title}" contains no architecture elements or connections. Check its scope and selection before sharing it.`,
      subjectKeys: [key],
      evidence: [{
        id: `evidence:quality:empty-view:${key}`,
        origin: "derived",
        subjectKey: key,
        statement: "The resolved View has no static, dynamic, or deployment content.",
        source,
      }],
      sourceLocations: [source],
    })];
  });
}

interface SubjectSource {
  readonly key: ArchitectureGraphItemKey;
  readonly source: SourceReference;
}

function createSubjectSourceIndex(
  model: ArchitectureModel,
  views: readonly ArchitectureView[],
): ReadonlyMap<string, readonly SubjectSource[]> {
  const entries: SubjectSource[] = [
    ...model.elements.map((item) => subject("element", item.id, item)),
    ...model.relationships.map((item) => subject("relationship", item.id, item)),
    ...deploymentSubjects(model.deployment),
    ...views.flatMap((view) => [
      subject("view", view.id, view),
      ...(view.kind === "dynamic"
        ? view.interactions.map((item) => ({
            key: architectureGraphViewItemKey("interaction", view.id, item.id),
            source: sourceOf(item),
          }))
        : []),
      ...(view.groups ?? []).map((item) => ({
        key: architectureGraphViewItemKey("group", view.id, item.id),
        source: sourceOf(item),
      })),
    ]),
  ];
  const bySource = new Map<string, SubjectSource[]>();
  for (const entry of entries.sort((left, right) => compareText(left.key, right.key))) {
    const identity = sourceIdentity(entry.source);
    const current = bySource.get(identity) ?? [];
    current.push(entry);
    bySource.set(identity, current);
  }
  return bySource;
}

function deploymentSubjects(deployment: DeploymentModel | undefined): SubjectSource[] {
  if (deployment === undefined) return [];
  return [
    ...deployment.environments.map((item) => subject("deployment-environment", item.id, item)),
    ...deployment.nodes.map((item) => subject("deployment-node", item.id, item)),
    ...deployment.infrastructureNodes.map((item) => subject("infrastructure-node", item.id, item)),
    ...deployment.instances.map((item) => subject("deployment-instance", item.id, item)),
    ...deployment.relationships.map((item) => subject("deployment-relationship", item.id, item)),
  ];
}

function subject(
  kind: Parameters<typeof architectureGraphItemKey>[0],
  id: string,
  value: SourceBacked,
): SubjectSource {
  return { key: architectureGraphItemKey(kind, id), source: sourceOf(value) };
}

function invertSubjectSourceIndex(
  sources: ReadonlyMap<string, readonly SubjectSource[]>,
): ReadonlyMap<ArchitectureGraphItemKey, SourceReference> {
  return new Map(
    [...sources.values()].flat().map(({ key, source }) => [key, source]),
  );
}

function sourceIdentity(source: SourceReference): string {
  return [
    source.file,
    source.range.start.offset,
    source.range.end.offset,
  ].join(":");
}

function humanSubjectKind(key: ArchitectureGraphItemKey): string {
  const kind = key.slice(0, key.indexOf(":"));
  return kind.split("-").map((part) =>
    part[0]!.toUpperCase() + part.slice(1)
  ).join(" ");
}

function quotedSubjectId(key: ArchitectureGraphItemKey): string {
  return `"${key.slice(key.indexOf(":") + 1)}"`;
}
