import {
  compareArchitectureSnapshots,
  type ArchitectureDifference,
} from "./architecture-diff.js";
import {
  deriveArchitectureImpacts,
  type ArchitectureImpactReport,
} from "./architecture-impact.js";
import { architectureSnapshotVersion, type ArchitectureSnapshot } from "./architecture-snapshot.js";
import type { SceneComparisonMode } from "./scene.js";

export const architectureMigrationVersion = 1 as const;

export interface ArchitectureMigrationProvenance {
  readonly kind: "authored" | "git";
  readonly reference: string;
}

export interface ArchitectureMigrationReview {
  readonly status: "reviewed";
  readonly note?: string;
}

export interface ArchitectureMigrationState {
  readonly id: string;
  readonly title: string;
  readonly snapshot: ArchitectureSnapshot;
  readonly provenance: ArchitectureMigrationProvenance;
  readonly review: ArchitectureMigrationReview;
}

export interface ArchitectureMigrationTransition {
  readonly id: string;
  readonly sequence: number;
  readonly fromStateId: string;
  readonly toStateId: string;
  readonly difference: ArchitectureDifference;
  readonly impacts: ArchitectureImpactReport;
  readonly changeProvenance: readonly ArchitectureMigrationChangeProvenance[];
}

export interface ArchitectureMigrationChangeProvenance {
  readonly changeId: string;
  readonly fromStateId: string;
  readonly toStateId: string;
}

export interface ArchitectureMigrationStory {
  readonly version: typeof architectureMigrationVersion;
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly states: readonly ArchitectureMigrationState[];
  readonly transitions: readonly ArchitectureMigrationTransition[];
}

export interface ArchitectureMigrationStoryInput {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly states: readonly ArchitectureMigrationState[];
}

export interface ArchitectureMigrationTransitionVisuals {
  readonly transitionId: string;
  readonly views: readonly ArchitectureMigrationViewVisuals[];
}

export interface ArchitectureMigrationViewVisuals {
  readonly viewId: string;
  readonly viewTitle: string;
  readonly svgByMode: Readonly<Record<SceneComparisonMode, string>>;
}

export class ArchitectureMigrationError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "ArchitectureMigrationError";
  }
}

export function createArchitectureMigrationStory(
  input: ArchitectureMigrationStoryInput,
): ArchitectureMigrationStory {
  requireText(input.id, "story ID");
  requireText(input.title, "story title");
  if (input.states.length < 2) {
    throw new ArchitectureMigrationError(
      "C4ML-MIGRATION-001",
      "A migration story requires at least two reviewed architecture states.",
    );
  }
  const stateIds = new Set<string>();
  for (const state of input.states) {
    requireText(state.id, "state ID");
    requireText(state.title, `title for state ${state.id}`);
    requireText(state.provenance.reference, `provenance for state ${state.id}`);
    if (stateIds.has(state.id)) {
      throw new ArchitectureMigrationError(
        "C4ML-MIGRATION-002",
        `Duplicate migration state identity "${state.id}".`,
      );
    }
    if (
      state.snapshot.version !== architectureSnapshotVersion ||
      state.review.status !== "reviewed"
    ) {
      throw new ArchitectureMigrationError(
        "C4ML-MIGRATION-003",
        `Migration state "${state.id}" is not a supported reviewed architecture snapshot.`,
      );
    }
    stateIds.add(state.id);
  }
  const states = JSON.parse(JSON.stringify(input.states)) as ArchitectureMigrationState[];
  const transitions = states.slice(1).map((to, index) => {
    const from = states[index]!;
    const difference = compareArchitectureSnapshots(from.snapshot, to.snapshot);
    return {
      id: `transition:${from.id}:${to.id}`,
      sequence: index + 1,
      fromStateId: from.id,
      toStateId: to.id,
      difference,
      impacts: deriveArchitectureImpacts(from.snapshot, to.snapshot, difference),
      changeProvenance: difference.changes.map(({ id }) => ({
        changeId: id,
        fromStateId: from.id,
        toStateId: to.id,
      })),
    };
  });
  return {
    version: architectureMigrationVersion,
    id: input.id,
    title: input.title,
    description: input.description,
    states,
    transitions,
  };
}

