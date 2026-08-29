# C4ML Agent Instructions

## Project status

C4ML has completed its initial Phase 0 feasibility implementation and entered
Phase 1 semantic-core work. The local Git repository and GitHub remote exist.
An Apache-2.0 TypeScript/pnpm monorepo scaffold and isolated Langium and ELK.js
technical spikes are authorized. The accepted resvg-js adapter has moved from
its historical spike into the production `packages/render-resvg` boundary.

The runtime architecture is accepted: one browser-compatible TypeScript
compiler core, a thin Node.js CLI, and a TypeScript editor that runs the compiler
in a Web Worker. Angular 22 with the pinned TypeScript 6.0.x toolchain and Monaco
Editor 0.56.0 are the accepted desktop editor stack. Angular owns UI composition
and interaction, while Monaco owns source editing and editor affordances behind
a C4ML-owned adapter. Compiler and language processing remain in the worker
behind C4ML-owned contracts. The MVP has no required Python or network service.
Parser, rendering, and remaining UI dependencies stay draft unless a recorded
spike result explicitly accepts them. ELK.js 0.12.0 is now the accepted first
automatic-layout dependency behind the C4ML-owned `LayoutAdapter`.

Electron 44.0.0 is the accepted desktop shell and Electron Forge 7.11.2 is the
replaceable packaging adapter. `apps/desktop` owns native lifecycle, menus,
file dialogs, local source persistence, and distribution artifacts; it MUST NOT
own compiler semantics. The sandboxed Angular renderer receives only a
versioned C4ML preload bridge with opaque document handles. Native Open, Save,
Save As, dirty-title state, and close protection are implemented. Local macOS
`.app`, DMG, and ZIP artifacts are automatically and visually validated; the
configured Windows Squirrel installer still requires a native Windows run.
Current macOS artifacts are ad-hoc signed development builds, not notarized
releases. The exact pnpm-managed Node.js 24.19.0 runtime is used for repository
scripts and packaging.

The desktop workbench also has an implemented original IDE-like shell with
C4ML-specific Files, Diagrams, Output, and Help activity areas, simultaneous
source, preview, and Handbook tabs, a Problems/Route panel, status bar, and a local command
palette. A versioned session contract persists only safe UI presentation state
(active activity area, bottom-panel state, zoom, and route-debug visibility),
never source, document handles, or filesystem paths. It also has an implemented
version-one local settings contract and category-based settings panel.
English/German interface language, System/Light/Dark brightness, eight quiet
workbench color families,
five C4ML-owned source syntax profiles, source-editor font family, and
source-editor font size apply reactively and are stored locally. The syntax
profiles define semantic role colors independently of Monaco; the workbench
family supplies their declaration accent. Language selection also synchronizes C4ML-owned native menus
and dialogs through the validated desktop bridge, but never translates
authored or compiler-owned content. These preferences MUST remain outside
`.c4ml`, compiler worker, diagram theme, layout, and exported SVG/PNG.
`SETTINGS.md` defines the current catalogue and extension boundaries.

The production-bound Angular editor foundation is implemented under
`apps/editor`. It uses Angular standalone components, Signals, zoneless change
detection, a lazy
Monaco source-editor adapter, and a versioned request/response contract to run
the experimental language package and shared compiler in a browser Web Worker.
It rejects stale responses, retains the last valid SVG during invalid edits,
and displays source-located diagnostics in a two-pane layout. The same worker
provides the only context-completion, help-context, syntax-highlighting, and diagnostic
source; syntax spans distinguish declarations, properties, predefined values,
identifiers, strings, numbers, operators, and comments, while Monaco presents
the exact edits, semantic-token spans, and ranges
without owning C4ML syntax or semantics. The UI also exposes diagnostics-to-source navigation,
bidirectional source/preview node navigation through compiler-owned stable
identities and source ranges, zoom, fit, scroll-pan, SVG download, wizard
preview, cancel, apply, one-step wizard undo, and selection among declared
executable views. Preview selection styling is not included in exported SVG.
The packaged English/German handbook is searchable and task-oriented; its
cursor topic comes from the versioned language-worker contract and does not
mutate source or compiler output.
Relationships and effective Routes are navigation targets too. A toggleable
preview-only routing overlay exposes effective points, endpoint Ports, the
label anchor, and corridor lanes, while an inspector reports the selected
route's policy and geometry. Ports, route labels, and corridors are separate
preview navigation targets that reveal the owning route-control source;
Arrowheads are not separate targets yet. A read-only geometry inspector also
reports the selected node's automatic candidate, final position, movement, and
effective automatic/hard/soft/relaxed placement explanations. Those
explanations, route controls, avoidance regions, and corridors navigate to their
owning source ranges. The desktop UI and diagrams use the
locally packaged
IBM Plex family: Sans for interface and diagrams, Mono only for source. SVG
exports embed the controlled Sans WOFF2 faces, and browser zoom changes actual
preview dimensions instead of applying a rasterizing CSS transform. The
compiler worker
uses ELK's API-only entry and a separate local ELK Web Worker for automatic
layout; the earlier linear adapter remains test-only compatibility code. The
editor is not yet feature-complete, but Angular and Monaco are
production dependencies rather than active UI-library experiments. It accepts
the current executable slices for all seven view types: System Landscape,
System Context, Container, Component, Code, Dynamic, and Deployment.

