# C4ML User Guide

Status: Draft syntax preview with executable language and desktop workbench

Date: 2026-08-30

This guide explains the intended C4ML authoring experience and gives the first
complete syntax proposal. It is written as a user guide so that the language
can be reviewed through realistic examples rather than grammar fragments.

> **Important:** there is no complete public `.c4ml` parser, release-ready CLI,
> or feature-complete editor yet. A working Electron desktop application now
> packages the editor, but it is still a development build rather than a signed
> and notarized public release. The syntax in this document is non-normative
> and may change after review. An internal experimental language package and
> the production-bound Angular editor execute the bounded slices in
> `hello-context.c4ml`,
> `hello-container.c4ml`, `hello-static-zoom.c4ml`, `hello-dynamic.c4ml`, and
> `hello-deployment.c4ml`. The parser-independent C4 semantic model, all seven
> view-resolution contracts, and a first internal model-to-SVG/PNG rendering
> path are implemented today.
> The internal path also carries explicit Ports, Routes, Arrowheads, and
> restricted renderer-neutral shape definitions. `hello-context.c4ml` now
> exercises the first executable placement-constraint slice and the current
> view-local route-control slice through both the CLI and the editor worker.

`SPEC.md` remains the normative definition of product behavior. If this guide
and `SPEC.md` disagree, `SPEC.md` wins.

## Contents

