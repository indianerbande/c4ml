# C4ML

C4ML is an open-source model-and-diagram compiler for software architecture
based on the C4 model. It is designed around one shared architecture model,
explicit diagram views, useful automatic layout, and precise author control
when a diagram needs deliberate placement or routing.

The intended user experience has two entry points:

- a local command-line compiler for validation and SVG/PNG export; and
- an installable desktop workbench with C4ML source on the left and a hot
  graphical preview on the right.

The Electron desktop shell, its sandboxed Angular/Monaco renderer, and the
experimental CLI use the same runtime-portable TypeScript compiler core. C4ML
does not ship or host a standalone browser application. Neither entry point
requires a Python service, cloud account, or network connection for the normal
installed workflow.

## Project status

C4ML is currently in Phase 1.

Implemented and automatically validated:

- a parser-independent semantic model for Person, Software System, Container,
  Component, and Code Element;
- relationships with stable identity and directed intent;
- Deployment Environments, nested Deployment Nodes, Infrastructure Nodes,
  Software System Instances, and Container Instances;
- ordered and parallel Dynamic Interactions;
- deterministic projection of all seven C4 view types;
- deterministic, nested, view-local Visual Groups that do not alter C4 scope;
- source-aware diagnostics with stable codes;
- portable version-one contracts for revision-protected source change sets,
  canonical architecture snapshots, kind-qualified graph traversal, and
  source-located analysis findings and query evidence;
- explained upstream/downstream, path, containment, deployment, and View-
  coverage queries with reference-only temporary focus Views;
- a deterministic semantic architecture differ that matches stable identities,
  recognizes renames, separates architecture, presentation, and layout change,
  and ignores formatting or source-location noise;
- implicit one-file and explicit multifile project contracts with deterministic
  project revisions, atomic document-addressed edits, cross-file references,
  and project-aware CLI validation and rendering;
- one optional project-local version-one architecture-policy resource evaluated
  identically by the compiler worker and CLI, with source-located Output
  findings and classified `analyze --fail-on` CI exits;
- one optional project-local version-one architecture-observation resource that
  reports confirmed drift and unreviewed or disputed uncertainty without
  changing authored source;
- one optional project-local version-one glossary resource with deterministic
  term, acronym, expansion, definition, and alias lookup;
- safely bounded local Markdown narratives with versioned metadata, stable
  identities, and local links only;
- one project publication resource with ordered View captions and deterministic
  SVG/PNG render profiles validated against compiled Views;
- one project semantic-theme resource applied identically by CLI and desktop
  worker rendering through the existing deep-token resolver;
- an initial portable diagram pipeline from a resolved view through layout,
  effective routing, a renderer-neutral scene graph, and deterministic SVG;
- inspectable automatic, guided, and fixed route contracts with cardinal ports,
  absolute and relative waypoints, locked segments, hard or soft avoidance,
  named corridors and lanes, selected label segments, and label offsets;
- an engine-neutral placement stage that combines automatic layout with hard
  or soft semantic placement, anchored multi-element alignment, ordered
  equal-gap distribution, relative adjustment, and exact diagram-unit pins,
  including multi-location hard-conflict diagnostics;
- explicit Port, Route, and Arrowhead objects through the scene graph, using
  consistent `north`, `east`, `south`, and `west` attachment names;
- an original built-in Person shape and a validated custom-shape contract with
  a normalized canvas, content box, cardinal Ports, and safe vector primitives;
- a production `@c4ml/render-resvg` Node.js PNG adapter that rasterizes the
  canonical SVG behind a replaceable compiler-owned contract;
- original semantic `c4ml-blue` and `c4ml-garden` color presets with deep,
  role-specific overrides;
- experimental Web Worker-compatible `draft-1` language slices that parse and
  lower the original `hello-context.c4ml`, `hello-container.c4ml`, and
  `hello-static-zoom.c4ml` examples into the shared compiler, including the
  complete static ownership hierarchy and four static C4 views;