The workbench root component delegates document/export, preview, help, and
command-palette state to focused Angular facades. The versioned worker transport
is composed from independent Compile, Language, and Authoring contracts plus a
small shared protocol core; the compatibility barrel remains the only combined
transport boundary.

The portable compiler core also owns implemented version-one foundation
contracts for proposed source change sets, canonical architecture snapshots,
kind-qualified architecture graph traversal, and analysis findings/query
evidence. Source changes use deterministic revisions and non-overlapping text
edits; snapshots exclude source formatting and parser objects; graph keys keep
identity namespaces distinct; observed evidence requires adapter attribution.
The first syntax-aware element-property edit generator, non-mutating compiler
worker preview, one-unit Monaco application adapter, canonical worker parity,
and versioned worker/CLI analysis-report exposure are implemented. Broader
syntax-aware commands, UI gestures, semantic diffing, and executable policy
rules remain later slices.

The first portable project-source foundation is also implemented. A direct
`.c4ml` source or a directory containing exactly one root source remains an
implicit project. Explicit multifile projects use `c4ml.project.json` with a
stable project ID and an exact list of normalized local source URIs. The
language package merges executable top-level fragments, resolves cross-document
references in one flat project, and retains project-relative source locations.
The CLI and desktop shell accept files, manifests, and project directories
through the same Node.js loading adapter. The editor compiles every project
document through the browser worker, offers cross-document references in
context completion, displays the explicit source set in its project explorer
and source tabs, preserves per-document dirty state, and navigates diagnostics
and preview objects to the owning document. Project revisions and source-change
transactions are deterministic and document-addressed. Save and Save As apply
to the active document; Save All processes every dirty source through the same
validated desktop bridge. Monaco keeps an independent model, undo history,
cursor, and scroll state for every open project document.
Glossary/narrative/policy/publication resources remain unimplemented.

The minimum completeness baseline is also accepted: all four static C4 views
(System Context, Container, Component, Code), all three supporting C4 views
(System Landscape, Dynamic, Deployment), their required model elements, and the
official notation recommendations promoted to C4ML completeness requirements.

Phase 0 scaffolding and candidate-adapter code are approved. The parser-neutral
C4 semantic types, source-located diagnostics, validation, and deterministic
resolution contracts for all seven view types are implemented and automatically
validated in the portable compiler core. View-local Visual Groups are also
implemented with deterministic nesting, scope protection, and deployment-item
membership. They are an internal compiler contract, not a frozen public DSL
grammar. Production editor work is authorized within the accepted Angular,
Monaco, worker, and compiler boundaries. Do not represent any remaining spike
dependency as permanent or freeze the DSL grammar until the user has reviewed
and approved the corresponding results in `SPEC.md`.