export function serializeArchitectureMigrationStory(
  story: ArchitectureMigrationStory,
): string {
  return JSON.stringify(story);
}

export function renderArchitectureMigrationHtml(
  story: ArchitectureMigrationStory,
  visuals: readonly ArchitectureMigrationTransitionVisuals[],
): string {
  const visualByTransition = new Map(visuals.map((visual) => [visual.transitionId, visual]));
  if (visualByTransition.size !== visuals.length) {
    throw new ArchitectureMigrationError(
      "C4ML-MIGRATION-004",
      "Migration presentation visuals contain duplicate transition identities.",
    );
  }
  const transitionIds = new Set(story.transitions.map(({ id }) => id));
  if (visuals.some(({ transitionId }) => !transitionIds.has(transitionId))) {
    throw new ArchitectureMigrationError(
      "C4ML-MIGRATION-004",
      "Migration presentation visuals contain an unknown transition identity.",
    );
  }
  for (const transition of story.transitions) {
    const visual = visualByTransition.get(transition.id);
    if (visual === undefined || visual.views.length === 0) {
      throw new ArchitectureMigrationError(
        "C4ML-MIGRATION-005",
        `Migration transition "${transition.id}" has no visual comparison.`,
      );
    }
    const viewIds = new Set(visual.views.map(({ viewId }) => viewId));
    if (viewIds.size !== visual.views.length) {
      throw new ArchitectureMigrationError(
        "C4ML-MIGRATION-005",
        `Migration transition "${transition.id}" has duplicate View visuals.`,
      );
    }
    for (const view of visual.views) {
      for (const mode of comparisonModes) {
        validateComparisonSvg(view.svgByMode[mode], mode, transition.id, view.viewId);
      }
    }
  }
  const stateById = new Map(story.states.map((state) => [state.id, state]));
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${escapeHtml(story.title)}</title>`,
    `<style>${presentationStyles}</style>`,
    "</head>",
    "<body>",
    `<header><p class="eyebrow">C4ML architecture migration</p><h1>${escapeHtml(story.title)}</h1><p>${escapeHtml(story.description)}</p></header>`,
    `<nav aria-label="Migration steps"><ol>${story.transitions.map((transition) => {
      const to = stateById.get(transition.toStateId)!;
      return `<li><a href="#migration-step-${transition.sequence}">${transition.sequence}. ${escapeHtml(to.title)}</a></li>`;
    }).join("")}</ol></nav>`,
    "<main>",
    ...story.transitions.map((transition) => {
      const from = stateById.get(transition.fromStateId)!;
      const to = stateById.get(transition.toStateId)!;
      const visual = visualByTransition.get(transition.id)!;
      return `<article id="migration-step-${transition.sequence}">
  <p class="eyebrow">Step ${transition.sequence}</p>
  <h2>${escapeHtml(from.title)} → ${escapeHtml(to.title)}</h2>
  <p class="provenance">${escapeHtml(from.provenance.reference)} → ${escapeHtml(to.provenance.reference)}</p>
  <p>${transition.difference.summary.architecture} architecture, ${transition.difference.summary.presentation} presentation, ${transition.difference.summary.layout} layout change(s)</p>
  <ul class="changes">${transition.difference.changes.map((change) =>
    `<li><strong>${escapeHtml(change.kind)}</strong> ${escapeHtml(change.subjectKey)} <span>${escapeHtml(change.category)}</span></li>`
  ).join("") || "<li>No semantic change.</li>"}</ul>
  ${visual.views.map(renderViewVisuals).join("\n")}
</article>`;
    }),
    "</main>",
    `<footer>Generated locally by C4ML. No network resources are required.</footer>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

const comparisonModes = ["before", "after", "overlay", "change-only"] as const;

function renderViewVisuals(view: ArchitectureMigrationViewVisuals): string {
  return `<section class="view"><h3>${escapeHtml(view.viewTitle)}</h3>${comparisonModes.map((mode) =>
    `<details${mode === "overlay" ? " open" : ""}><summary>${escapeHtml(humanize(mode))}</summary><div class="diagram">${stripXmlDeclaration(view.svgByMode[mode])}</div></details>`
  ).join("")}</section>`;
}

function validateComparisonSvg(
  svg: string,
  mode: SceneComparisonMode,
  transitionId: string,
  viewId: string,
): void {
  if (
    !svg.includes("<svg") ||
    !svg.includes("</svg>") ||
    !svg.includes(`data-c4ml-comparison-mode="${mode}"`) ||
    !svg.includes("C4ML") ||
    /<(?:script|foreignObject|iframe|object|embed|link|base|audio|video)\b/iu.test(svg) ||
    /<\?(?:xml-stylesheet)\b/iu.test(svg) ||
    /\son[a-z]+\s*=/iu.test(svg) ||
    /@import\b/iu.test(svg) ||
    containsExternalResourceReference(svg)
  ) {
    throw new ArchitectureMigrationError(
      "C4ML-MIGRATION-006",
      `Transition "${transitionId}" view "${viewId}" has an unsafe or incompatible ${mode} SVG.`,
    );
  }
}

function containsExternalResourceReference(svg: string): boolean {
  const attributeReferences = svg.matchAll(
    /\s(?:href|src|xlink:href)\s*=\s*(["'])(.*?)\1/giu,
  );
  for (const match of attributeReferences) {
    const value = match[2]!.trim();
    if (!value.startsWith("#") && !value.startsWith("data:")) return true;
  }
  const cssReferences = svg.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/giu);
  for (const match of cssReferences) {
    const value = match[2]!.trim();
    if (!value.startsWith("#") && !value.startsWith("data:")) return true;
  }
  return false;
}

function stripXmlDeclaration(svg: string): string {
  return svg.replace(/^\s*<\?xml[^>]*>\s*/u, "");
}

function requireText(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new ArchitectureMigrationError(
      "C4ML-MIGRATION-007",
      `Migration ${label} must not be empty.`,
    );
  }
}

function humanize(value: string): string {
  return value.split("-").map((part) => part[0]!.toUpperCase() + part.slice(1)).join(" ");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const presentationStyles = `
:root { color-scheme: light; font-family: "IBM Plex Sans", system-ui, sans-serif; background: #eef3f7; color: #17324a; }
body { margin: 0; }
header, nav, main, footer { max-width: 1180px; margin: 0 auto; padding: 24px; }
header { padding-top: 48px; }
h1, h2, h3 { margin: 0 0 12px; }
.eyebrow { color: #287d9b; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
nav ol { display: flex; flex-wrap: wrap; gap: 12px; padding: 0; list-style: none; }
nav a { display: block; padding: 10px 14px; border: 1px solid #b9c8d4; border-radius: 8px; background: #fff; color: inherit; text-decoration: none; }
article { margin-bottom: 32px; padding: 28px; border: 1px solid #c8d4de; border-radius: 14px; background: #fff; }
.provenance { color: #5e7182; font-family: "IBM Plex Mono", ui-monospace, monospace; }
.changes { padding-left: 22px; }
.changes span { color: #647889; }
details { margin-top: 12px; border: 1px solid #d2dce4; border-radius: 8px; overflow: hidden; }
summary { cursor: pointer; padding: 12px 16px; font-weight: 700; background: #f6f8fa; }
.diagram { overflow: auto; padding: 12px; background: #fff; }
.diagram svg { display: block; max-width: 100%; height: auto; }
footer { color: #647889; font-size: 13px; padding-bottom: 48px; }
`;
