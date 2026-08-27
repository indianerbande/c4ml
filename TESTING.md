# C4ML Testing Strategy

Status: Draft 0.4

Date: 2026-08-27

This document defines how C4ML behavior will be verified. It is normative for
testing once implementation begins. `SPEC.md` defines product behavior; this
document defines the evidence required to claim that behavior works.

Vitest is accepted for Phase 0 unit and adapter-contract tests. The verified
commands are:

- `pnpm run build` for generated-language and TypeScript build validation;
- `pnpm run check:browser` for in-memory browser bundle validation;
- `pnpm run typecheck` for source and test type checking;
- `pnpm run test` for the Phase 0 test suite; and
- `pnpm run check` for the complete Phase 0 gate.

All commands run locally after dependency installation and require no compiler
service or runtime network access.

## 1. Testing principles

1. Test behavior at the lowest useful layer and again at critical integration
   boundaries.
2. Treat semantic correctness, geometry correctness, and visual appearance as
   separate concerns.
3. Prefer structural assertions over large opaque snapshots.
4. Use visual golden tests for appearance, not as a substitute for invariants.
5. Make all fixtures original to this project.
6. Make test output deterministic and independent of system fonts, locale,
   timezone, and network access.
7. A golden file may change only after the semantic and visual difference has
   been reviewed.

## 2. Test layers

### 2.1 Lexer, parser, and syntax tree

Tests MUST cover:

- every grammar production;
- comments and whitespace;
- Unicode identifiers or labels according to the final grammar decision;
- string escaping and multiline text;
- incomplete input and error recovery;
- precise source ranges;
- formatter idempotence; and
- round-trip behavior where the chosen syntax-tree design supports it.

Negative tests MUST assert stable diagnostic codes and relevant source ranges,
not only message text.

### 2.2 Reference resolution and semantic model

Tests MUST cover:

- stable identifier uniqueness;
- valid and invalid cross-references;
- C4 containment rules;
- Code Element kinds and Component ownership;
- Deployment Environment, nested Deployment Node, and Infrastructure Node
  validation;
- Software System Instance and Container Instance resolution;
- ordered and parallel Dynamic Interaction validation;
- relationship source and target validation;
- relationship direction, labels, and required Container protocols;
- view scope and inclusion rules;
- tag and metadata handling;
- separation of visual groups from semantic containment; and
- identical semantic models from formatting-only source changes.

### 2.3 View resolution

Tests MUST prove that:

- System Landscape, System Context, Container, Component, Code, Dynamic, and
  Deployment Views select only their permitted primary and supporting elements;
- excluded elements do not leave invalid visible relationships;
- the same element retains identity across multiple views;
- view-local styles and layout do not mutate the semantic model; and
- title, scope, type, and legend data are available to the renderer.

Every view type MUST also be tested for its default intended audience, purpose
metadata, and official C4 usage guidance. Author overrides MUST not change view
scope or semantic validity.

The suite MUST contain negative tests for every illegal cross-level inclusion,
including Containers in a System Context View, Components in a Container View,
Code Elements outside their Component, and deployment instances that do not
resolve to the static model.

The completeness profile MUST verify titles, legends, descriptions, explicit
element types, Container and Component technologies, acronym/glossary coverage,
unidirectional relationship labels, Container protocols, and explanations for
all non-default visual encodings.

Dynamic View tests MUST prove ordering, parallel groups, static-relationship
resolution, collaboration rendering, sequence rendering, and semantic
equivalence between both presentations.

Deployment View tests MUST cover multiple environments, nested Deployment
Nodes, Infrastructure Nodes, repeated instances, environment-specific details,
and preservation of static-model identity.

### 2.4 Layout adapter contract

Every automatic-layout adapter MUST pass the same contract suite. The suite MUST
verify:

- all requested nodes receive finite geometry;
- containment boundaries enclose their children;
- ports returned by the adapter are normalized;
- adapter-specific IDs and units do not leak into later stages;
- seeded or configured runs are deterministic; and
- unsupported capabilities fail explicitly rather than being ignored.

Tests MUST NOT assume ELK-specific output in the engine-neutral contract.

### 2.5 Constraint solver

Tests MUST cover each constraint independently and in combinations:

- left/right/above/below;
- row and column membership;
- horizontal and vertical alignment;
- explicit ordering;
- minimum gaps;
- soft proximity;
- pinning and bounded movement;
- fixed or constrained size;
- nested boundaries; and
- constraints spanning groups where permitted.