The first Phase 1 rendering slice is also implemented. A resolved view can be
prepared as an engine-neutral layout request, routed through inspectable
automatic, guided, or fixed route contracts, converted into a renderer-neutral
scene, serialized as standalone SVG, and rasterized as PNG through the accepted
resvg-js Node adapter in `packages/render-resvg`. Automatic geometry is
provided by the accepted,
replaceable ELK.js adapter in both Node.js frontends and the browser compiler
worker. A compiler-owned placement stage now applies hard or soft relative
above/below/left/right intent, anchored multi-element edge/axis alignment,
ordered equal-gap distribution, adjustment from automatic geometry, and
individual exact pins to the candidate geometry before routing. Named gaps,
layout steps, and diagram units resolve deterministically. It preserves candidate and final geometry,
reports relaxed soft rules, and fails hard conflicts with all involved source
locations. The original Signal Garden Container View reference
export exercises Visual Groups, cardinal ports, a named corridor, label
placement, ELK compound geometry, SVG, and PNG. The separate experimental
language package can parse and lower the original `hello-context.c4ml`,
`hello-container.c4ml`, `hello-static-zoom.c4ml`, `hello-dynamic.c4ml`, and
`hello-deployment.c4ml` slices into these compiler contracts. The first
executable view-local placement slice lowers semantic placement, anchored set
alignment, ordered distribution, automatic-relative adjustment, and exact pin
controls without creating semantic Relationships. The first
executable view-local route slice lowers static Relationship controls for
automatic, guided, and fixed policies, cardinal Ports, absolute waypoints,
relative Port/element/canvas anchors, ordered locked segments, hard and soft
avoidance regions, named corridors and exclusive lanes, fixed point lists, and
label placement.
CLI and editor pass those controls into the same compiler API. There is no
publicly accepted `.c4ml` frontend or frozen grammar yet, the complete
constraint/routing scope is not implemented, and the remaining candidate
adapters are not permanently accepted. ELK.js and resvg-js are accepted
exceptions recorded in `SPEC.md` and `DEPENDENCIES.md`.

IBM Plex v6.4.2 is the accepted controlled font asset. Exact unmodified Sans
and Mono files from the tagged official release are isolated in
`packages/font-ibm-plex` with their OFL-1.1 license and recorded hashes. The
browser packages only WOFF2 assets; standalone SVG embeds the required Sans
faces; Node PNG rendering receives the matching Sans TTF files explicitly and
keeps system-font discovery disabled. Font choice is presentation behavior and
MUST NOT enter the semantic model or author-facing source grammar.

The renderer also has an implemented semantic color-theme contract. The
original `c4ml-blue` and `c4ml-garden` presets distinguish C4 element roles,
deployment roles, boundaries, relationship policies, and internal/external
state. Deep color-token overrides are supported by the internal TypeScript
contract. The future source grammar for theme declarations and
geometry-affecting style tokens remains draft.

The rendering pipeline now also keeps Relationship semantics, effective Ports,
Routes, and Arrowheads as distinct inspectable objects. Port sides use the
consistent compass vocabulary `north`, `east`, `south`, and `west`. A
renderer-neutral custom-shape contract is implemented with a normalized 100 x
100 canvas, content box, cardinal Port anchors, semantic paint roles, and a
restricted primitive set. The original built-in Person and box shapes use that
contract. Custom shapes remain presentation-only and cannot create new C4
element kinds. Their future author-facing grammar is still draft.

`DOCUMENTATION.md` and `examples/draft` contain a first author-facing syntax
preview. They are deliberately non-normative. Only the `hello-context.c4ml`,
`hello-container.c4ml`, `hello-static-zoom.c4ml`, `hello-dynamic.c4ml`, and
`hello-deployment.c4ml` slices are executable through the internal experimental
language package. `hello-context.c4ml` also exercises executable placement
constraints, one pin, relative route anchors, a locked segment, and soft
avoidance. The remaining preview is not necessarily executable. Treat all of
it as review material, not as an accepted grammar or a compatibility
commitment.

The completion and wizard source-generation APIs are experimental authoring
contracts over those same subsets. They MUST stay outside Angular components and
MUST produce ordinary source edits or complete source documents. The wizard
currently creates a new System Context or Container document. It asks first in
familiar architecture language and presents C4 terminology only as optional
translation; users MUST NOT need to recall C4 vocabulary to complete it.
Extending existing source without disturbing comments and formatting remains
unimplemented.

A thin experimental Node.js CLI now exists under `apps/cli`. It accepts the
same executable language slices, delegates all compilation to the shared
language and compiler packages, and supports check, one/all-view SVG and PNG
rendering, scale, output-directory selection, human or JSON results, version
reporting, and classified exits. Its commands are provisional, it is not a
published package, and its SVG/PNG paths use the controlled local IBM Plex
assets without system-font discovery. Keep Node.js
filesystem, process, and environment behavior confined to this app.

The desktop bridge also supports native PNG export at 1x, 2x, or 3x. The main
process validates the canonical SVG payload, uses the accepted resvg-js adapter
with controlled IBM Plex Sans TTF files and system fonts disabled, and owns the
native save dialog. The packaged platform-specific native binary and its
MPL-2.0 notice are required production resources.

