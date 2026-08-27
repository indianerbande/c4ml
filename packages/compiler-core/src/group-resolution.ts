import { createDiagnostic, type Diagnostic } from "./diagnostics.js";
import { compareText } from "./ordering.js";
import { sourceOf } from "./source.js";
import type {
  ArchitectureView,
  ResolvedView,
  ResolvedVisualGroup,
  ResolvedVisualGroupMember,
  ViewLegend,
  VisualGroup,
  VisualGroupMemberReference,
} from "./views.js";

interface DirectMembership {
  readonly group: VisualGroup;
  readonly member: VisualGroupMemberReference;
}

export function resolveVisualGroups(
  view: ArchitectureView,
  resolvedView: ResolvedView,
  diagnostics: Diagnostic[],
): ResolvedView {
  const authoredGroups = stableGroups(view.groups ?? []);
  if (authoredGroups.length === 0) {
    return resolvedView;
  }

  const groupById = indexGroups(authoredGroups, diagnostics);
  const directMembership = new Map<string, DirectMembership>();
  const resolvedGroups: ResolvedVisualGroup[] = [];

  for (const group of authoredGroups) {
    if (groupById.get(group.id) !== group) {
      continue;
    }
    validateGroupMetadata(group, diagnostics);
    const members: ResolvedVisualGroupMember[] = [];
    const memberKeys = new Set<string>();

    for (const member of stableReferences(group.members)) {
      const key = `${member.kind}:${member.id}`;
      if (memberKeys.has(key)) {
        addGroupDiagnostic(
          diagnostics,
          member,
          "C4ML-GROUP-006",
          `Visual group ${displayId(group.id)} repeats member ${displayId(member.id)}.`,
          "List each direct group member once.",
        );
        continue;
      }
      memberKeys.add(key);

      const firstMembership = directMembership.get(key);
      if (firstMembership !== undefined) {
        diagnostics.push(
          createDiagnostic({
            code: "C4ML-GROUP-006",
            severity: "error",
            message: `Visual member ${displayId(member.id)} belongs directly to more than one group.`,
            source: sourceOf(member),
            related: [
              {
                message: `The first direct membership is in group ${displayId(firstMembership.group.id)}.`,
                source: sourceOf(firstMembership.member),
              },
            ],
            correction:
              "Use one direct parent group; nest that group when a larger boundary is needed.",
          }),
        );
      } else {
        directMembership.set(key, { group, member });
      }

      const resolvedMember = resolveMember(
        member,
        groupById,
        resolvedView,
        diagnostics,
      );
      if (resolvedMember !== undefined) {
        members.push(resolvedMember);
      }
    }

    resolvedGroups.push({
      id: group.id,
      title: group.title,
      members: stableResolvedMembers(members),
      layout: {
        keepTogether: group.layout?.keepTogether ?? true,
        padding: group.layout?.padding ?? 24,
      },
      ...(group.description === undefined
        ? {}
        : { description: group.description }),
      ...(group.presentation === undefined
        ? {}
        : { presentation: group.presentation }),
      ...(group.source === undefined ? {} : { source: group.source }),
    });
  }

  validateGroupCycles(groupById, diagnostics);

  return {
    ...resolvedView,
    groups: resolvedGroups,
    legend: legendWithVisualGroup(resolvedView.legend),
  };
}

function indexGroups(
  groups: readonly VisualGroup[],
  diagnostics: Diagnostic[],
): Map<string, VisualGroup> {
  const groupById = new Map<string, VisualGroup>();
  for (const group of groups) {
    if (isBlank(group.id)) {
      addGroupDiagnostic(
        diagnostics,
        group,
        "C4ML-GROUP-001",
        "A visual group has an empty stable identifier.",
        "Assign a non-empty identifier unique within the view.",
      );
      continue;
    }
    const first = groupById.get(group.id);
    if (first === undefined) {
      groupById.set(group.id, group);
      continue;
    }
    diagnostics.push(
      createDiagnostic({
        code: "C4ML-GROUP-002",
        severity: "error",
        message: `Duplicate visual group identifier ${displayId(group.id)}.`,
        source: sourceOf(group),
        related: [
          {
            message: "The first visual group is declared here.",
            source: sourceOf(first),
          },
        ],
        correction: "Assign an identifier unique within the view.",
      }),
    );
  }
  return groupById;
}

function validateGroupMetadata(
  group: VisualGroup,
  diagnostics: Diagnostic[],
): void {
  if (isBlank(group.title)) {
    addGroupDiagnostic(
      diagnostics,
      group,
      "C4ML-GROUP-003",
      `Visual group ${displayId(group.id)} has no title.`,
      "Provide a human-readable group title.",
    );
  }
  if (group.members.length === 0) {
    addGroupDiagnostic(
      diagnostics,
      group,
      "C4ML-GROUP-004",
      `Visual group ${displayId(group.id)} has no members.`,
      "Add at least one visible diagram item or nested group.",
    );
  }
  const padding = group.layout?.padding;
  if (padding !== undefined && (!Number.isFinite(padding) || padding < 0)) {
    addGroupDiagnostic(
      diagnostics,
      group,
      "C4ML-GROUP-008",
      `Visual group ${displayId(group.id)} has invalid padding ${padding}.`,
      "Use a finite, non-negative padding value.",
    );
  }
}

