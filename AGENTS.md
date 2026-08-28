# C4ML Agent Instructions

## Project status

C4ML has completed its initial Phase 0 feasibility implementation and entered
Phase 1 semantic-core work. The local Git repository and GitHub remote exist.
An Apache-2.0 TypeScript/pnpm monorepo scaffold and isolated Langium, ELK.js,
and resvg-js technical spikes are authorized.

The runtime architecture is accepted: one browser-compatible TypeScript
compiler core, a thin Node.js CLI, and a TypeScript editor that runs the compiler
in a Web Worker. Angular 22 with the pinned TypeScript 6.0.x toolchain and Monaco
Editor 0.56.0 are the accepted desktop editor stack. Angular owns UI composition
and interaction, while Monaco owns source editing and editor affordances behind
a C4ML-owned adapter. Compiler and language processing remain in the worker
behind C4ML-owned contracts. The MVP has no required Python or network service.
Parser, layout, rendering, and remaining UI dependencies stay draft unless a
recorded spike result explicitly accepts them.

The production-bound Angular editor foundation is implemented under
`apps/editor`. It uses Angular standalone components, Signals, zoneless change
detection, a lazy
Monaco source-editor adapter, and a versioned request/response contract to run
the experimental language package and shared compiler in a browser Web Worker.
It rejects stale responses, retains the last valid SVG during invalid edits,
and displays source-located diagnostics in a two-pane layout. The same worker
provides the only context-completion and diagnostic source; Monaco presents its
exact edits in an in-place popup and its ranges as markers without owning C4ML
syntax or semantics. The UI also exposes diagnostics-to-source navigation,
zoom, fit, scroll-pan, SVG download, wizard preview, cancel, apply, one-step
wizard undo, and selection among declared executable views. Its linear preview
layout is a temporary bounded adapter, not the accepted automatic-layout
solution. The editor is not yet feature-complete, but Angular and Monaco are
production dependencies rather than active UI-library experiments. It accepts
the current executable slices for all seven view types: System Landscape,
System Context, Container, Component, Code, Dynamic, and Deployment.

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
scene, serialized as standalone SVG, and rasterized as PNG through the existing
resvg candidate adapter. The original Signal Garden Container View reference
export exercises Visual Groups, cardinal ports, a named corridor, label
placement, ELK compound geometry, SVG, and PNG. The separate experimental
language package can parse and lower the original `hello-context.c4ml`,
`hello-container.c4ml`, `hello-static-zoom.c4ml`, `hello-dynamic.c4ml`, and
`hello-deployment.c4ml` slices into these compiler contracts. There is no
public `.c4ml` frontend or CLI yet, the complete constraint/routing scope is
not implemented, and the candidate adapters are not permanently accepted.

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
language package; the remaining preview is not. Treat all of it as review
material, not as an accepted grammar or a compatibility commitment.

The completion and wizard source-generation APIs are experimental authoring
contracts over those same subsets. They MUST stay outside Angular components and
MUST produce ordinary source edits or complete source documents. The wizard
currently creates a new System Context document only; extending existing source
without disturbing comments and formatting remains unimplemented.

A thin experimental Node.js CLI now exists under `apps/cli`. It accepts the
same executable language slices, delegates all compilation to the shared
language and compiler packages, and supports check, one/all-view SVG and PNG
rendering, scale, output-directory selection, human or JSON results, version
reporting, and classified exits. Its commands are provisional, it is not a
published package, and its current PNG path loads system fonts. Keep Node.js
filesystem, process, and environment behavior confined to this app.

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
- `pnpm run check:browser` bundles the portable core, Langium services, and ELK
  adapter for a browser without writing bundle artifacts;
- `pnpm run check:editor-production` verifies the accepted Monaco version, its
  pinned Suggest integration point, and the editor artifact's license notices;
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
  and
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