- [1. What C4ML is for](#1-what-c4ml-is-for)
- [2. Current and planned usage](#2-current-and-planned-usage)
- [3. Proposed source format](#3-proposed-source-format)
- [4. Declaring the architecture model](#4-declaring-the-architecture-model)
- [5. Declaring relationships](#5-declaring-relationships)
- [6. Declaring views](#6-declaring-views)
- [7. Dynamic Views](#7-dynamic-views)
- [8. Deployment model and views](#8-deployment-model-and-views)
- [9. Layout and routing proposal](#9-layout-and-routing-proposal)
- [10. Diagnostics](#10-diagnostics)
- [11. Demo files](#11-demo-files)
- [12. Design principles for review](#12-design-principles-for-reviewing-the-proposal)
- [13. Respect for related projects](#13-respect-for-related-projects)

## 1. What C4ML is for

C4ML describes software architecture once and derives several diagrams from
that shared model. Authors should be able to begin with automatic layout and
then refine only the places or routes that need deliberate control.

A C4ML source document has four distinct concerns:

1. `model` declares people, systems, containers, components, and code elements;
2. `relations` declares directed architectural relationships;
3. `deployments` declares runtime environments and instances; and
4. `view` declarations select diagrams and apply view-local presentation or
   layout.

Layout instructions never create architecture relationships. Changing a route,
position, theme, or legend does not change the semantic model.

## 2. Current and planned usage

### Available today for contributors

The TypeScript compiler core can be built and tested:

```shell
pnpm install
pnpm run check
```

That gate also generates and tests the experimental `draft-1` language slices.
It parses `examples/draft/hello-context.c4ml`,
`examples/draft/hello-container.c4ml`, and
`examples/draft/hello-static-zoom.c4ml`, and
`examples/draft/hello-dynamic.c4ml` and
`examples/draft/hello-deployment.c4ml`, translates their syntax trees into the
compiler-owned model, and exercises the same compiler pipeline through
deterministic SVG. This is an experimental contributor path, not a frozen
public language contract.

The desktop workbench can be started locally:

```shell
pnpm run desktop:start
```

It opens as a normal desktop application with simultaneous source and preview
tabs. The activity bar opens C4ML-specific Files, Source Control, Diagrams,
Output, and Help areas. Source Control reports the containing local repository,
lets you stage or unstage changes, commits staged changes, and pushes the current
branch through its configured remote. Save editor changes before committing.
Problems and selected Route details share the bottom panel; their active tab and
the visible Problems count both toggle that panel. Use the command
center or `Shift+Cmd/Ctrl+P` to search the local command palette. Use the
toolbar or the native File menu to open and save `.c4ml` source. The standard shortcuts are
`Cmd/Ctrl+O`, `Cmd/Ctrl+S`, and `Cmd/Ctrl+Shift+S`. The window title and source
header mark unsaved changes, and closing a dirty document asks before discarding
them. The renderer receives only an opaque document handle; native filesystem
paths and Node.js APIs remain in the Electron main process.

The two buttons beside **Routes** change the preview workspace. **Full-size
preview** temporarily gives the diagram the complete main workbench and returns
to source-and-preview with the same button. **Open preview in a separate
window** frees the main window for source work; **Return preview to the
workbench** docks it again. Selection, zoom, fit, and the Route overlay stay in
sync. The detached window is deliberately projection-only: it receives no
source text, document handle, filesystem path, compiler, save action, or export
action. Closing or moving it cannot change the `.c4ml` document or exported
SVG/PNG. The detachable preview is a native Electron window. The internal
renderer harness uses the full-size mode and does not provide a browser pop-out.

Use **Export PNG** in Output or the File menu to save the current canonical
diagram at 1x, 2x, or 3x. Rasterization runs locally in the desktop main process
from the same SVG shown by the preview, with the packaged IBM Plex Sans fonts;
it does not take a browser screenshot or run layout again. The internal
renderer harness keeps SVG download but has no native PNG dialog.

Open **Settings** from the toolbar or with `Cmd/Ctrl+,`. The first settings
choose English or German interface copy, System, Light, or Dark workbench
colors, and the source editor's monospace family and size. Changes apply
immediately and are stored locally. The language choice also updates C4ML-owned
native menu commands and dialogs; names, descriptions, source, compiler
diagnostics, and diagrams are never translated automatically. Preferences do
not edit the open `.c4ml` document or alter exported diagram colors, fonts, or
geometry. **Reset defaults** restores English and the remaining version-one
defaults. The settings catalogue and extension rules are documented in
`SETTINGS.md`.

The workbench restores the active activity area, bottom-panel state, preview
workspace mode, preview zoom, Route Debug visibility, and safe bounded preview
window geometry after a relaunch. This local session record never stores source
text, document handles, or filesystem paths; `.c4ml` files remain the
architecture source of truth.

Open **Help** from the `?` activity or search for **Open C4ML handbook** in the
command palette. The local handbook groups the currently executable syntax by
authoring task, can be searched in English or German, and opens beside the
source editor without closing the diagram. Its **At cursor** card follows the
syntax owner reported by the C4ML language worker. Press `F1` to open that
article directly. Help search and navigation never edit the document or alter
diagram output.

Parsing, compilation, and SVG generation run in a local Web Worker inside the
sandboxed desktop renderer.
When an edit is invalid, the diagnostic panel updates while the last valid
diagram remains visible. The accepted lazy Monaco adapter presents only the
tokens, values, or references accepted at the current cursor and applies the
language worker's exact source edit. `Ctrl+Space` opens the in-place popup on
Windows and Linux. On macOS use `Cmd+I`, because the operating system commonly
reserves `Ctrl+Space` for switching input sources. The visible “C4ML
IntelliSense” action provides the same keyboard-independent trigger.
Compiler ranges appear as inline markers, and selecting a diagnostic reveals
its source range. Normal Monaco undo/redo remains synchronized with hot
compilation. The preview can be zoomed, fitted, scrolled while enlarged, and
downloaded as SVG. Documents with several executable views expose a view
selector; changing it recompiles the selected projection without duplicating
the model. Syntax colors come from the C4ML lexer's source spans through the
same worker, while automatic preview geometry comes from the separate local
ELK.js Web Worker.

For isolated renderer development, contributors can start the internal harness
with `pnpm run renderer:start`; native Open/Save controls are absent there. It
is not a supported browser application or deployment target. A local packaged
application and current-platform installers can be created with:

```shell
pnpm run desktop:package
pnpm run desktop:make
```

Artifacts are ignored below `build/desktop/`. On macOS, `desktop:make` produces
an application, DMG, and ZIP. These are ad-hoc signed local development
artifacts, not notarized releases. The Windows Setup EXE maker is configured but
still needs a native Windows build and installation test.

Inside a `route` block, IntelliSense first asks for `policy`. Once it is known,
the editor offers only controls compatible with that policy and hides properties
already present. For example, `points` is offered for `fixed` but not for
`guided`, while `via`, `corridor`, and `lane` are guided controls.

An original Container View can also be exported through the current internal
TypeScript-fed reference path:

```shell
pnpm run demo:render
```

This writes `signal-garden-containers.svg` and
`signal-garden-containers.png` below
`apps/reference-export/build/reference/`. The generated directory is ignored by
Git. This command proves the resolved-view, layout, route, scene, SVG, and PNG
stages together; it is not the planned end-user CLI and does not parse the draft
syntax shown below.

The current TypeScript surface exports the domain types, semantic and view
resolution, diagram preparation, routing, scene construction, SVG rendering,
shape validation, and `compileArchitectureDiagram` from
`@c4ml/compiler-core`.

The original `signal-garden` TypeScript fixture demonstrates every semantic
element and all seven views in
`packages/compiler-core/test/signal-garden.fixture.ts`.

### Experimental contributor CLI

The first thin Node.js frontend is now executable for the bounded `draft-1`
slices covering all seven view types. It builds and calls the same language and
compiler packages as the editor worker:

```shell
# Validate without rendering.
pnpm run c4ml -- check examples/draft/hello-static-zoom.c4ml

# Compare two valid architecture states by stable identity.
pnpm run c4ml -- diff path/to/before.c4ml path/to/after.c4ml \
  --diagnostics json

# Export one stable visual comparison as canonical SVG and derived PNG.
pnpm run c4ml -- diff path/to/before.c4ml path/to/after.c4ml \
  --comparison overlay \
  --view garden-pulse-context \
  --format svg,png \
  --output build/comparisons

# Compare a branch or commit with the current working source, without checkout.
pnpm run c4ml -- diff path/to/project \
  --before-ref main \
  --after-ref working \
  --diagnostics json

# Ask which architecture items are downstream and receive an explained focus.
pnpm run c4ml -- query examples/draft/hello-context.c4ml \
  --kind downstream \
  --subject element:caretaker \
  --diagnostics json

# Trace one deterministic path between two stable architecture identities.
pnpm run c4ml -- query path/to/project \
  --kind path \
  --subject element:browser-app \
  --target element:records-store \
  --diagnostics json

# Render one view as canonical SVG and derived PNG.
pnpm run c4ml -- render examples/draft/hello-static-zoom.c4ml \
  --view arrangement-engine-code \
  --format svg,png \
  --output build/diagrams

# Render all views as SVG and PNG.
pnpm run c4ml -- render examples/draft/hello-static-zoom.c4ml \
  --all \
  --format svg,png \
  --output build/diagrams
```

`--diagnostics json` emits machine-readable validation or rendering results,
`--scale` controls PNG scale, and `pnpm run c4ml -- version` reports the current
experimental frontend and language versions. Exit classes distinguish success,
usage, source/view selection, layout/render compilation, and filesystem or
environment failures; `analyze --fail-on` adds the distinct finding-threshold
exit class `6`.

`analyze` runs the compiler-owned built-in architecture checks. Blocking source
or semantic failures remain normal diagnostics; a valid architecture receives
deterministic findings with rule identity, severity, evidence, affected stable
identities, and source locations. The first catalogue includes non-blocking
shared validation guidance, architecture declarations that occur in no resolved
View, and Views that resolve to no content. Human CLI output prints each source
location. The editor presents the same report in **Output → Architecture
findings**; selecting a finding opens and marks its owning source declaration.
For an explicit project, the report also evaluates its optional local
`.c4ml-policy.json` resource. `--fail-on never|error|warning` turns a selected
finding severity into classified process exit `6` for CI while still printing
the complete report; the default is `never`.

`query` answers upstream, downstream, path, containment, deployment, and
resolved-View-coverage questions. Subjects and path targets use qualified
stable identities such as `element:browser-app`, `relationship:api-writes`, or
`deployment-node:production-cluster`. Containment accepts `--scope ancestors`,
`descendants`, or `both`; paths accept `--direction upstream` or `downstream`.
JSON output includes the portable query result and a temporary focus View.
That focus contains only references to canonical identities plus an explanation
for every included item and Relationship; it does not duplicate or modify the
authored architecture or create source code.

`diff` accepts two files, manifests, or project directories. It reports model,
Relationship, deployment, View, presentation, and layout changes separately.
Stable identifiers make an element name change a rename; comments, formatting,
declaration order, and source locations do not create changes. The current CLI
returns the portable version-one difference and deterministic upstream/downstream
impact report directly and never infers semantic change from rendered pixels.

With `--comparison`, `diff` also accepts `before`, `after`, `overlay`, or
`change-only` plus a View identifier that exists with the same stable identity
and kind in both states. Unchanged compatible leaf geometry is retained unless
hard placement, changed dimensions or parentage, containment, or collision
rules require the later automatic result. The artifact visibly distinguishes
added, removed, changed, affected-path, and layout-movement states and includes
the same explanation in SVG metadata. `--format svg,png` derives PNG from that
canonical SVG; `--scale` controls PNG resolution.

`--before-ref` and `--after-ref` accept a local commit, tag, branch, or the
special value `working`. If only one project path is supplied, both selected
states use that path. Git revisions are read directly from the local object
database without changing `HEAD`, the index, or working files. This requires a
locally installed Git executable but no network access. Hosted GitHub, GitLab,
or Bitbucket authentication is not part of this local adapter.

### Reviewed migration stories

The portable compiler foundation can compose two or more reviewed canonical
architecture states into an ordered migration story. Each state records a
stable identity, a human-readable title, and authored or Git provenance. Each
step then carries the ordinary semantic difference, its impact paths, and the
identities of the source states.

The offline presentation renderer expects the four comparison SVG modes for
each included View: `before`, `after`, `overlay`, and `change-only`. It embeds
those diagrams in one self-contained HTML file with step navigation and
expandable comparison sections. It does not fetch fonts, scripts, styles, or
other resources from a network. Frontends still decide which states have been
reviewed and which Views belong in a presentation; no hidden editor state is
treated as architecture history.

The CLI is contributor evidence, not a frozen public command contract. It
accepts the current placement and route-control slices, including relative
position, alignment, pins, relative route guidance, avoidance regions, and
locked segments, but not Visual Groups, shapes, or themes from source. SVG and
PNG use the same locally packaged IBM Plex Sans files;
SVG embeds WOFF2 faces and PNG supplies the matching TTF faces to the renderer
with system-font discovery disabled.

The desktop renderer uses the same compiler in a local Web Worker. Source remains
authoritative; the preview does not keep hidden semantic or layout state.
Monaco is the accepted desktop source-editor library behind a C4ML-owned
adapter, not a second parser. Selecting a source declaration highlights its
source-mapped diagram node; selecting a diagram node reveals and selects the
corresponding declaration. The orange selection outline exists only in the
live preview, so an exported SVG remains the canonical compiler result.
Relationship declarations and view-local `route` blocks also select their
effective connection; clicking close to that path reveals the underlying
Relationship, Dynamic Interaction, or Deployment Relationship declaration.
The optional Route Debug overlay shows effective route points, relative
waypoints, locked segments, avoidance regions, source and target Ports, the
label anchor, and every lane of a selected corridor. Its adjacent inspector
reports policy, style, Port sides, point count, relative guidance, avoidance
state, selected label segment, and corridor lane. The overlay and selection styling exist only
in the live preview. Ports, route labels, and corridors can also be selected
directly. Each reveals the source of its owning route control; none becomes a
second architectural relationship. Arrowheads are not separate targets yet.

### Guided modeling wizard

The editor includes a bounded guided architecture interview. It starts with
the question the diagram should answer, not with a test of C4 vocabulary:

- **Who uses this application, and what is around it?** creates a System
  Context starter with one application, one user role, and their intent.
- **What runs inside this application?** creates a Container starter from the
  parts that can be started, deployed, or operated separately, plus their
  responsibilities, technologies, and explicit connections and protocols.

The C4 terms appear beside these choices as optional translations. In
particular, “Container” is explained as a runtime/deployment unit and does not
imply Docker. Stable technical IDs are available under **Advanced details**;
they are not required vocabulary for the normal path. Before applying anything,
the final step shows the complete generated `draft-1` source. Cancel leaves the
active document unchanged; apply replaces it explicitly, and **Undo wizard**
restores the prior document once.

The result is not a separate visual-only document. The wizard generates normal
C4ML source in the language worker and hands it to the same parser, validator,
compiler, and preview used for hand-authored source. The current wizard creates
a new document only; it does not merge into or reformat existing source.

The intended later wizard remains broader: Components, Code Elements,
deployments, additional views, Visual Groups, and more context-dependent
relationship and ownership choices. That complete scope and safe extension of
existing documents are not implemented or accepted yet.

### Context-sensitive architecture changes

**Change architecture…** extends an existing static view without requiring the
author to recall the available C4 declaration vocabulary. It is intentionally
separate from **Arrange element…** and **Edit route…** because it changes the
architecture model rather than only the diagram layout.

The active view determines the available choices:

- System Landscape and System Context can add a role, team, or group (a C4
  Person) or an application/software system;
- a Container view can add a separately running or data-holding part inside
  its scoped Software System;
- a Component view can add a part inside its scoped Container;
- a Code view can add an important code structure inside its scoped Component;
  and
- **Connect existing elements** lists only directed endpoint pairs valid for
  the active view scope.

The dialog asks for readable names, responsibilities, technologies, and the
direction of a connection in plain language. Stable technical identifiers stay
visible because they are the durable source identity. In a System Context, a
new unconnected neighbor enters the shared model first; use **Connect existing
elements** next so that the relationship brings it into that projection.
**Preview architecture
change** first creates an ordinary project-addressed text edit and compiles the
complete candidate project without changing the active documents. The proposed
C4ML source, candidate diagram, and blocking diagnostics are shown together.
Only a valid candidate can be applied; apply is one Monaco edit and **Undo
architecture change** reverses it once.

The current slice covers the five static C4 views. Dynamic interactions and
Deployment topology need their own order-, environment-, node-, and instance-
aware operations and are deliberately not presented as generic element
creation. The source grammar remains `draft-1` and is not frozen by this UI.

For the quickest syntax review, begin with
[`examples/draft/hello-context.c4ml`](examples/draft/hello-context.c4ml), move
to [`examples/draft/hello-container.c4ml`](examples/draft/hello-container.c4ml),
then to
[`examples/draft/hello-static-zoom.c4ml`](examples/draft/hello-static-zoom.c4ml)
for Component and Code, continue with
[`examples/draft/hello-dynamic.c4ml`](examples/draft/hello-dynamic.c4ml) for
System Landscape and Dynamic, then use
[`examples/draft/hello-deployment.c4ml`](examples/draft/hello-deployment.c4ml)
for Deployment. Finally, open the complete and executable
[`signal-garden.c4ml`](examples/draft/signal-garden.c4ml) demonstration. Proposed
tags, Visual Groups, and View presentation remain separately reviewable in
[`signal-garden-language-preview.md`](examples/draft/signal-garden-language-preview.md)
without making the runnable demo invalid.

## 3. Proposed source format

### 3.1 Document header

Every file begins with a language marker:

```c4ml
c4ml draft-1
```

`draft-1` is a proposal identifier, not an accepted language version. A stable
versioning scheme must be accepted before the first public release.

### 3.2 Basic notation

The current proposal uses:

- UTF-8 source files;
- explicit stable identifiers such as `signal-garden`;
- double-quoted text;
- `//` for line comments;
- lists written as `[first, second]`;
- properties written as `name = "Signal Garden"`; and
- braces to keep model, relation, deployment, view, and layout scopes visible.

Declaration order has no semantic or layout meaning unless a construct such as
a Dynamic Interaction explicitly declares an order.

### 3.3 Projects and several source files

A single `.c4ml` file is also the smallest C4ML project. It needs no manifest.
The CLI may receive that file directly or a directory containing exactly one
root-level `.c4ml` file.

When an architecture is divided among several files, add
`c4ml.project.json`. It names the project and explicitly lists its architecture
sources:

```json
{
  "version": 1,
  "id": "garden-architecture",
  "name": "Garden Architecture",
  "policy": "governance.c4ml-policy.json",
  "sources": [
    "model/systems.c4ml",
    "relations/relationships.c4ml",
    "views/context.c4ml"
  ]
}
```

The optional `policy` path selects one local version-one JSON policy set. It is
not `.c4ml` source and does not extend the draft grammar. For example:

```json
{
  "version": 1,
  "id": "garden-policies",
  "policies": [
    {
      "id": "garden.owner",
      "title": "Garden Pulse has an owner",
      "severity": "error",
      "kind": "required-metadata",
      "subjectKeys": ["element:garden-pulse"],
      "requirements": [{ "kind": "metadata", "key": "owner" }]
    }
  ]
}
```

The desktop loads this resource with the project and lists violations in
**Output → Architecture findings**. It remains read-only in this first editor
slice; source navigation goes to the affected architecture declaration.

Each listed source still begins with `c4ml draft-1`, but may contain only the
top-level blocks that belong in that file. References work across the project.
Files are merged as declarations rather than pasted as text, and neither file
order nor directory position changes stable identity or layout.

Version one uses only explicit local relative paths. Globs, parent-directory
traversal, remote includes, reusable external projects, and module aliases are
not available. The executable original
`examples/projects/garden-pulse-multifile` project shows the current structure;
`PROJECTS.md` contains the complete project guide.

In the desktop application, choose **File → Open Project…** or use
`Cmd/Ctrl+Alt+O`. The Files area and source tab strip then show every listed
source. Compilation, diagnostics, diagram navigation, and reference suggestions
use the complete in-memory project. **Save** writes the active tab. **Save All**
(`Cmd/Ctrl+Alt+S`) writes every modified project source; each successful file is
marked clean even if a later save fails or is canceled. The window remains
marked as modified while any project source is unsaved. Switching source tabs
preserves the independent undo history, cursor, and scroll position of every
document.

## 4. Declaring the architecture model

### 4.1 People and Software Systems

```c4ml
model {
  person grower {
    name = "Grower"
    responsibility = "Plans and supervises cultivation cycles."
    classification = external
  }

  system signal-garden {
    name = "Signal Garden"
    responsibility = "Coordinates cultivation plans from environmental signals."
    classification = internal
  }

  system weather-beacon {
    name = "Weather Beacon"
    responsibility = "Publishes local weather observations."
    classification = external
  }
}
```

The identifier follows the element kind and is the persistent identity.
Changing `name` must not break references or move unrelated elements.

Every element has a concise `responsibility`. `classification` distinguishes
internal and external elements where that distinction is useful.

### 4.2 Containers

A Container belongs to exactly one Software System and declares its technology:

```c4ml
model {
  container studio-ui inside signal-garden {
    name = "Cultivation Studio"
    responsibility = "Presents plans and accepts cultivation changes."
    technology = "TypeScript web application"
  }

  container cultivation-api inside signal-garden {
    name = "Cultivation API"
    responsibility = "Applies planning rules and coordinates observations."
    technology = "TypeScript service"
  }
}
```

`inside` expresses semantic C4 ownership. It is not a layout instruction.

### 4.3 Components

A Component belongs to exactly one Container and also declares technology:

```c4ml
model {
  component recommendation-engine inside cultivation-api {
    name = "Recommendation Engine"
    responsibility = "Calculates recommendations from observations."
    technology = "Domain service"
  }
}
```

### 4.4 Code Elements

A Code Element belongs to exactly one Component. `code-kind` is explicit so
the model is not limited to object-oriented classes:

```c4ml
model {
  code zone-policy inside recommendation-engine {
    name = "Zone Policy"
    responsibility = "Combines zone constraints into a recommendation."
    code-kind = module
    language = "TypeScript"
  }

  code moisture-index inside recommendation-engine {
    name = "Moisture Index"
    responsibility = "Normalizes recent moisture observations."
    code-kind = function
    language = "TypeScript"
  }
}
```

Code Views use explicitly modeled code elements. Automatic source-code
discovery is not required for the first release.

### 4.5 Tags, links, and metadata

The semantic model supports tags, documentation links, and namespaced metadata.
The proposed notation is:

```c4ml
system signal-garden {
  name = "Signal Garden"
  responsibility = "Coordinates cultivation plans from environmental signals."
  classification = internal
  tags = [core, cultivation]

  link handbook {
    label = "Operations handbook"
    url = "https://docs.example.invalid/signal-garden"
  }

  metadata "example.owner" = "Cultivation Platform Team"
}
```

Metadata does not alter core C4 semantics. URLs in examples use reserved or
invalid domains and do not imply a network requirement.

## 5. Declaring relationships

Relationships are separate, directed declarations with their own stable IDs:

```c4ml
relations {
  relation grower-plans-system {
    from = grower
    to = signal-garden
    intent = "Plans and reviews cultivation cycles"
  }

  relation ui-calls-api {
    from = studio-ui
    to = cultivation-api
    intent = "Submits cultivation commands"
    technology = "HTTPS/JSON"
  }
}
```

`intent` describes the relationship in the `from` to `to` direction. A
Container-to-Container relationship must declare `technology` or `protocol`.
Layout dependencies are never written as relations.

## 6. Declaring views

Every view has a stable ID, explicit C4 type, title, purpose, scope, audience,
and legend. `audience = default` and `legend = generated` request the C4ML
defaults while keeping the choice visible in source.

### 6.1 System Landscape

```c4ml
view cultivation-portfolio {
  type = system-landscape
  scope = "Cultivation Operations"
  title = "System Landscape — Cultivation Operations"
  purpose = "Shows the people and systems exchanging cultivation signals."
  audience = default
  legend = generated
}
```

Landscape Views contain People and Software Systems relevant to a named
organization, portfolio, department, or collection.

### 6.2 System Context

```c4ml
view signal-context {
  type = system-context
  scope = signal-garden
  title = "System Context — Signal Garden"
  purpose = "Explains who uses Signal Garden and which systems supply it."
  audience = default
  legend = generated
}
```

The focal Software System is required. Directly connected People and Software
Systems may appear; Containers, Components, Code Elements, and deployment
details cannot appear.

### 6.3 Container

```c4ml
view signal-containers {
  type = container
  scope = signal-garden
  title = "Container View — Signal Garden"
  purpose = "Explains the deployable responsibilities inside Signal Garden."
  audience = default
  legend = generated
}
```

The scope is one Software System. Its Containers are the primary elements.

### 6.4 Component

```c4ml
view api-components {
  type = component
  scope = cultivation-api
  title = "Component View — Cultivation API"
  purpose = "Explains how the API validates plans and calculates advice."
  audience = default
  legend = generated
}
```

The scope is one Container. Its Components are the primary elements. Supporting
elements may include connected People and Software Systems and other Containers
inside the same Software System.

### 6.5 Code

```c4ml
view engine-code {
  type = code
  scope = recommendation-engine
  title = "Code View — Recommendation Engine"
  purpose = "Explains the important policy and observation calculations."
  audience = default
  legend = generated
}
```

The scope is one Component. Only Code Elements owned by that Component may be
selected as primary elements.

### 6.6 Selecting and excluding content

Automatic view resolution is the default. Authors may narrow a valid C4
projection explicitly:

```c4ml
view signal-context {
  type = system-context
  scope = signal-garden
  title = "System Context — Signal Garden"
  purpose = "Explains the immediate operating context."
  audience = default
  legend = generated

  select {
    include-elements = auto
    exclude-elements = [seasonal-reporting]
    include-relations = auto
    exclude-relations = []
  }
}
```

Selection cannot introduce an element from an illegal C4 level or remove a
required focal element. Excluding an element also removes relationships whose
endpoints would no longer both be visible.

### 6.7 Authored legends and audiences

```c4ml
view signal-context {
  type = system-context
  scope = signal-garden
  title = "System Context — Signal Garden"
  purpose = "Introduces the service during partner onboarding."
  audience = ["partner operations", "service owners"]

  legend {
    title = "Notation"
    entry internal-system {
      label = "Internal Software System"
      explanation = "Operated by the cultivation platform team."
    }
  }
}
```

Custom visual encodings must be explained by the legend or associated glossary.

### 6.8 Visual groups

A Visual Group adds a titled boundary around items that are already visible in
one view. It does not make a Software System contain another system, change a
Container's owner, or import an otherwise forbidden level of detail.

```c4ml
view cultivation-portfolio {
  type = system-landscape
  scope = "Cultivation Operations"
  title = "System Landscape — Cultivation Operations"
  purpose = "Shows the people and systems exchanging cultivation signals."
  audience = default
  legend = generated

  group cultivation-services {
    title = "Cultivation Services"
    description = "Systems participating in cultivation planning."
    members = [signal-garden, weather-beacon]
    keep-together = true
    padding = 32
  }
}
```

Groups can be nested without repeating element membership:

```c4ml
group external-participants {
  title = "External Participants"
  members = [grower, weather-beacon]
}

group complete-context {
  title = "Complete Context"
  members = [signal-garden]
  groups = [external-participants]
}
```

Within one view, an item or nested group has at most one direct parent group.
Groups therefore form a non-overlapping tree or forest. Cycles and overlapping
sibling membership are errors. The generated legend explains that a group is a
view-local visual boundary rather than C4 containment.

Deployment Views can also group visible Deployment Nodes, Infrastructure Nodes,
and instances. The parser proposal will use typed member references where an ID
would otherwise be ambiguous.

Future layout and routing stages will keep grouped contents together by default
and treat the resulting boundary as an obstacle or an explicitly traversable
boundary. Group membership itself never creates a relationship.

### 6.9 Themes and semantic color roles

C4 does not require a particular color palette. C4ML therefore treats color as
replaceable presentation while keeping the element type and internal/external
classification explicit in the model, scene graph, SVG, and legend.

The internal compiler API currently provides two original presets:

- `c4ml-blue` is the default and uses an accessible dark-to-light progression
  across the C4 abstraction levels; and
- `c4ml-garden` retains the lighter green reference style.

Theme tokens distinguish Person, Software System, Container, Component, Code
Element, both deployment-instance types, Infrastructure Node, all boundary
types, relationship policies, and internal/external states. Each element state
can independently set `fill`, `border`, `accent`, `title`, `metadata`, and
`description` colors.

The executable TypeScript contract already supports deep partial overrides:

```ts
scene: {
  theme: {
    id: "orchid-night",
    preset: "c4ml-blue",
    elements: {
      container: {
        internal: {
          fill: "#3B1F5A",
          border: "#241138",
          accent: "#D1A7F0",
        },
      },
    },
    routes: {
      guided: "#4A235A",
    },
  },
}
```

Only the specified tokens change; everything else remains inherited from the
selected preset. Colors use six-digit hexadecimal values. Unknown presets and
malformed values produce compiler diagnostics.

The corresponding source-language shape remains a proposal. One possible
author-facing form is:

```c4ml
theme orchid-night {
  base = c4ml-blue

  element container when internal {
    fill = "#3B1F5A"
    border = "#241138"
    accent = "#D1A7F0"
  }

  relation guided {
    color = "#4A235A"
  }
}

view signal-containers {
  // model, scope, title, purpose, audience, and legend omitted here
  presentation {
    theme = orchid-night
  }
}
```

The exact grammar is not accepted yet. Future tag and view-local rules will
follow the documented precedence order rather than mutating model semantics.
Bundled presets must remain readable without relying on color alone and must
retain at least 4.5:1 contrast for normal text.

### 6.10 Person and custom shapes

Person uses the original built-in `c4ml-person` shape. Its C4 type remains
`Person`; the shape is only its visual realization. Containers, Components,
Software Systems, and other supported roles use `c4ml-box` by default while
remaining visually distinguishable through explicit type labels and semantic
theme tokens.

C4ML's internal custom-shape contract is deliberately smaller than SVG. Every
shape has:

- a normalized 100 x 100 canvas;
- a content box for title, type, technology, and description;
- `north`, `east`, `south`, and `west` Port anchors; and
- rectangles, ellipses, polygons, or lines painted through the semantic roles
  `surface`, `accent`, and `detail`.

There is no shape-level script, CSS, font, filter, image, URL, or arbitrary SVG
fragment. This keeps SVG and PNG output local, deterministic, themeable, and
safe to inspect. A shape assignment never creates a new C4 element kind.

The author-facing grammar remains a preview. One possible notation is:

```c4ml
shape signal-marker {
  canvas = (100, 100)
  content = box(22, 22, 56, 56)

  ports {
    north = (50, 0)
    east = (100, 50)
    south = (50, 100)
    west = (0, 50)
  }

  draw {
    polygon surface = [(50, 0), (100, 50), (50, 100), (0, 50)]
    line detail = [(25, 50), (75, 50)]
  }
}

view signal-context {
  // model, scope, title, purpose, audience, and legend omitted here
  presentation {
    shape weather-beacon = signal-marker
  }
}
```

Before a shape reaches layout, the compiler validates its canvas, content box,
primitives, and all four Port positions. The precise source grammar is still
subject to review even though the underlying TypeScript contract is
implemented.

## 7. Dynamic Views

A Dynamic View describes one named scenario using ordered occurrences over
relationships in the static model:

```c4ml
view revise-plan {
  type = dynamic
  scope = "Revise a cultivation plan"
  title = "Dynamic View — Revise a Cultivation Plan"
  purpose = "Explains the runtime collaboration for a plan revision."
  audience = default
  legend = generated
  display = collaboration

  interaction submit-plan {
    order = 1
    from = studio-ui
    to = cultivation-api
    intent = "Submits the revised cultivation plan"
    relation = ui-calls-api
  }

  interaction store-plan {
    order = 2
    parallel = persist-and-notify
    from = cultivation-api
    to = ledger-store
    intent = "Stores the revised plan"
    relation = api-writes-ledger
  }

  interaction queue-notice {
    order = 2
    parallel = persist-and-notify
    from = cultivation-api
    to = notify-worker
    intent = "Queues a plan-change notice"
    relation = api-enqueues-notice
  }
}
```

Interactions with the same `order` form a parallel occurrence only when they
share the same non-empty `parallel` identifier. `display` may be
`collaboration` or `sequence`; switching it does not change interaction
semantics.

Dynamic endpoints reference Software Systems, Containers, or Components. A
view should stay at one abstraction level. Deliberate mixed-level scenarios
must acknowledge that decision:

```c4ml
allow-mixed-levels = true
```

## 8. Deployment model and views

The bounded syntax in this section is executable in
`examples/draft/hello-deployment.c4ml`. It remains experimental and does not
freeze the eventual public grammar.

### 8.1 Environments and nested nodes

```c4ml
deployments {
  environment production {
    name = "Production"
    responsibility = "Runs the live cultivation service."

    node prod-cloud {
      name = "Production Cloud"
      responsibility = "Hosts the live Signal Garden installation."
      technology = "European cloud region"
    }

    node prod-cluster inside prod-cloud {
      name = "Application Cluster"
      responsibility = "Runs user-facing and background services."
      technology = "Kubernetes"
    }

    infrastructure prod-gateway on prod-cloud {
      name = "Edge Gateway"
      responsibility = "Terminates public HTTPS traffic."
      technology = "Managed application gateway"
    }
  }
}
```

Deployment Node nesting uses `inside`. Infrastructure placement uses `on` so
semantic ownership and runtime placement remain visibly distinct.

### 8.2 Static references and instances

```c4ml
deployments {
  environment production {
    system-instance prod-system of signal-garden on prod-cloud
    container-instance prod-ui of studio-ui on prod-cluster
    container-instance prod-api of cultivation-api on prod-cluster

    deployment-relation prod-gateway-ui {
      from = prod-gateway
      to = prod-ui
      intent = "Forwards browser requests"
      technology = "HTTPS"
    }

    deployment-relation prod-ui-api {
      from = prod-ui
      to = prod-api
      intent = "Submits cultivation commands"
      relation = ui-calls-api
      technology = "HTTPS/JSON"
    }
  }
}
```

Instances reference static model elements; they do not redefine them. Multiple
instances of one Software System or Container are allowed. A deployment
relationship between instances preserves or explicitly qualifies its static
relationship.

### 8.3 Deployment View

```c4ml
view production-deployment {
  type = deployment
  environment = production
  systems = [signal-garden]
  title = "Deployment View — Signal Garden Production"
  purpose = "Explains where the live Signal Garden services execute."
  audience = default
  legend = generated
}
```

A Deployment View selects one environment and one or more Software Systems. It
includes their instances, required nested Deployment Nodes, and relevant
Infrastructure Nodes.

## 9. Layout and routing proposal

The first useful result should require no layout block. Automatic layout
creates candidate geometry before C4ML applies author controls.
Layout blocks belong to the view they refine.

In the desktop editor, select an element in the diagram, open **Geometry
details**, and choose **Arrange element…**. The placement editor offers the
same controls in intent-first order: relative placement, a small movement from
the automatic result, alignment, and ordered distribution. It shows both the
generated C4ML block and the fully compiled candidate diagram before anything
changes. **Apply to source** performs one ordinary Monaco edit and **Undo
arrangement** restores it in one step.

**Fix exact current position** is intentionally last. It records the current
top-left position in diagram units with `pin`; use it only when the relative
controls below cannot express the required result. The editor never stores a
private drag offset or geometry that is absent from the source.

To refine a connection graphically, select its line in the preview, open
**Route details**, and choose **Edit route…**. The Route editor can choose the
source and target Ports or add, move, and remove guidance points. It starts a
new point at the midpoint of a selected effective segment; moving an existing
relative anchor changes its relative shift instead of converting it into a
fragile canvas coordinate.

**Preview route change** always compiles the complete candidate project first.
The dialog shows the proposed C4ML block, the resulting diagram, any safe
cleanup proposed by C4ML, and hard compiler conflicts separately. For example,
adding ordered waypoint guidance may safely release an incompatible corridor
lane. **Apply to source** remains disabled for an invalid candidate and applies
a valid change as one ordinary Monaco edit. **Undo route edit** restores the
preceding source and dirty state in one step. Returning a path to automatic
routing removes obsolete guidance while preserving still-relevant explicit
Ports and label placement; if no route controls remain, the empty `route`
block is removed too.

### 9.1 Flow direction

```c4ml
layout {
  flow = right
}
```

### 9.2 Place, align, and distribute by intent

Start with semantic placement controls. They survive diagram growth because
they describe the intended relationship between elements instead of storing a
screen position.

```c4ml
layout {
  place grower left-of signal-garden {
    strength = hard
    gap = normal
  }

  align center-y [grower, signal-garden, weather-beacon] {
    anchor = signal-garden
    strength = soft
  }

  distribute horizontal [grower, signal-garden, weather-beacon] {
    gap = normal
    strength = hard
  }
}
```

`place` supports `left-of`, `right-of`, `above`, and `below`. `align` supports
`left`, `center-x`, `right`, `top`, `center-y`, and `bottom`; its explicit
`anchor` stays on the alignment line. `distribute` uses the listed order and
places each following element after the preceding one with the requested equal
gap. The first listed element is the reference position.

The named gaps are `tiny`, `small`, `normal`, and `large`. They resolve to 1,
2, 4, and 8 layout steps. One `step` is 16 diagram units (`du`). These are
scalable diagram-space units, not monitor pixels.

Placement controls are layout objects, not semantic relationships. `hard`
controls must either be satisfied or produce a diagnostic naming every
conflicting source location. A `soft` control may be relaxed only with an
explicit compiler warning.

### 9.3 Adjust the automatic result

Use `adjust` when the automatic position is almost right. The offset is always
computed from the automatic candidate, so it cannot accumulate across builds.

```c4ml
layout {
  adjust weather-beacon {
    relative-to = automatic
    move = up small
    strength = soft
  }

  adjust grower {
    relative-to = automatic
    move-y = -2step
    strength = soft
  }
}
```

Directional `move` accepts a named gap or an explicit `step`/`du` distance.
`move-x` and `move-y` accept signed `step` or `du` distances.

### 9.4 Pin exact diagram coordinates

```c4ml
layout {
  pin signal-garden {
    x = 520du
    y = 240du
    strength = hard
  }
}
```

Pinning one element does not disable automatic layout for the rest of the view.
Exact coordinates deliberately require the `du` suffix so a fixed position is
visibly different from a relative intent. Use a pin only when place, align,
distribute, and adjust cannot express the required result. Row/column
membership, bounded movement, proximity, and constrained sizes remain planned.

### 9.5 Ports and guided routes

A Relationship, its attachment points, and its drawing are separate objects:

```text
source element -> source Port -> Route -> target Port -> target element
                                      -> Arrowhead
```

The Relationship says what communicates and why. A Port says where that
relationship appearance attaches. The Route contains its path and label
placement. The Arrowhead contains the final direction-marker geometry. An
editor may call a draggable Port a connector handle, but `connector` is not a
core C4ML type because the word can also mean the whole line.

Routing has two independent choices:

- the authorship policy is `automatic`, `guided`, or `fixed`; and
- the route style is initially `direct` or `orthogonal`.

`automatic` delegates the complete path. `guided` fixes selected decisions and
lets the router connect the remaining segments. `fixed` defines the complete
path and fails if that path is invalid.

The current executable `draft-1` slice accepts cardinal Ports, integer canvas
coordinates, absolute `via` points, corridors, lanes, a zero-based label
segment, and an x/y label shift. An ordered `guide` may also anchor waypoints
to the source Port, target Port, a named element side, or the canvas, and may
lock selected segments. Every non-canvas anchor can carry an x/y shift.

```c4ml
layout {
  route ui-calls-api {
    policy = guided
    style = orthogonal
    source-port = east
    target-port = west
    via = [(520, 260), (520, 410)]
    label-segment = 2
    label-shift = (0, -14)
  }
}
```

Explicit waypoints refine a route after automatic placement. They do not create
or redirect the underlying semantic relationship. The ordered relative form is:

```c4ml
guide = [
  via source-port shift (36, 0),
  lock canvas at (520, 260) to canvas at (620, 260),
  via element cultivation-api north shift (0, -24),
  via target-port shift (-36, 0)
]
```

`guide` cannot be combined with the older absolute `via` list or a corridor in
the current slice. A locked segment is hard: if orthogonalization, obstacle
handling, or another hard rule would change it, compilation fails visibly.

Avoidance regions are reusable inside one view:

```c4ml
avoidance service-clearance {
  strength = hard
  around = cultivation-api
  padding = 24
}

avoidance reserved-note-area {
  strength = soft
  bounds = (720, 120, 180, 90)
}

route ui-calls-api {
  policy = guided
  style = orthogonal
  avoid = [service-clearance, reserved-note-area]
}
```

Use either `around` plus non-negative `padding`, or absolute `bounds = (x, y,
width, height)`. A hard region that cannot be respected fails compilation. A
soft region may be crossed only with diagnostic `C4ML-ROUTE-030`; the effective
region is then marked `relaxed` in the inspector and debug overlay.

### 9.6 Named corridors and lanes

Dense diagrams often need stable connection corridors rather than a separate
collection of unrelated waypoints for every relationship. The proposed model
allows a corridor to be positioned relative to diagram elements and split into
lanes:

```c4ml
layout {
  corridor data-access-east {
    orientation = vertical
    coordinate = 780
    lanes = 4
    lane-gap = 16
  }

  route api-writes-ledger {
    policy = guided
    style = orthogonal
    source-port = east
    target-port = west
    corridor = data-access-east
    lane = 1
  }

  route api-enqueues-notice {
    policy = guided
    style = orthogonal
    source-port = east
    corridor = data-access-east
    lane = 2
  }
}
```

`coordinate` is the corridor's x coordinate when `orientation = vertical` and
its y coordinate when `orientation = horizontal`. Lane numbers are zero-based.
The compiler rejects a lane outside the declared capacity and rejects two
relationships that select the same exclusive corridor lane. Relative corridor
anchors remain planned because they are more stable when automatic geometry
moves.

The compiler routes hard-guided and fixed paths first. Their occupied corridors
and lanes then become obstacles for remaining automatic paths. Two unrelated
relationships cannot silently occupy the same exclusive lane.

Shared trunks or junctions remain possible, but only when the author declares
that sharing deliberately. Automatic routing must not merge relationships just
to reduce the apparent number of lines.

### 9.7 Fixed routes and locked segments

Exact coordinates remain the final escape hatch:

```c4ml
layout {
  route exceptional-export {
    policy = fixed
    style = orthogonal
    points = [
      (640, 590),
      (640, 720),
      (1180, 720),
      (1180, 460)
    ]
    label-segment = 2
  }
}
```

The first and last fixed points must lie exactly on the effective source and
target boundaries. This makes absolute fixed routes a deliberate final escape
hatch. In practice, guided Ports, corridors, and waypoints are usually more
resilient.

A guided route may instead lock only selected segments and leave its other
segments automatic. Hard guidance is never ignored or silently downgraded. If
it cannot be satisfied, compilation fails with all relevant source locations.

The editor displays Ports, corridors, lanes, waypoints, locked segments, and
relaxed soft rules in its routing-debug overlay. Moving a waypoint
or selecting a lane should create an explicit source edit rather than hidden
editor state.

This executable syntax is still `draft-1`, not a public compatibility promise.
The precise constraint, relative-coordinate, and remaining route grammar must
be validated against real diagrams before acceptance.

## 10. Diagnostics

C4ML diagnostics are designed to contain:

- severity;
- stable diagnostic code;
- concise message;
- source file and range;
- related source ranges; and
- an actionable correction where one is known.

Examples of already implemented semantic codes include:

- `C4ML-SEM-002` — duplicate static element identifier;
- `C4ML-SEM-007` — invalid Component owner;
- `C4ML-SEM-015` — Container relationship without technology or protocol;
- `C4ML-DYN-006` — Dynamic Interaction does not resolve one directed static
  relationship; and
- `C4ML-VIEW-011` — illegal or unknown view-level element selection.

The experimental CLI returns distinct failure classes for source, layout,
rendering, and environment failures. The editor will retain the last valid
preview while showing diagnostics for the current invalid source.

## 11. Demo files

The repository contains seven original syntax documents plus one separated
language-preview companion:

- [`examples/draft/hello-context.c4ml`](examples/draft/hello-context.c4ml) — a
  minimal model and System Context View;
- [`examples/draft/hello-container.c4ml`](examples/draft/hello-container.c4ml)
  — Container ownership, technologies, protocols, and a Container View;
- [`examples/draft/hello-static-zoom.c4ml`](examples/draft/hello-static-zoom.c4ml)
  — the full static ownership hierarchy and selectable Component, Code,
  Container, and System Context Views;
- [`examples/draft/hello-dynamic.c4ml`](examples/draft/hello-dynamic.c4ml) — a
  named System Landscape plus ordered and parallel Dynamic Interactions;
- [`examples/draft/hello-deployment.c4ml`](examples/draft/hello-deployment.c4ml)
  — nested runtime environments, instances, runtime relationships, and a
  Deployment View;
- [`examples/draft/signal-garden.c4ml`](examples/draft/signal-garden.c4ml) — a
  larger executable model covering Containers, Components, Code, Dynamic
  behavior, Deployment, and every view type;
- [`examples/draft/signal-garden-language-preview.md`](examples/draft/signal-garden-language-preview.md)
  — proposed tags, Visual Group, and View presentation constructs kept outside
  executable source; and
- [`examples/draft/shape-marker.c4ml`](examples/draft/shape-marker.c4ml) — the
  restricted custom-shape contract and explicit cardinal Ports.

The bounded `hello-context.c4ml`, `hello-container.c4ml`,
`hello-static-zoom.c4ml`, `hello-dynamic.c4ml`, `hello-deployment.c4ml`, and
`signal-garden.c4ml` subsets are part of the automated internal language gate.
The other files, and every construct outside those subsets, remain
documentation artifacts. None of these previews defines an accepted grammar or
compatibility commitment.

## 12. Design principles for reviewing the proposal

When reviewing this syntax, the important questions are:

1. Can a common C4 model be read without knowing hidden defaults?
2. Are semantic ownership, deployment placement, view selection, and layout
   visibly different?
3. Are stable identifiers easy to preserve during graphical editing?
4. Can a formatter reproduce the document without changing meaning?
5. Can incomplete input produce useful source-located diagnostics?
6. Are automatic layout and exact manual controls both expressible?
7. Can future source edits remain small, explicit, and undoable?

## 13. Respect for related projects

C4ML benefits from a field shaped by the C4 model and by respected tools and
research projects including PlantUML, Structurizr, Mermaid, LikeC4, D2,
Graphviz, ELK, and Penrose. They address different parts of architecture
communication and diagram generation and provide valuable public evidence about
what users need.

This proposal is not a criticism of those projects and does not claim to replace
their roles. C4ML studies general capabilities and documented user workflows,
then develops its own semantics, source language, examples, interface, themes,
and implementation. It does not copy or translate another project's source
code, grammar, documentation, sample models, or visual identity.

The provenance is deliberately explicit: Relationship semantics come from C4;
Ports and source/target attachment are established graph-layout concepts;
Routes and Arrowheads are established graph-drawing and vector-rendering
concepts; and the normalized local canvas follows the general SVG coordinate
model. C4ML's exact object separation, restricted shape contract, source
proposal, built-in shapes, fixtures, and implementation are an original
synthesis for this project's requirements rather than an adaptation of one
tool. Primary capability references are recorded in `SPEC.md`.
