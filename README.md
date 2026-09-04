# C4thedral

**English** | [Deutsch](README.de.md)

C4thedral is a local desktop workbench for describing, reviewing, and evolving
software architecture with the C4 model. Its language and compiler are called
C4ML.

You write an architecture once, select the views that different audiences need,
and keep the source beside a live diagram. C4thedral validates the model, lays
out the diagram, and exports deterministic SVG and PNG files. When automatic
layout is not enough, you can adjust placement and routing without turning the
diagram into an unrelated drawing.

**Current release: `v0.1.0-beta.5` — public source beta.** This is working
software rather than an early scaffold: the desktop application and CLI compile
all seven C4 view types, and the native workflows have been exercised on macOS,
Windows, and Ubuntu. Beta means that the author-facing C4ML syntax and CLI
compatibility may still change, and signed public installers are not available
yet. See the [project status](docs/en/project-status.md) for the precise maturity and
remaining release boundaries.

## What C4thedral does

- Models People, Software Systems, Containers, Components, Code Elements,
  deployment environments, infrastructure, instances, and directed
  relationships in text.
- Produces System Landscape, System Context, Container, Component, Code,
  Dynamic, and Deployment views from the same architecture model.
- Shows C4ML source, diagnostics, and a live graphical preview in one desktop
  workbench.
- Keeps source authoritative: graphical authoring proposes reviewable C4ML
  changes and applies them as one undoable edit.
- Combines automatic layout with relative placement, alignment, equal spacing,
  nudges, exact pins, selectable ports, waypoints, avoidance areas, route
  corridors, and fixed routes.
- Navigates in both directions between source declarations and diagram objects,
  including relationships and their effective routes.
- Exports standalone SVG and PNG with controlled local fonts and reproducible
  geometry.
- Opens a single `.c4ml` file or an explicit multi-file project with
  project-wide references and diagnostics.
- Compares architecture revisions by stable identity, shows impact paths, and
  creates offline migration reviews without reducing changes to text or pixel
  diffs.
- Evaluates architecture quality, project policies, and attributed observations
  without modifying the authored model.
- Provides English and German application UI, native menus, dialogs, settings,
  and an offline handbook.
- Works locally after installation. Normal use requires no account, cloud
  service, Python process, or compiler server.

## The desktop workbench

The Electron application provides Files, Source Control, Diagrams, Output, and
Help areas around an Angular and Monaco editor. It supports native open and save
flows, several source files per project, unsaved-change protection, SVG/PNG
export, and explicit local Git stage, unstage, commit, and push actions.

The preview can fill the main workbench or detach into a second native window.
The detached preview receives only the rendered projection and interaction
state; it has no source, filesystem, compiler, save, or export authority.

Editing, compilation, layout, rendering, and Git access remain separated behind
small contracts. The desktop application uses the same portable compiler as the
command-line interface, so a model does not acquire different semantics in the
UI.

## Source is the architecture

C4ML source keeps model, views, presentation, layout, and routing distinct. A
diagram can begin with automatic layout and then gain only the controls it
needs. Those controls remain reviewable in source control and never become fake
architecture relationships or hidden editor state.

SVG is the canonical render output. PNG is derived from the same SVG geometry
and text layout rather than from a browser screenshot.

```text
C4ML source
  -> validated C4 model
  -> selected view
  -> automatic layout plus authored intent
  -> routed, renderer-neutral scene
  -> SVG
  -> PNG
```

## Vibe coding with engineering ownership

**C4thedral was vibe-coded—deliberately, transparently, and under experienced
human engineering direction.** Conversational AI accelerated implementation,
exploration, refactoring, tests, and documentation. It did not own the
architecture or lower the evidence required for a change.

This approach is useful only when the person directing it can design the
system, understand and reject generated code, judge security and maintenance
consequences, and recognize where automated checks are insufficient. The
project's specifications, source, reviews, test gates, and native evidence
remain authoritative. See [Vibe coding with engineering
ownership](docs/en/ai-assisted-development.md) for the benefits, limits, and
working rules behind that statement.

