# C4ML

C4ML is an open-source model-and-diagram compiler for software architecture
based on the C4 model. It is designed around one shared architecture model,
explicit diagram views, useful automatic layout, and precise author control
when a diagram needs deliberate placement or routing.

The intended user experience has two entry points:

- a local command-line compiler for validation and SVG/PNG export; and
- an installable desktop workbench with C4ML source on the left and a hot
  graphical preview on the right.

The Electron desktop shell, Angular/Monaco editor, and experimental CLI use the
same browser-compatible TypeScript compiler core. The CLI will not launch a
browser, and neither frontend requires a Python service, cloud account, or
network connection for the normal installed workflow.

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
- an initial portable diagram pipeline from a resolved view through layout,
  effective routing, a renderer-neutral scene graph, and deterministic SVG;
- inspectable automatic, guided, and fixed route contracts with cardinal ports,
  absolute waypoints, named corridors and lanes, selected label segments, and
  label offsets;
- explicit Port, Route, and Arrowhead objects through the scene graph, using
  consistent `north`, `east`, `south`, and `west` attachment names;
- an original built-in Person shape and a validated custom-shape contract with
  a normalized canvas, content box, cardinal Ports, and safe vector primitives;
- a Node.js PNG adapter that rasterizes the canonical SVG;
- original semantic `c4ml-blue` and `c4ml-garden` color presets with deep,
  role-specific overrides;
- experimental browser-compatible `draft-1` language slices that parse and
  lower the original `hello-context.c4ml`, `hello-container.c4ml`, and
  `hello-static-zoom.c4ml` examples into the shared compiler, including the
  complete static ownership hierarchy and four static C4 views;
- executable System Landscape and Dynamic View slices in the original
  `hello-dynamic.c4ml`, including ordered and parallel interactions over static
  relationships;
- an executable Deployment View slice in the original `hello-deployment.c4ml`,
  including environments, nested Deployment Nodes, Infrastructure Nodes,
  static instances, and runtime relationships;
- an experimental thin Node.js CLI for local validation, one/all-view SVG and
  PNG rendering, scaling, human or JSON diagnostics, and classified exits;
- an Angular 22 desktop editor foundation with a two-pane source/preview layout,
  local compiler Web Worker, live diagnostics, stale-result rejection, and
  retention of the last valid SVG;
- an Electron 44 desktop shell with a narrow typed preload bridge, native
  Open/Save/Save As, normal desktop menus and shortcuts, document titles and
  dirty-state close protection;
- an extensible local settings area with live System/Light/Dark workbench
  schemes and persisted source-editor font family and size;
- hardened local-only application loading with renderer sandboxing, no Node.js
  integration, denied navigation/permissions, an application-owned protocol,
  ASAR integrity checks, and Electron production fuses;
- local macOS `.app`, `.dmg`, and `.zip` packaging, plus a configured Windows
  Squirrel installer maker;
- an accepted lazy Monaco 0.56.0 adapter that presents only the language
  worker's context-valid completions, applies exact source edits, displays
  inline diagnostic markers, supports keyboard undo/redo, and navigates from
  diagnostics to source;
- lexer-owned C4ML syntax highlighting presented through Monaco semantic
  tokens without a second editor grammar;
- bidirectional navigation between source declarations and source-mapped
  preview nodes, with a preview-only selection highlight that does not alter
  exported SVG;
- selectable Relationships and effective Routes, including navigation from a
  view-local route-control block and an optional debug overlay for route
  points, endpoint Ports, label anchors, and corridor lanes;
- executable, view-local `draft-1` route controls for automatic, guided, and
  fixed policies, cardinal Ports, absolute waypoints, named corridors and
  exclusive lanes, complete fixed point lists, and label placement;
- an accepted ELK.js 0.12.0 automatic-layout adapter with separate Node.js and
  browser-worker entry points behind the shared layout contract;
- locally packaged IBM Plex Sans/Mono typography, embedded standalone-SVG
  fonts, and controlled system-font-free PNG rendering;
- selectable views, plus zoom, fit, scroll-pan, and local SVG export;
- a bounded three-step wizard that previews and generates a new executable
  System Context document with cancel and undo;
- an original, executable Signal Garden Container View reference export; and
- browser-compatible compiler-core contracts.

Not implemented yet:

- the complete public `.c4ml` parser and formatter;
- the production CLI contract and packaging;
- relative placement constraints, pinning, avoidance regions, locked route
  segments, and the remaining full routing contract;
- complete render validation for all seven view types;
- a frozen author-facing theme grammar;
- the public source grammar for custom shape definitions and assignments;
- the remaining production editor capabilities: independently selectable
  Ports, labels, and corridors, PNG export, accessibility validation, and
  graphical source editing;
- release identity and distribution work: a final product version and icon,
  Apple Developer ID signing/notarization, Windows code signing, and a Windows
  build-and-install validation run; and
- the complete guided modeling wizard for Containers, Components, Code,
  deployments, Visual Groups, and safe extension of existing documents.

The syntax shown in [DOCUMENTATION.md](DOCUMENTATION.md) and under
[`examples/draft`](examples/draft) remains a **design preview**. Bounded System
Context, Container, Component, Code, System Landscape, Dynamic, and Deployment
slices are executable through an internal package; they are not a public or
frozen grammar. The first absolute route- and Port-control slice is executable.
Visual Groups, relative routing, avoidance regions, locked segments, themes,
custom shapes, and the remaining preview syntax are not accepted by the source
compiler yet.

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

Automatic routing is a starting point rather than an irreversible result. The
current draft source can already select view-local Ports, absolute waypoints,
named corridors and exclusive lanes, label placement, or a fully fixed route.
Relative waypoints, avoidance regions, and locked segments remain planned. None
of these controls creates a fake architecture relationship.

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

SVG is the canonical output. PNG will be derived from the same SVG geometry and
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

The check builds all current packages, verifies browser bundles in memory,
type-checks source and tests, and runs the semantic, view-resolution, and
adapter suites. `demo:render` creates a real SVG and PNG under
`apps/reference-export/build/reference/` from an in-code original model. It is
a contributor reference path, not the future `.c4ml` command-line interface.
`desktop:start` builds and opens the real Electron desktop workbench for all
seven bounded executable view types. Angular, Monaco, and Electron are accepted
production libraries; the language and several MVP editor capabilities remain
under development. The browser-only Angular development server remains
available as `pnpm run editor:start`.

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
```

Its command names and current static-language scope remain provisional.

## Documentation

- [DOCUMENTATION.md](DOCUMENTATION.md) — first user guide, proposed syntax,
  current contributor commands, and demo walkthroughs
- [SPEC.md](SPEC.md) — normative product behavior and architectural boundaries
- [TESTING.md](TESTING.md) — required validation evidence
- [DEPENDENCIES.md](DEPENDENCIES.md) — dependency purpose, licensing, and
  replacement boundaries
- [AGENTS.md](AGENTS.md) — repository workflow and project invariants
- [`examples/draft`](examples/draft) — original syntax previews; the bounded
  seven-view slices are internally executable

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