- executable System Landscape and Dynamic View slices in the original
  `hello-dynamic.c4ml`, including ordered and parallel interactions over static
  relationships;
- an executable Deployment View slice in the original `hello-deployment.c4ml`,
  including environments, nested Deployment Nodes, Infrastructure Nodes,
  static instances, and runtime relationships;
- an experimental thin Node.js CLI for local validation, semantic and visual
  architecture comparison with deterministic impact paths, stable geometry,
  explained SVG/PNG overlays, one/all-view rendering, scaling, human or JSON
  diagnostics, and classified exits;
- portable reviewed migration stories with deterministic transition
  provenance and a self-contained offline HTML presentation of all four
  comparison modes;
- shared built-in architecture-quality findings with explicit evidence,
  deterministic source locations, CLI reporting, and workbench navigation;
- deterministic project-selected architecture policies for dependencies,
  protocols, ownership, direction, deployment consistency, and metadata;
- an Angular 22 desktop workbench with simultaneous source/preview tabs,
  C4ML-specific Files, Source Control, Diagrams, Output, and Help activity
  areas, a Problems/Route
  panel, status bar, command palette, local compiler Web Worker, live
  diagnostics, stale-result rejection, and retention of the last valid SVG;
- a full-size preview workspace plus a detachable, projection-only Electron
  preview window with synchronized selection, zoom, Route overlay, and
  redocking, but no compiler, source, document, filesystem, save, or export
  authority;
- focused workbench facades for document/export, preview, help, and command
  state, plus independent Compile, Language, and Authoring worker contract
  modules behind one combined transport boundary;
- an Electron 44 desktop shell with a narrow typed preload bridge, native
  Open/Save/Save All/Save As, normal desktop menus and shortcuts, document
  titles and dirty-state close protection;
- explicit local Git status, staging, commit, and push controls behind that
  bridge, without exposing repository paths or Node.js to the renderer;
- an extensible local settings area with live English/German interface copy,
  synchronized C4ML-owned native controls, System/Light/Dark workbench schemes,
  eight quiet color families for sixteen light/dark combinations, and persisted
  source-editor font family and size;
- a bounded local workbench session that restores only presentation state and
  never source, document handles, or filesystem paths;
- hardened local-only application loading with renderer sandboxing, no Node.js
  integration, denied navigation/permissions, an application-owned protocol,
  ASAR integrity checks, and Electron production fuses;
- local macOS `.app`, `.dmg`, and `.zip` packaging, plus a configured Windows
  Squirrel installer maker;
- an accepted lazy Monaco 0.56.0 adapter that presents only the language
  worker's context-valid completions, applies exact source edits, displays
  inline diagnostic markers, supports keyboard undo/redo, and navigates from
  diagnostics to source;
- lexer-owned C4ML syntax highlighting that distinguishes declarations,
  properties, predefined values, references, literals, operators, and comments,
  presented through Monaco semantic tokens without a second editor grammar,
  with five C4ML-owned light/dark syntax profiles from minimal to vivid,
  high-contrast, and color-safe;
- bidirectional navigation between source declarations and source-mapped
  preview nodes, with a preview-only selection highlight that does not alter
  exported SVG;
- selectable Relationships and effective Routes, including navigation from a
  view-local route-control block and an optional debug overlay for route
  points, endpoint Ports, label anchors, and corridor lanes;
- distinct preview selection of Ports, route labels, and corridors, resolving
  each detail back to its owning route-control source;
- executable, view-local `draft-1` route controls for automatic, guided, and
  fixed policies, cardinal Ports, relative anchors, locked segments, hard and
  soft avoidance, named corridors and exclusive lanes, complete fixed point
  lists, and label placement;
- executable, view-local `draft-1` placement controls for semantic relative
  position, anchored set alignment, ordered equal-gap distribution,
  automatic-relative adjustment, and exact `du` pinning while the remaining
  layout stays automatic;
- a source-backed graphical placement editor for relative placement, nudge,
  alignment, ordered distribution, and explicit exact pinning, with candidate
  source/SVG review and one-step apply/undo;
