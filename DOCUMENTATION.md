# C4ML User Guide

Status: Draft syntax preview with executable language and editor foundation

Date: 2026-08-28

This guide explains the intended C4ML authoring experience and gives the first
complete syntax proposal. It is written as a user guide so that the language
can be reviewed through realistic examples rather than grammar fragments.

> **Important:** there is no complete public `.c4ml` parser, release-ready CLI,
> or feature-complete editor yet. The syntax in this document is non-normative
> and may change after review. An internal experimental language package and
> the production-bound Angular editor execute the bounded slices in
> `hello-context.c4ml`,
> `hello-container.c4ml`, `hello-static-zoom.c4ml`, `hello-dynamic.c4ml`, and
> `hello-deployment.c4ml`. The parser-independent C4 semantic model, all seven
> view-resolution contracts, and a first internal model-to-SVG/PNG rendering
> path are implemented today.
> The internal path also carries explicit Ports, Routes, Arrowheads, and
> restricted renderer-neutral shape definitions.

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

The Angular desktop editor can be started locally:

```shell
pnpm run editor:start
```

It presents source on the left and a live SVG preview with diagnostics on the
right. Parsing, compilation, and SVG generation run in a browser Web Worker.
When an edit is invalid, the diagnostic panel updates while the last valid
diagram remains visible. The accepted lazy Monaco adapter presents only the
tokens, values, or references accepted at the current cursor and applies the
language worker's exact source edit. `Ctrl+Space` opens the in-place popup; the
visible “C4ML IntelliSense” action provides the same keyboard-independent
trigger.
Compiler ranges appear as inline markers, and selecting a diagnostic reveals
its source range. Normal Monaco undo/redo remains synchronized with hot
compilation. The preview can be zoomed, fitted, scrolled while enlarged, and
downloaded as SVG. Documents with several executable views expose a view
selector; changing it recompiles the selected projection without duplicating
the model. C4ML syntax highlighting is a remaining production capability.

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
environment failures.

The CLI is contributor evidence, not a frozen public command contract. It does
not yet accept the non-executable Visual Group, route-control, shape, or theme
syntax. PNG currently uses local system fonts; production release artifacts
still require a controlled bundled font.

The editor uses the same compiler in a browser Web Worker. Source remains
authoritative; the preview does not keep hidden semantic or layout state.
Monaco is the accepted desktop source-editor library behind a C4ML-owned
adapter, not a second parser. The editor will retain this separation while
filling the remaining navigation, export, accessibility, and graphical-editing
gaps.

### Guided modeling wizard spike

The editor now includes the first bounded guided architecture interview. “New
from wizard” asks for one focal Software System, one Person, their directed
relationship, and the System Context View. Before applying anything, the final
step shows the complete generated `draft-1` source. Cancel leaves the active
document unchanged; apply replaces it explicitly, and “Undo wizard” restores
the prior document once.

The result is not a separate visual-only document. The wizard generates normal
C4ML source in the language worker and hands it to the same parser, validator,
compiler, and preview used for hand-authored source. The current wizard creates
a new document only; it does not merge into or reformat existing source.

The intended later wizard remains broader: People, Software Systems,
Containers, Components, Code Elements, deployments, views, Visual Groups, and
context-dependent relationship and ownership choices. That complete scope and
safe extension of existing documents are not implemented or accepted yet.

For the quickest syntax review, begin with
[`examples/draft/hello-context.c4ml`](examples/draft/hello-context.c4ml), move
to [`examples/draft/hello-container.c4ml`](examples/draft/hello-container.c4ml),
then to
[`examples/draft/hello-static-zoom.c4ml`](examples/draft/hello-static-zoom.c4ml)
for Component and Code, continue with
[`examples/draft/hello-dynamic.c4ml`](examples/draft/hello-dynamic.c4ml) for
System Landscape and Dynamic, then use
[`examples/draft/hello-deployment.c4ml`](examples/draft/hello-deployment.c4ml)
for Deployment. Finally compare them with the complete
[`signal-garden.c4ml`](examples/draft/signal-garden.c4ml) preview.

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

### 9.1 Flow direction

```c4ml
layout {
  flow = right
}
```

### 9.2 Relative constraints

```c4ml
layout {
  constraint left-of(grower, signal-garden) {
    strength = hard
    gap = 120
  }

  constraint align-center-y(grower, signal-garden) {
    strength = soft
  }
}
```

Constraints are layout objects, not semantic relationships. Hard constraints
must either be satisfied or produce a diagnostic naming every conflicting
source location.

### 9.3 Pinning one element

```c4ml
layout {
  pin signal-garden {
    x = 520
    y = 240
    strength = hard
  }
}
```

Pinning one element does not disable automatic layout for the rest of the view.

### 9.4 Ports and guided routes

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

```c4ml
layout {
  route ui-calls-api {
    policy = guided
    style = orthogonal
    source-port = east
    target-port = west
    via = [right-of(studio-ui, 32), above(cultivation-api, 24)]
    avoid = [notify-worker]
    strength = hard
  }
}
```

Explicit waypoints refine a route after automatic placement. They do not create
or redirect the underlying semantic relationship.

### 9.5 Named corridors and lanes

Dense diagrams often need stable connection corridors rather than a separate
collection of unrelated waypoints for every relationship. The proposed model
allows a corridor to be positioned relative to diagram elements and split into
lanes:

```c4ml
layout {
  corridor data-access-east {
    orientation = vertical
    anchor = right-of(cultivation-api, 56)
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
    strength = hard
  }

  route api-enqueues-notice {
    policy = guided
    style = orthogonal
    source-port = east
    corridor = data-access-east
    lane = 2
    strength = hard
  }
}
```

The compiler routes hard-guided and fixed paths first. Their occupied corridors
and lanes then become obstacles for remaining automatic paths. Two unrelated
relationships cannot silently occupy the same exclusive lane.

Shared trunks or junctions remain possible, but only when the author declares
that sharing deliberately. Automatic routing must not merge relationships just
to reduce the apparent number of lines.

### 9.6 Fixed routes and locked segments

Exact coordinates remain the final escape hatch:

```c4ml
layout {
  route exceptional-export {
    policy = fixed
    style = orthogonal
    points = [
      port(cultivation-api, south),
      (640, 720),
      (1180, 720),
      port(archive-vault, west)
    ]
  }
}
```

A guided route may instead lock only selected segments and leave its other
segments automatic. Hard guidance is never ignored or silently downgraded. If
it cannot be satisfied, compilation fails with all relevant source locations.

The future editor should display ports, corridors, lanes, waypoints, locked
segments, and relaxed soft rules in a routing-debug overlay. Moving a waypoint
or selecting a lane should create an explicit source edit rather than hidden
editor state.

The precise constraint, coordinate, and route grammar is especially provisional
and must be validated against real diagrams before acceptance.

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

The repository contains seven original syntax previews:

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
  larger model covering Containers, Components, Code, Dynamic behavior,
  Deployment, and every view type; and
- [`examples/draft/shape-marker.c4ml`](examples/draft/shape-marker.c4ml) — the
  restricted custom-shape contract and explicit cardinal Ports.

The bounded `hello-context.c4ml`, `hello-container.c4ml`,
`hello-static-zoom.c4ml`, `hello-dynamic.c4ml`, and `hello-deployment.c4ml`
subsets are part of the automated internal language gate. The other files, and
every construct outside those subsets, remain documentation artifacts. None of
these previews defines an accepted grammar or compatibility commitment.

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