For hard conflicts, tests MUST assert:

- compilation fails;
- the diagnostic identifies the conflicting constraints;
- all relevant source locations are attached; and
- no misleading output artifact is reported as successful.

For soft conflicts, tests MUST assert the documented relaxation and diagnostic
behavior.

### 2.6 Ports and routing

Routing tests MUST cover:

- automatic, direct, and orthogonal modes;
- all cardinal source and target ports;
- self-relationships if supported;
- parallel relationships;
- opposing relationships;
- routes across containment boundaries;
- automatic obstacle avoidance;
- complete and partial waypoint lists;
- relative and absolute waypoints;
- intentional shared segments or junctions if supported;
- label placement on every segment orientation; and
- failure when a hard manual route is geometrically impossible.

Structural assertions MUST detect paths through element interiors, invalid port
attachment, duplicate zero-length segments, unintended diagonal segments in an
orthogonal route, and labels outside the canvas.

### 2.7 Scene graph and SVG

Scene-graph tests MUST verify stable ordering, IDs, bounds, text content,
arrowheads, metadata, and style precedence.

SVG tests MUST include:

- XML parsing and schema-relevant structural checks;
- normalized snapshots with volatile metadata removed;
- no external network references;
- unique IDs and valid internal references;
- correct `viewBox` and bounds;
- selectable text where required;
- title and description metadata; and
- equivalent semantic content to the scene graph.

Raw SVG byte snapshots SHOULD be avoided until canonical serialization is
defined. Normalized SVG MUST be byte-stable for identical inputs.

### 2.8 PNG rendering

PNG tests MUST verify:

- requested dimensions and scale;
- transparent and configured backgrounds;
- no clipping;
- consistency with SVG bounds;
- use of controlled fonts; and
- visually equivalent content to the SVG source.

On the reference platform, deterministic PNGs SHOULD be byte-stable. Across
supported platforms, image comparison MAY allow a small documented
anti-aliasing tolerance, but no geometry, text-wrapping, color, or missing-content
difference.

### 2.9 CLI end-to-end tests

CLI tests MUST cover:

- validation success and failure;
- rendering one view and all views;
- SVG-only, PNG-only, and combined output;
- output path behavior;
- machine-readable diagnostics;
- exit-code classes;
- missing input and unwritable output errors;
- invocation from a directory outside the project;
- paths containing spaces and non-ASCII characters; and
- fully offline operation.

### 2.10 Editor and compiler parity

Editor tests MUST cover:

- compilation in a browser Web Worker rather than on the UI thread;
- debounced or scheduled hot compilation after source changes;
- cancellation or rejection of results from superseded compilations;
- retention of the last valid preview while current source contains errors;
- current diagnostics replacing obsolete diagnostics;
- source-to-preview and preview-to-source navigation;
- stable mapping from source ranges through semantic and scene IDs to SVG;
- zoom, pan, and fit-to-view behavior without geometry mutation;
- SVG and PNG export; and
- operation without a compiler service or network connection.

A shared contract suite MUST run the same effective source through the Node.js
CLI path and browser-worker path. It MUST compare diagnostics, semantic model,
resolved views, final geometry, scene graph, and canonical SVG. Frontend-specific
serialization MUST NOT change compiler behavior.

Race tests MUST deliberately deliver worker responses out of order and prove
that the editor never displays an obsolete result.

## 3. Original fixture catalog

All fixtures below must be designed specifically for C4ML. They must not be
adapted from another tool's banking, shopping, or sample architecture.

The initial catalog SHOULD include:

1. `signal-garden-context`: one person, one focal system, and two external
   systems with labeled relationships;
2. `signal-garden-containers`: nested application, worker, queue, and data store;
3. `workshop-components`: components with mixed relationship directions inside
   one container;
4. `four-port-compass`: relationships using every cardinal port combination;
5. `crossing-pressure`: a small graph whose naive layout produces crossings;
6. `constraint-grid`: rows, columns, ordering, alignment, and gaps;
7. `pinned-island`: one fixed element surrounded by automatically placed
   elements;
8. `guided-routes`: automatic orthogonal routes with partial and complete
   waypoints;
9. `nested-boundaries`: relationships within and across multiple boundaries;
10. `conflicting-constraints`: minimal hard conflicts with exact diagnostics;
11. `long-labels-unicode`: wrapping, punctuation, German text, and non-ASCII
    labels; and