## Read first

Before making project changes:

1. confirm that the working directory is the intended C4ML checkout;
2. read this file completely;
3. read `SPEC.md` completely;
4. read `TESTING.md` completely;
5. inspect the current repository state; and
6. distinguish draft decisions from accepted decisions.

Within the repository, `SPEC.md` defines product behavior and architecture.
`TESTING.md` defines the evidence required to validate it. This file defines the
working process. An explicit current user instruction can change project scope;
record material design changes in the relevant document.

## Core product invariants

Preserve these boundaries unless the user explicitly approves a specification
change:

- semantic model, views, layout, scene graph, and renderers are separate layers;
- CLI and editor execute the same compiler core and compiler contracts;
- the compiler core remains usable in both Node.js and a browser Web Worker;
- layout-only constraints are never fake architecture relationships;
- stable identity never depends on display names or declaration order;
- automatic layout and local manual control can coexist in one view;
- hard layout constraints fail visibly when they cannot be satisfied;
- layout engines and renderers are replaceable adapters;
- SVG is the canonical first render output;
- PNG is derived without changing geometry or text layout;
- identical effective input produces deterministic output;
- the normal CLI workflow does not require network access or a browser;
- the editor does not require a local or remote compiler service;
- source text remains authoritative for future graphical editing;
- all seven official C4 view types are minimum product scope;
- Code, Dynamic, and Deployment support are not deferred extensions; and
- exported release artifacts satisfy the complete C4 notation profile.

## Originality rules

C4ML must be an original system, not a clone or source-compatible dialect of an
existing tool.

Do not copy, translate, adapt, or closely paraphrase third-party:

- source code;
- grammar rules or characteristic keyword sets;
- documentation;
- examples or fixtures;
- themes, icons, or other visual assets; or
- interface layouts.

When researching prior art:

1. use public primary documentation and observable behavior;
2. record the user problem or general capability, not foreign syntax;
3. convert the observation into a tool-independent requirement;
4. design C4ML behavior from `SPEC.md`; and
5. cite the source used for the capability analysis.

Do not inspect another project's implementation for the purpose of recreating
its behavior. If a task genuinely requires implementation-level compatibility
or source review, stop and ask the user to authorize that expanded scope.

All sample architectures and golden images must be created specifically for
C4ML. Do not reuse common demonstration systems from another diagramming tool.

## Dependencies and licensing

Before adding a dependency, report:

- the capability it provides;
- why that capability belongs outside the C4ML-owned core;
- its license;
- runtime and installation impact;
- whether it works offline;
- the adapter boundary that permits replacement; and
- the test that will protect that boundary.

Record accepted dependencies and candidate-spike packages in
`DEPENDENCIES.md`. Preserve the package's own license and notice obligations;
the repository's Apache-2.0 license does not relicense third-party code.

Do not add a package merely to avoid a small, well-bounded implementation.
Conversely, do not reproduce a mature third-party algorithm when a properly
licensed, isolated dependency is the safer engineering choice.

Fonts, icons, fixtures, and themes are dependencies or project assets too. Their
origin and redistribution terms must be documented before inclusion.

## Change workflow

For analysis, review, or diagnosis:

- inspect relevant files and report findings;
- do not implement changes unless requested; and
- separate confirmed facts, proposals, and open decisions.

For an approved change:

1. identify the authoritative specification section;
2. present scope and representative impact before a broad systematic rewrite;
3. make the smallest coherent change;
4. add or update the evidence required by `TESTING.md`;
5. run proportionate non-destructive validation;
6. inspect generated visual output when rendering is affected; and
7. report implementation, automated validation, visual validation, commit, and
   push as separate statuses.

Do not silently widen a task from documentation to implementation or from a
technical spike to production architecture.

## Source and architecture guidance

When implementation is authorized:

- keep the portable compiler core free of DOM, Node.js filesystem, process, and
  network dependencies;
- place Node.js, browser, filesystem, and UI behavior behind frontend adapters;
- run editor compilation and language processing in a Web Worker;
- attach source ranges and stable semantic IDs through the scene graph and SVG;
- reject stale worker results and retain the last valid preview during invalid
  edits;