function resolveMember(
  member: VisualGroupMemberReference,
  groupById: ReadonlyMap<string, VisualGroup>,
  view: ResolvedView,
  diagnostics: Diagnostic[],
): ResolvedVisualGroupMember | undefined {
  if (member.kind === "group") {
    if (groupById.has(member.id)) {
      return { kind: "group", groupId: member.id };
    }
    return unknownMember(member, diagnostics);
  }
  if (member.kind === "element") {
    const element = view.elements.find(({ id }) => id === member.id);
    return element === undefined
      ? unknownMember(member, diagnostics)
      : { kind: "element", element };
  }
  if (member.kind === "deployment-node") {
    const node = view.deploymentNodes.find(({ id }) => id === member.id);
    return node === undefined
      ? unknownMember(member, diagnostics)
      : { kind: "deployment-node", node };
  }
  if (member.kind === "infrastructure-node") {
    const infrastructureNode = view.infrastructureNodes.find(
      ({ id }) => id === member.id,
    );
    return infrastructureNode === undefined
      ? unknownMember(member, diagnostics)
      : { kind: "infrastructure-node", infrastructureNode };
  }

  const instance = view.deploymentInstances.find(({ id }) => id === member.id);
  return instance === undefined
    ? unknownMember(member, diagnostics)
    : { kind: "deployment-instance", instance };
}

function unknownMember(
  member: VisualGroupMemberReference,
  diagnostics: Diagnostic[],
): undefined {
  addGroupDiagnostic(
    diagnostics,
    member,
    "C4ML-GROUP-005",
    `Visual group references non-visible ${member.kind} ${displayId(member.id)}.`,
    "Reference an item already permitted and visible in this view.",
  );
  return undefined;
}

function validateGroupCycles(
  groupById: ReadonlyMap<string, VisualGroup>,
  diagnostics: Diagnostic[],
): void {
  const complete = new Set<string>();
  const active = new Set<string>();

  const visit = (group: VisualGroup): void => {
    if (complete.has(group.id)) {
      return;
    }
    active.add(group.id);
    for (const member of group.members) {
      if (member.kind !== "group") {
        continue;
      }
      const child = groupById.get(member.id);
      if (child === undefined) {
        continue;
      }
      if (active.has(child.id)) {
        diagnostics.push(
          createDiagnostic({
            code: "C4ML-GROUP-007",
            severity: "error",
            message: `Visual group nesting cycle includes ${displayId(child.id)}.`,
            source: sourceOf(member),
            related: [
              {
                message: "The referenced group is declared here.",
                source: sourceOf(child),
              },
            ],
            correction: "Remove the cyclic nested-group reference.",
          }),
        );
        continue;
      }
      visit(child);
    }
    active.delete(group.id);
    complete.add(group.id);
  };

  for (const group of stableGroups([...groupById.values()])) {
    visit(group);
  }
}

function legendWithVisualGroup(legend: ViewLegend): ViewLegend {
  if (
    legend.mode !== "generated" ||
    legend.entries?.some(({ label }) => label === "Visual Group") === true
  ) {
    return legend;
  }
  return {
    ...legend,
    entries: [
      ...(legend.entries ?? []),
      {
        label: "Visual Group",
        description:
          "View-local grouping that does not change C4 ownership or scope.",
      },
    ],
  };
}

function stableGroups(groups: readonly VisualGroup[]): VisualGroup[] {
  return [...groups].sort((left, right) => compareText(left.id, right.id));
}

function stableReferences(
  references: readonly VisualGroupMemberReference[],
): VisualGroupMemberReference[] {
  return [...references].sort(
    (left, right) =>
      compareText(left.kind, right.kind) || compareText(left.id, right.id),
  );
}

function stableResolvedMembers(
  members: readonly ResolvedVisualGroupMember[],
): ResolvedVisualGroupMember[] {
  return [...members].sort((left, right) => {
    return (
      compareText(left.kind, right.kind) ||
      compareText(resolvedMemberId(left), resolvedMemberId(right))
    );
  });
}

function resolvedMemberId(member: ResolvedVisualGroupMember): string {
  if (member.kind === "element") {
    return member.element.id;
  }
  if (member.kind === "deployment-node") {
    return member.node.id;
  }
  if (member.kind === "infrastructure-node") {
    return member.infrastructureNode.id;
  }
  if (member.kind === "deployment-instance") {
    return member.instance.id;
  }
  return member.groupId;
}

function addGroupDiagnostic(
  diagnostics: Diagnostic[],
  source: VisualGroup | VisualGroupMemberReference,
  code: string,
  message: string,
  correction: string,
): void {
  diagnostics.push(
    createDiagnostic({
      code,
      severity: "error",
      message,
      source: sourceOf(source),
      correction,
    }),
  );
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

function displayId(id: string): string {
  return id.length === 0 ? "<empty>" : `"${id}"`;
}