- a source-backed graphical Route editor for cardinal Port choice and
  add/move/remove guidance operations, with candidate source/SVG review,
  explicit safe-repair and hard-conflict reporting, and one-step apply/undo;
- a visually separate, source-backed architecture editor that offers only
  context-valid element creation and relationship pairs in System Landscape,
  System Context, Container, Component, and Code views, with candidate
  source/SVG review and one-step apply/undo;
- an accepted ELK.js 0.12.0 automatic-layout adapter with separate Node.js and
  renderer Web Worker entry points behind the shared layout contract;
- locally packaged IBM Plex Sans/Mono typography, embedded standalone-SVG
  fonts, and controlled system-font-free PNG rendering;
- selectable views, plus zoom, fit, scroll-pan, local SVG export, and native
  PNG export at 1x, 2x, or 3x;
- a bounded plain-language wizard that previews and generates a new executable
  System Context or Container document with explicit connections, cancel, and
  undo;
- a local English/German handbook with searchable task-oriented chapters,
  a dedicated Help activity, and language-worker-owned help at the cursor;
- an original, executable Signal Garden Container View reference export; and
- runtime-portable compiler-core contracts shared by the CLI and desktop
  renderer.

Not implemented yet:

- the complete public `.c4ml` parser and formatter;
- the production CLI contract and packaging;
- row and column membership, ordering, minimum-gap groups, preferred
  proximity, bounded movement, constrained size, and the remaining full
  placement/routing contract;
- complete render validation for all seven view types;
- a frozen author-facing theme grammar;
- the public source grammar for custom shape definitions and assignments;
- the remaining production editor capabilities: independently selectable
  Arrowheads, accessibility validation, and dedicated semantic authoring for
  Dynamic interactions and Deployment topology;
- release identity and distribution work: a final product version and icon,
  Apple Developer ID signing/notarization, Windows code signing, and a Windows
  build-and-install validation run; and
- the complete guided modeling wizard for Components, Code, deployments,
  Visual Groups, and safe extension of existing documents.

The syntax shown in [DOCUMENTATION.md](DOCUMENTATION.md) and under
[`examples/draft`](examples/draft) remains a **design preview**. Bounded System
Context, Container, Component, Code, System Landscape, Dynamic, and Deployment
slices are executable through an internal package; the larger
`signal-garden.c4ml` combines all seven in one runnable demonstration. These
slices are not a public or frozen grammar. The first placement slice and the
current relative route- and Port-control slice are executable. Visual Groups,
themes, custom shapes, and the remaining preview syntax are not accepted by the
source compiler yet.

## C4 scope

All seven official C4 diagram types are minimum product scope:

- System Landscape;
- System Context;
- Container;
- Component;
- Code;
- Dynamic; and
- Deployment.

C4ML keeps the semantic architecture model separate from view selection,
presentation, layout, scene construction, and output rendering. A model element
retains the same stable identity when it appears in different diagrams.

Automatic layout and routing are starting points rather than irreversible
results. The current draft source can already apply intent placement, anchored
set alignment, ordered distribution, automatic-relative adjustment, exact pins,
view-local Ports, relative waypoints,
avoidance regions, locked segments, named corridors and exclusive lanes, label
placement, or a fully fixed route. None of these controls creates a fake
architecture relationship.

## Intended compiler pipeline

```text
source
  -> syntax tree
  -> validated C4 model
  -> resolved view
  -> engine-neutral layout request
  -> candidate geometry
  -> C4ML constraints and routing
  -> renderer-neutral scene graph
  -> SVG
  -> PNG
```

SVG is the canonical output. PNG is derived from the same SVG geometry and
text layout rather than from a browser screenshot.

## Development quick start

Use the pnpm version pinned in `package.json`. During installation pnpm resolves
the repository's pinned Node.js 24.19 runtime for scripts, so the packaging
toolchain is reproducible even when a newer supported Node.js is installed on
the workstation.