12. `incremental-stability`: a before/after pair with one local model change;
13. `code-workbench`: one Component containing several original code-element
    kinds and relationships;
14. `signal-garden-dynamic`: one ordered scenario with sequential and parallel
    interactions rendered in collaboration and sequence styles;
15. `signal-garden-deployment`: development and production environments with
    nested Deployment Nodes, infrastructure, and repeated instances; and
16. `complete-notation-profile`: title, legend, descriptions, technologies,
    protocol labels, glossary entries, and explained visual encodings.

Fixture names, domain stories, labels, and visual designs are original project
assets and fall under the project's eventual license.

## 4. Determinism and stability tests

Every golden fixture MUST be compiled repeatedly in fresh processes. The tests
MUST compare:

- normalized semantic model;
- resolved view graph;
- final geometry;
- normalized scene graph;
- canonical SVG; and
- PNG result according to the platform policy.

Metamorphic tests MUST confirm that these source changes do not affect geometry:

- whitespace changes;
- comment changes;
- line-ending changes;
- declaration movement that is semantically unordered; and
- unrelated additions outside the rendered view.

The incremental-stability fixture MUST measure movement of unaffected elements.
The acceptance threshold must be fixed after the first layout spike provides
evidence; it must not be chosen retroactively to make a failing implementation
pass.

## 5. Property-based and fuzz testing

After a stable semantic model exists, generated tests SHOULD create bounded,
valid C4 graphs and assert:

- no non-finite coordinates;
- no element has negative dimensions;
- all children are within their boundaries;
- all route endpoints attach to their declared elements or ports;
- orthogonal routes contain only axis-aligned segments;
- rendering terminates; and
- parsing rendered or serialized internal forms does not corrupt identity.

Invalid-input fuzzing SHOULD target lexer/parser recovery and diagnostic
robustness. It MUST enforce time and memory limits.

## 6. Performance tests

Performance targets will be set after the first spike. Benchmarks MUST separate:

- parsing and validation;
- view resolution;
- automatic layout;
- constraint solving;
- routing;
- SVG serialization; and
- PNG rasterization.

The benchmark set must include small interactive diagrams and a deliberately
dense upper-bound fixture. Performance work MUST NOT trade away determinism or
diagnostics without an explicit specification change.

## 7. Dependency and license checks

Continuous validation MUST eventually include:

- lockfile integrity;
- dependency license inventory;
- prohibited or unknown license detection;
- dependency vulnerability reporting;
- verification that render tests make no network request; and
- a check that bundled fonts and visual assets have documented redistribution
  rights.

No copied third-party example may be introduced as a test fixture.

## 8. Golden-update procedure

A contributor updating an SVG or PNG golden MUST:

1. state the specification or bug that requires the change;
2. inspect the semantic and geometry diff;
3. render and visually inspect every affected image;
4. confirm that unrelated fixtures did not move;
5. include old/new evidence in the review when practical; and
6. update the golden only after the change is understood.

Bulk acceptance of new goldens without inspection is prohibited.

## 9. Definition of done for implementation changes

An implementation change is complete only when:

- behavior matches `SPEC.md`;
- relevant unit and integration tests exist;
- negative behavior has diagnostics tests;
- deterministic output has been checked;
- affected goldens have been inspected;
- required commands pass;
- no undocumented dependency or asset was added; and
- the final report distinguishes implementation, automated validation, visual
  validation, commit, and push status.

## 10. MVP test gate

Before the MVP may be called complete:

- every acceptance criterion in `SPEC.md` has a named test or reviewed manual
  verification;
- all original catalog fixtures render as SVG and PNG;
- all seven official C4 view types pass their scope and element-contract tests;
- the complete C4 notation profile passes without downgraded diagnostics;
- Code, Dynamic, and Deployment fixtures pass semantic and visual review;
- recommendation and intended-audience metadata is present for every view type;
- all hard-conflict fixtures fail with expected diagnostics;
- canonical SVG is deterministic across repeated clean runs;
- CLI and browser-worker compiler contract results are equivalent;
- editor hot compilation, stale-result rejection, last-valid preview, and
  source/preview navigation pass their integration tests;
- the supported-platform PNG policy passes;
- no network access is required;
- dependency and asset licenses are documented; and
- a human has visually reviewed the complete fixture gallery at its intended
  display sizes.