## Build and run the beta

Use Node.js 24.15.0 or a newer 24.x release and the pnpm version pinned in
`package.json`:

```shell
git clone https://github.com/indianerbande/c4ml.git
cd c4ml
corepack enable
corepack prepare pnpm@11.24.0 --activate
pnpm install --frozen-lockfile
pnpm run check
pnpm run desktop:start
```

The application starts with an empty workspace. Open a `.c4ml` document or an
explicit project from the File menu. Runnable examples are available under
[`examples/draft`](examples/draft), including the all-seven-view
`signal-garden.c4ml` demonstration.

For native packages, platform prerequisites, Linux sandbox handling, and the
complete reproducible procedure, follow
[Build C4thedral from source](docs/en/build-from-source.md). Self-built macOS and Windows packages
do not carry future C4thedral publisher signatures.

## Use the CLI

The repository includes an experimental local CLI that uses the same language
and compiler packages as the desktop application:

```shell
# Validate a model.
pnpm run c4ml -- check examples/draft/hello-context.c4ml

# Render one view as SVG and PNG.
pnpm run c4ml -- render examples/draft/hello-static-zoom.c4ml \
  --view arrangement-engine-code \
  --format svg,png \
  --output build/diagrams

# Validate a multi-file project.
pnpm run c4ml -- check examples/projects/garden-pulse-multifile

# Compare a Git revision with the working project without checking it out.
pnpm run c4ml -- diff path/to/project \
  --before-ref main \
  --after-ref working \
  --diagnostics json
```

The CLI also supports analysis, graph queries, semantic and visual comparison,
one-view or all-view rendering, multiple PNG scales, and human-readable or JSON
diagnostics. Its commands remain provisional during the beta and it is not yet
published as a standalone package.

## Current beta boundaries

The syntax used by the runnable examples is real and executable. What is not
yet promised is long-term source compatibility: keywords, formatting rules, and
some advanced presentation constructs may change before the first stable
language release. There is not yet a general C4ML formatter.

Built-in and project-file themes work today. The unfinished item is a possible
future syntax for declaring themes directly inside `.c4ml`, not the existence
of theming itself. Likewise, the current layout and routing controls cover the
normal automatic-plus-manual workflow; additional constraint types are planned
for more specialized diagrams.

Signed, notarized public downloads for macOS and signed installers for Windows
are still outstanding. The beta is therefore distributed as source. These and
the smaller editor and language gaps are tracked in plain language in
[the project status](docs/en/project-status.md); detailed engineering work
remains in the [engineering roadmap](docs/engineering/roadmap.md).

## Documentation

The [English documentation index](docs/en/README.md) is the best entry point.

- [Build from source](docs/en/build-from-source.md)
- [Project status](docs/en/project-status.md)
- [User guide](docs/en/user-guide.md)
- [Vibe coding with engineering ownership](docs/en/ai-assisted-development.md)
- [C4ML projects](docs/en/projects.md)
- [Native platform matrix](docs/en/platforms.md)
- [Release notes](docs/en/releases/0.1.0-beta.5.md)
- [CONTRIBUTING.md](CONTRIBUTING.md) — contribution workflow
- [SECURITY.md](SECURITY.md) — private vulnerability reporting
- [Engineering documentation](docs/engineering/README.md) — specification,
  testing, settings, roadmap, and dependency governance
- [Dependency policy](docs/engineering/dependencies.md) — purpose, licenses, and
  replacement boundaries

## Originality and related projects

C4thedral is an original implementation in the broader C4 and architecture-as-
code ecosystem. The C4 model, PlantUML, Structurizr, Mermaid, LikeC4, D2,
Graphviz, ELK, Penrose, and other projects provide valuable general capability
insight. C4ML does not seek source compatibility with another diagram language,
and its grammar, examples, interface, themes, and visual assets are developed
independently.

## License

C4thedral and C4ML are licensed under the [Apache License 2.0](LICENSE).
Third-party dependencies retain their own licenses and are documented
separately.