```shell
pnpm install
pnpm run check
pnpm run demo:render
pnpm run desktop:start
```

The check builds all current packages, verifies renderer Web Worker bundles in memory,
type-checks source and tests, and runs the semantic, view-resolution, and
adapter suites. `demo:render` creates a real SVG and PNG under
`apps/reference-export/build/reference/` from an in-code original model. It is
a contributor reference path, not the future `.c4ml` command-line interface.
`desktop:start` builds and opens the real Electron desktop workbench for all
seven bounded executable view types. Angular, Monaco, and Electron are accepted
production libraries; the language and several MVP editor capabilities remain
under development. Contributors can start the isolated renderer harness with
`pnpm run renderer:start`; it is a development tool, not a supported browser
application.

Create local distributable artifacts with:

```shell
pnpm run desktop:package
pnpm run desktop:make
```

On macOS, the packaged application appears below `build/desktop/` and `make`
adds a DMG and ZIP below `build/desktop/make/`. These development artifacts are
ad-hoc signed so they can be tested locally; they are not notarized release
downloads. The Windows Squirrel maker is configured to produce a Setup EXE on
Windows, but that platform build still requires native Windows validation.

The experimental local CLI builds its required workspace packages and runs
through the same language and compiler core:

```shell
pnpm run c4ml -- check examples/draft/hello-static-zoom.c4ml
pnpm run c4ml -- render examples/draft/hello-static-zoom.c4ml \
  --view arrangement-engine-code \
  --format svg,png \
  --output build/diagrams

pnpm run c4ml -- check examples/projects/garden-pulse-multifile
pnpm run c4ml -- diff path/to/before.c4ml path/to/after.c4ml \
  --diagnostics json
pnpm run c4ml -- diff path/to/project \
  --before-ref main \
  --after-ref working \
  --diagnostics json
pnpm run c4ml -- diff path/to/before.c4ml path/to/after.c4ml \
  --comparison overlay \
  --view garden-pulse-context \
  --format svg,png \
  --output build/comparisons
pnpm run c4ml -- render examples/projects/garden-pulse-multifile \
  --view garden-pulse-context \
  --format svg,png \
  --output build/project-diagrams
```

The desktop application can open the same directory with **File → Open
Project…** (`Cmd/Ctrl+Alt+O`). Its Files area and source tabs retain each
document separately while the local renderer worker compiles and completes
against the whole project.

Its command names and current static-language scope remain provisional.

## Documentation

- [DOCUMENTATION.md](DOCUMENTATION.md) — first user guide, proposed syntax,
  current contributor commands, and demo walkthroughs
- [PROJECTS.md](PROJECTS.md) — one-file and explicit multifile project guide
- [SPEC.md](SPEC.md) — normative product behavior and architectural boundaries
- [TESTING.md](TESTING.md) — required validation evidence
- [TODO.md](TODO.md) — ordered implementation roadmap and prerequisite gates
- [DEPENDENCIES.md](DEPENDENCIES.md) — dependency purpose, licensing, and
  replacement boundaries
- [AGENTS.md](AGENTS.md) — repository workflow and project invariants
- [`examples/draft`](examples/draft) — original syntax previews; the bounded
  seven-view slices are internally executable
- [`examples/projects/garden-pulse-multifile`](examples/projects/garden-pulse-multifile)
  — executable original project split across model, relationship, and View files

## Relationship to the wider ecosystem

C4ML is being developed within a mature and respected ecosystem. The C4 model,
PlantUML, Structurizr, Mermaid, LikeC4, D2, Graphviz, ELK, Penrose, and other
projects have each contributed valuable ideas and working approaches to
architecture communication, text-based diagrams, layout, or visual constraint
systems.

C4ML treats those projects as respected sources of general capability insight,
not as material to copy. It is an original design and does not seek syntax
compatibility with another diagram language. Its source code, grammar,
examples, interface, themes, and visual assets are developed independently.

## License

C4ML is licensed under the [Apache License 2.0](LICENSE). Third-party
dependencies retain their own licenses and are documented separately.
