# C4ML

C4ML is an open-source model-and-diagram compiler for software architecture
based on the C4 model. It is designed around one shared architecture model,
explicit diagram views, useful automatic layout, and precise author control
when a diagram needs deliberate placement or routing.

The intended user experience has two entry points:

- a local command-line compiler for validation and SVG/PNG export; and
- a two-pane TypeScript editor with source on the left and a hot graphical
  preview on the right.

Both frontends will use the same browser-compatible TypeScript compiler core.
The CLI will not launch a browser, and neither frontend requires a Python
service, cloud account, or network connection for the planned normal workflow.

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
- an original, executable Signal Garden Container View reference export; and
- browser-compatible compiler-core contracts.

Not implemented yet:

- the public `.c4ml` parser and formatter;
- the production CLI;
- relative placement constraints, pinning, avoidance regions, locked route
  segments, and the remaining full routing contract;
- complete render validation for all seven view types;
- a bundled reproducible font and frozen author-facing theme grammar;
- the public source grammar for custom shape definitions and assignments; and
- the browser editor.

The syntax shown in [DOCUMENTATION.md](DOCUMENTATION.md) and under
[`examples/draft`](examples/draft) is therefore a **design preview**. It is not
accepted by a compiler yet and remains open to review before the grammar is
frozen.

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

Automatic routing is a starting point rather than an irreversible result.
View-local ports, named corridors and lanes, relative or absolute waypoints,
avoidance regions, locked segments, and fully fixed routes will let authors
control dense connection graphs without turning layout instructions into fake
architecture relationships.

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

Use Node.js 24 LTS and the pnpm version pinned in `package.json`.

```shell
pnpm install
pnpm run check
pnpm run demo:render
```

The check builds all current packages, verifies browser bundles in memory,
type-checks source and tests, and runs the semantic, view-resolution, and
adapter suites. `demo:render` creates a real SVG and PNG under
`apps/reference-export/build/reference/` from an in-code original model. It is
a contributor reference path, not the future `.c4ml` command-line interface.

## Documentation

- [DOCUMENTATION.md](DOCUMENTATION.md) — first user guide, proposed syntax,
  planned commands, and demo walkthroughs
- [SPEC.md](SPEC.md) — normative product behavior and architectural boundaries
- [TESTING.md](TESTING.md) — required validation evidence
- [DEPENDENCIES.md](DEPENDENCIES.md) — dependency purpose, licensing, and
  replacement boundaries
- [AGENTS.md](AGENTS.md) — repository workflow and project invariants
- [`examples/draft`](examples/draft) — original, non-runnable syntax previews

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