- keep the domain model independent of parser-generated AST types;
- translate parser output into explicit validated domain types;
- keep layout-adapter data out of the public semantic model;
- normalize coordinates and units at adapter boundaries;
- use an engine-neutral scene graph;
- isolate filesystem, process, and environment access at the CLI boundary;
- make randomness explicit and seeded, or eliminate it;
- provide stable diagnostic codes; and
- prefer pure transformations for stages that need deterministic tests.

Implement the complete C4 semantic hierarchy and supporting models rather than
generic boxes with labels. In particular:

- distinguish runtime Containers from Components and organizational modules;
- keep Code Elements owned by exactly one Component;
- represent Dynamic Interactions as ordered occurrences over the static model;
- represent deployment instances as references to static Software Systems and
  Containers;
- support nested Deployment Nodes and Infrastructure Nodes; and
- enforce view-specific scope and allowed-element rules.

Treat the official C4 notation recommendations as requirements in the complete
profile: title, legend, description, explicit type, Container/Component
technology, directed labelled relationships, Container protocols, glossary
coverage, and explained visual encodings.

Do not make renderer output the only representation of layout. Final geometry
must be inspectable and testable before serialization.

Do not introduce a Python service, duplicate compiler implementation, or
frontend-specific semantic behavior without an explicit approved specification
change. A future native, Wasm, or Python algorithm module must remain a
replaceable adapter behind a tested compiler-core interface.

## Testing and generated artifacts

Follow `TESTING.md`. In particular:

- assert semantic and geometric invariants before relying on snapshots;
- use only original project fixtures;
- control fonts, locale, timezone, and randomness;
- never update visual goldens blindly;
- visually inspect every intentional rendering change; and
- keep generated output out of source directories unless the repository layout
  explicitly designates committed fixtures.

The following project commands are approved and have run successfully in this
repository:

- `pnpm install` installs the pinned workspace dependency graph;
- `pnpm run build` regenerates the disposable Langium probe and builds all
  packages;
- `pnpm run check:browser` bundles the portable core, Langium services, and the
  production ELK browser adapter without writing bundle artifacts;
- `pnpm run check:editor-production` verifies the accepted Monaco version, its
  pinned Suggest integration point, and the editor artifact's license notices;
- `pnpm run check:desktop-production` verifies the pinned Electron/Forge stack,
  hardened main/preload boundary, local CSP, and required editor resources;
- `pnpm run typecheck` builds source and type-checks test code;
- `pnpm run test` runs the semantic, view-resolution, adapter, language,
  editor, and CLI tests;
- `pnpm run check` runs the complete current build, browser, type, and test
  gate;
- `pnpm run demo:render` regenerates the ignored Signal Garden SVG and PNG
  reference output under `apps/reference-export/build/reference/`;
- `pnpm run editor:build` creates the ignored production-mode Angular editor
  build under `build/editor/`;
- `pnpm run editor:start` starts the local Angular editor development server;
- `pnpm run desktop:start` builds and starts the Electron desktop application;
- `pnpm run desktop:smoke` builds and smoke-tests the Electron bridge, editor,
  compiler worker, preview, and controlled typography;
- `pnpm run desktop:package` creates the ignored unpacked current-platform
  desktop application under `build/desktop/`;
- `pnpm run desktop:make` creates the ignored current-platform development
  installers/archives under `build/desktop/make/`; and
- `pnpm run c4ml -- version` builds the CLI dependency slice and runs the
  experimental command-line frontend.

Do not add a command here until it has succeeded in this checkout.

## Documentation discipline

Keep status explicit:

- **Draft**: proposed and still open to design change.
- **Accepted**: approved as the current project direction.
- **Implemented**: present in source code.
- **Automatically validated**: relevant automated checks pass.
- **Visually validated**: rendered artifacts were inspected.

Do not describe a draft as implemented or a passing unit test as visual
validation.

When a design choice changes, update the normative document and preserve useful
historical reasoning as an explicitly superseded note rather than silently
erasing it.

## Git and repository hygiene

- Preserve unrelated user changes.
- Keep commits narrowly scoped to the requested work.
- Do not commit, push, tag, publish, or initialize remote services unless asked.
- Do not bulk-format unrelated files.
- Do not delete drafts or prior design material without explicit approval.
- Run whitespace and diff checks before handing off a completed change once the
  repository is initialized.

## Definition of done

Do not say a task is complete until the requested artifact exists, relevant
checks have passed, visual output has been inspected when applicable, and all
remaining open decisions or limitations are reported clearly.
