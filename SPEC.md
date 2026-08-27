# C4ML Specification

Status: Draft 0.9

Date: 2026-08-27

Working title: C4ML

This document defines the intended product and architectural boundaries. It is
not yet a frozen language grammar. Examples of concrete syntax must remain
non-normative until a grammar proposal has been reviewed and accepted.

The terms MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY express requirement
strength in this specification.

## 1. Product statement

C4ML is a compiler for software-architecture diagrams based on the C4 model.
It combines:

- a semantic architecture model;
- explicit, reusable views of that model;
- useful automatic layout;
- text-native constraints and manual layout overrides;
- controllable relationship routing;
- deterministic SVG and PNG output; and
- a local editor with source code and live graphical preview.

The primary differentiator is a hybrid layout model. Automatic layout provides
a good initial result, while authors retain precise and versionable control over
positions, alignment, ports, routes, waypoints, and labels.

## 2. Goals

C4ML MUST:

1. represent the complete official C4 abstraction and diagram family without
   reducing it to generic boxes;
2. keep the semantic model separate from views and presentation;
3. produce useful diagrams without mandatory coordinate work;
4. allow local intervention without disabling automatic layout globally;
5. keep unchanged parts of a diagram as stable as reasonably possible;
6. explain invalid references and conflicting layout requirements clearly;
7. generate standalone SVG and PNG files locally and reproducibly;
8. support source control through stable identifiers and deterministic output;
9. remain renderer- and layout-engine-independent internally;
10. expose one compiler implementation to both command-line and editor
    frontends; and
11. provide a two-pane editor with source code, diagnostics, and hot graphical
    preview as part of the MVP.

## 3. Non-goals for the first release

The first release will not attempt to provide:

- a general UML implementation;
- a clone or compatible dialect of PlantUML, Structurizr, Mermaid, D2, or
  LikeC4;
- import compatibility with another diagram language;
- direct manipulation that writes mouse operations back to source code;
- cloud hosting, accounts, or real-time collaboration;
- a required local or remote compiler service;
- automatic discovery of architecture from source code;
- animated or presentation-oriented diagrams;
- a complete icon marketplace; or
- arbitrary user scripting inside source files.

The complete C4 abstraction and diagram family is part of the minimum complete
release. Code, Dynamic, and Deployment views MUST NOT be deferred merely because
the official C4 guidance considers some diagram types situational.

## 4. Originality and prior-art policy

C4ML is an original design informed by capabilities and limitations observed in
existing tools.

The project MUST NOT copy or translate:

- source code;
- grammar productions or a tool's characteristic keyword system;
- documentation wording;
- example models or test fixtures;
- themes, icons, visual assets, or distinctive default styling; or
- user-interface layouts.

Research MUST be converted first into tool-independent observations and product
requirements. Concrete C4ML syntax and implementation MUST then be designed
from this specification.

Use of a third-party package is permitted only as an explicit dependency with a
documented purpose, license, and replacement boundary. Such use is integration,
not permission to reproduce the package's implementation in this repository.

### 4.1 Prior-art observations

The initial review is intentionally limited to public documentation and
observable behavior of C4, Structurizr, C4-PlantUML, Mermaid, LikeC4, D2,
Graphviz, ELK, and Penrose.

| Observation | C4ML requirement |
| --- | --- |
| C4 is notation-independent, but diagrams still need explicit scope, types, descriptions, relationships, and a legend. | C4 semantics and diagram readability are validated independently of the chosen visual theme. |
| Some model-as-code systems keep manual layout outside the authored DSL. | Layout decisions MUST be representable as reviewable text associated with a stable view. |
| Some systems require choosing between locked automatic layout and manual editing. | Automatic and manual mechanisms MUST coexist within one view. |
| Direction hints used as invisible relationships are difficult to reason about. | Layout constraints MUST be first-class and MUST NOT masquerade as architecture relationships. |
| Statement order is sometimes used implicitly to affect placement. | Source order MUST have no layout meaning unless a construct explicitly declares ordered placement. |
| Model-based projections avoid repeating the architecture for every diagram. | Views MUST select from a shared semantic model. |
| Rank and alignment constraints improve automatic results but do not provide exact routing. | C4ML MUST support both relational placement constraints and explicit route controls. |
| Generic graph engines expose useful ranks, ports, compound graphs, and routing modes, but engine-specific limitations leak into output. | The internal layout contract MUST normalize engine results and allow C4ML-owned post-processing. |
| Graph-layout systems use ports as explicit edge attachment points, while vector formats separate paths from their markers or arrow geometry. | C4ML MUST keep relationship semantics, endpoint ports, route geometry, and arrowheads as separate inspectable compiler objects. |
| Scalable vector formats map a stable local coordinate space onto varying output sizes. | Custom C4ML shapes MUST use a normalized renderer-neutral canvas with explicit content and port geometry. |
| Constraint-based systems demonstrate the value of separating meaning from visual realization. | Semantic objects, view selection, visual style, and geometry MUST be separate compiler stages. |
| Browser-screenshot PNG export adds a large and variable runtime dependency. | PNG SHOULD be derived directly from the canonical SVG without a headless browser. |

This table records requirements only. It does not define or endorse another
tool's syntax or implementation.

## 5. Domain model

### 5.1 Static element kinds

The first release MUST support:

- Person;
- Software System;
- Container;
- Component; and
- Code Element.

A Code Element MUST declare a code kind suitable for the implementation being
described, such as class, interface, object, function, module, database table,
or another explicitly named code-level construct. C4ML MUST NOT assume that all
software uses object-oriented classes.

Every element MUST have:

- a stable identifier;
- a kind;
- a human-readable name;
- a concise responsibility description; and
- an ownership or containment position where required by C4.

Every static element MUST support:

- tags;
- external/internal classification;
- documentation links; and
- arbitrary namespaced metadata that does not affect core semantics.

Every Container and Component MUST declare technology metadata. Code Elements
MAY declare language, namespace, module, signature, or other code-oriented
metadata. A Person or Software System MAY declare technology only when it is
meaningful and does not introduce inappropriate low-level detail.

### 5.2 Containment

Containment MUST follow the supported C4 hierarchy:

- a Software System MAY contain Containers;
- a Container MAY contain Components;
- a Component MAY contain Code Elements;
- a Person MUST NOT contain architecture elements; and
- arbitrary nesting MUST NOT be silently accepted as valid C4.

Visual groups and boundaries MUST be modeled separately from semantic C4
containment. A visual grouping MUST NOT change the semantic owner of an
element.

### 5.3 Relationships

A relationship MUST have:

- a stable identifier;
- a source element;
- a target element; and
- a description expressing intent in the direction of the relationship.

A relationship MUST be unidirectional. Its description MUST match its direction
and express a concrete intent or data flow. A vague label such as "Uses" SHOULD
produce a configurable quality warning.

A relationship between Containers MUST declare a technology or protocol.
Other relationships MAY declare technology or protocol information.

A relationship MAY also have:

- tags;
- a URL;
- presentation defaults; and
- multiple view-specific appearances.

Layout-only dependencies MUST NOT be represented as semantic relationships.

### 5.4 Dynamic interactions

A Dynamic Interaction represents an ordered occurrence of communication between
elements in the static model for a feature, story, use case, or scenario.

Each Dynamic Interaction MUST have:

- a stable identifier within its Dynamic View;
- an explicit order or order group;
- source and target static elements;
- a description matching its direction; and
- a reference to, or a validated derivation from, a static-model relationship.

Dynamic Views MUST support sequential and parallel interaction groups. Rendering
MUST support both collaboration-style diagrams with ordered interactions and
sequence-style diagrams without changing the underlying interaction semantics.

### 5.5 Deployment model

The deployment model MUST support:

- Deployment Environment;
- Deployment Node;
- Infrastructure Node;
- Software System Instance; and
- Container Instance.

A Deployment Environment MUST identify a concrete environment such as
development, staging, or production.

A Deployment Node represents a physical, virtual, containerized, or execution
environment where software runs. It MUST have a stable identifier, name,
description, and technology. Deployment Nodes MAY be nested.

An Infrastructure Node represents supporting infrastructure such as DNS, a
load balancer, firewall, message broker managed outside the modeled software, or
another operational facility. It MUST have a stable identifier, name,
description, and technology.

Software System Instances and Container Instances MUST reference their static
Software System or Container definitions rather than duplicating them. Each
instance MUST belong to exactly one Deployment Environment and be placed in a
Deployment Node. Multiple instances of the same static element MUST be allowed.

Deployment relationships MUST preserve or explicitly qualify the corresponding
static relationship. Environment-specific endpoints, protocols, and instance
counts MAY add detail without mutating the static model.

### 5.6 Stable identity

Identifiers MUST be explicit, unique in their defined namespace, and stable
across renames. The compiler MUST NOT derive persistent identity from source
order, display names, or generated sequence numbers.

Cross-file references MAY be supported, but their resolution and namespace
rules must be designed before multi-file source is accepted as stable.

### 5.7 C4 completeness profile

C4ML's default validation profile treats the official C4 notation
recommendations as minimum completeness requirements:

- every diagram has a title that names its type and scope;
- every diagram has a key or legend explaining its notation;
- every visible element states its C4 type explicitly;
- every element has a concise responsibility description;
- every Container and Component states its technology;
- every relationship is unidirectional and labelled consistently with its
  direction and intent;
- every relationship between Containers states its technology or protocol;
- acronyms and abbreviations are defined in the diagram legend or an associated
  glossary; and
- visual encodings such as color, shape, border, size, icon, line style, and
  arrowhead are consistent and explained.

The compiler MUST diagnose incomplete diagrams. A non-strict authoring mode MAY
downgrade selected completeness errors while drafting, but exported release
artifacts and the MVP acceptance suite MUST pass the complete profile.

## 6. Views

A view is a named, stable projection of the model. It MUST specify:

- a stable view identifier;
- a view type;
- a scope;
- a title naming the diagram type and scope;
- a concise purpose or description;
- intended-audience metadata;
- a generated or authored legend;
- included or excluded elements and relationships; and
- presentation and layout settings local to that view.

The first release MUST support all four static C4 views and all three supporting
C4 views:

- System Landscape views;
- System Context views;
- Container views; and
- Component views;
- Code views;
- Dynamic views; and
- Deployment views.

Each rendered diagram MUST make its type and scope understandable. It MUST
include a title and a generated or authored legend.

A view MUST NOT duplicate semantic element definitions. A model element MAY
appear differently in different views without changing its identity.

### 6.1 System Landscape View

The scope is an enterprise, organization, department, portfolio, or another
explicitly named collection. Primary elements are People and Software Systems
relevant to that scope. No single Software System is treated as the focal
system.

### 6.2 System Context View

The scope is exactly one focal Software System. The primary element is that
Software System. Supporting elements are directly connected People and Software
Systems. Container, Component, Code, and deployment detail MUST NOT appear.

### 6.3 Container View

The scope is exactly one Software System. Primary elements are its Containers.
Supporting elements are directly connected People and Software Systems.
Components, Code Elements, and deployment detail MUST NOT appear.

### 6.4 Component View

The scope is exactly one Container. Primary elements are its Components.
Supporting elements may include other Containers in the same Software System
and directly connected People and Software Systems. Code and deployment detail
MUST NOT appear.

### 6.5 Code View

The scope is exactly one Component. Primary elements are Code Elements within
that Component. A Code View MAY use a class-, entity-relationship-, module-, or
another code-appropriate visual vocabulary, but it MUST remain connected to the
same semantic and rendering pipeline.

C4ML MUST support explicitly authored Code Elements. Automatic source-code
discovery remains outside the first release; a future importer may populate the
same model without changing Code View semantics.

### 6.6 Dynamic View

The scope is one explicitly named feature, story, use case, or scenario.
Elements are references to Software Systems, Containers, or Components in the
static model. The view MUST preserve interaction ordering and MUST support both
collaboration and sequence presentations of the same interaction data.

A Dynamic View SHOULD choose a coherent abstraction level. Mixing levels MUST
produce a quality diagnostic unless the author explicitly acknowledges the
choice.

### 6.7 Deployment View

The scope is one Deployment Environment and one or more Software Systems. The
view contains Deployment Nodes, Software System Instances, Container Instances,
and relevant Infrastructure Nodes. Nested Deployment Nodes MUST be supported.
Every instance shown MUST resolve to the static model.

### 6.8 C4 recommendation and audience metadata

C4ML MUST retain the official usage guidance without preventing authors from
using any supported view:

- System Context and Container Views are recommended for every software
  development team;
- System Landscape Views are recommended particularly for larger
  organizations or portfolios;
- Deployment Views are recommended;
- Component Views are situational and should be created only when they add
  value;
- Dynamic Views should be used sparingly for important or complicated runtime
  interactions; and
- Code Views should focus on important or complex Components and are preferably
  generated on demand for long-lived documentation.

Each view type MUST provide a sensible default intended audience based on the C4
guidance. Authors MAY refine that metadata. The editor and validator SHOULD make
the recommendation visible as guidance, not as a prohibition.

The default intended audiences are:

- System Landscape: technical and non-technical people inside and outside the
  organization or development team;
- System Context: everybody, technical and non-technical, inside and outside the
  development team;
- Container: technical people, including architects, developers, and
  operations/support staff;
- Component and Code: software architects and developers;
- Dynamic: technical and non-technical people inside and outside the development
  team; and
- Deployment: technical people, including software and infrastructure
  architects, developers, and operations/support staff.

### 6.9 Visual groups

A Visual Group is a view-local boundary for organizing already visible diagram
items. It MUST NOT change C4 ownership, containment, classification, identity,
or view eligibility. Adding or removing a group around otherwise unchanged
items MUST leave the resolved semantic elements and relationships unchanged.

Every Visual Group MUST have:

- an identifier unique within its view;
- a human-readable title;
- one or more direct members; and
- deterministic member ordering after resolution.

A group MAY contain visible static elements, Deployment Nodes, Infrastructure
Nodes, deployment instances, or nested Visual Groups when those item kinds are
valid for the containing view. Relationships are not group members; they cross
group boundaries through the routing model.

Groups MAY be nested but MUST form an acyclic, non-overlapping forest in the
first release. A diagram item or nested group may have only one direct parent
group within a view. A larger boundary MUST contain a smaller group rather than
repeat that smaller group's members. A group reference MUST NOT import an item
that the view's normal scope and selection rules did not already make visible.

Group layout defaults to keeping its contents together with finite,
non-negative padding. Layout and routing MUST treat the effective group boundary
as an obstacle or port-bearing boundary where configured. The resolved group
tree, membership, padding, and presentation metadata MUST remain inspectable
before scene generation.

A generated legend MUST explain the Visual Group boundary. An authored legend
MUST explain any non-default group styling. A Visual Group remains presentation
metadata even when its title represents a department, capability, suite, or
other real-world classification.

## 7. Source-language design requirements

The grammar is deliberately deferred. Any proposal MUST satisfy these rules:

1. Common C4 models remain concise and readable without hidden defaults that
   change meaning.
2. Model, view, style, and layout constructs are visually distinguishable.
3. References produce source-located diagnostics.
4. Formatting and comments can be preserved or regenerated consistently.
5. Adding whitespace, comments, or unrelated declarations does not change
   geometry.
6. Layout constructs read as layout instructions, not fake relationships.
7. Relative constraints are easier to express than raw coordinates.
8. Exact coordinates and route points remain available as an escape hatch.
9. The grammar is original and is not intentionally source-compatible with an
   existing DSL.
10. The language has an explicit versioning strategy before its first stable
    release.

The provisional file extension is `.c4ml`. The working title and extension must
be checked before a public release.

## 8. Layout model

### 8.1 General behavior

Every view begins with an automatic or fixed layout policy. Automatic layout
MUST produce a complete candidate geometry before C4ML applies author-supplied
constraints and routing rules.

The pipeline MUST treat layout as several explicit phases:

1. measure elements and labels;
2. generate coarse ranks and positions;
3. solve placement constraints;
4. assign or honor ports;
5. route relationships;
6. place relationship labels;
7. resolve or report remaining collisions; and
8. normalize the canvas and coordinates.

### 8.2 Placement controls

The design MUST be able to express:

- overall flow direction;
- rank and sibling separation;
- relative placement such as left/right/above/below;
- same-row and same-column membership;
- horizontal and vertical alignment;
- ordering within a rank or group;
- minimum gaps;
- preferred proximity;
- fixed position;
- fixed or bounded size; and
- movement relative to an automatically chosen position.

Relative constraints SHOULD be preferred in documentation and diagnostics
because they survive diagram growth better than absolute coordinates.

### 8.3 Constraint strengths

Constraints MUST have explicit semantics:

- a hard constraint must be satisfied or compilation fails;
- a soft constraint may be relaxed, but the compiler reports the relaxation in
  diagnostic output when requested; and
- an automatic preference is engine guidance, not a user guarantee.

The compiler MUST NOT silently reinterpret a hard constraint as a soft one.
Conflicting hard constraints MUST identify all relevant source locations.

### 8.4 Ports

Relationships MUST be attachable to named or geometric ports. The initial port
model MUST at least cover `north`, `east`, `south`, `west`, and an automatic
choice. Public C4ML contracts MUST use these compass names consistently rather
than mixing them with renderer-oriented top/right/bottom/left terminology.

The author MUST be able to control source and target ports independently. Port
selection MUST be view-specific unless the model explicitly defines a semantic
interface in a future extension.

A Port is the resolved attachment point of one relationship appearance on one
diagram item. It MUST retain its owner, source/target role, cardinal side, and
effective point. A Port is not a Relationship and MUST NOT carry architectural
intent. The term "connector" MAY appear as an editor affordance, but it is not a
core semantic type because it can ambiguously mean a port, a relationship, or a
drawn line.

### 8.5 Routing

Routing MUST support three authorship policies independently of the geometric
route style:

- `automatic`: the router chooses all ports and segments;
- `guided`: the author fixes or prefers selected ports, corridors, lanes,
  waypoints, avoidance regions, or segments while the router completes the
  remaining path; and
- `fixed`: the author supplies the complete route and the compiler validates it
  without silently replacing it.

The first release MUST support:

- direct routes;
- orthogonal routes;
- automatic routes;
- author-supplied waypoints;
- named route corridors with independently selectable lanes;
- partial waypoints and locked segments that leave other segments automatic;
- avoidance of element interiors and configured boundaries; and
- hard and soft avoidance regions;
- independent placement of the relationship label on a selected route segment;
  and
- view-local crossing and parallel-path preferences.

A manually specified route MUST remain associated with stable relationship and
view identifiers. Waypoints SHOULD be expressible relative to elements, ports,
or the view canvas; raw canvas coordinates remain available when exact output
is required.

Symbolic and relative route guidance SHOULD be preferred over raw coordinates
because it survives local diagram changes. A corridor MUST have stable identity,
orientation, capacity or lane spacing, and a position derived from elements,
boundaries, or explicit coordinates. Assigning relationships to different lanes
within one corridor MUST prevent them from collapsing into an unreadable shared
line.

The router MUST treat author controls as input, not as suggestions inferred
after routing. It MUST route hard-guided and fixed relationships before using
their occupied space as an obstacle for remaining automatic relationships. A
hard port, corridor, lane, waypoint, avoidance, or segment rule that cannot be
satisfied MUST fail with source-located diagnostics. Soft guidance MAY be
relaxed only with an explicit diagnostic when requested.

Automatic rerouting after a model change MUST preserve unchanged hard controls
and SHOULD keep unrelated guided segments stable. It MUST NOT reroute every
relationship merely because one local edge or element changed.

The route model MUST preserve the difference between intentional shared paths,
parallel paths, crossings, and junctions. Shared trunks and junctions MUST be
explicit author decisions; the router MUST NOT merge semantic relationships
solely to reduce visual crossings.

Ports, corridors, lanes, waypoints, locked segments, and relaxed constraints
MUST remain inspectable before SVG serialization. The editor SHOULD provide a
debug overlay for these objects so an author can understand why a path was
chosen.

### 8.6 Stability

For an unchanged view and configuration, geometry MUST be deterministic.

When a model change does not affect a local region, the layout SHOULD minimize
movement in that region. This stability goal is subordinate to hard constraints
and collision avoidance, but it is a product requirement rather than an
accidental property of a selected layout engine.

## 9. Compiler architecture

The intended architecture is:

1. source text;
2. concrete syntax tree and typed abstract syntax tree;
3. validated semantic model;
4. resolved view graph;
5. engine-neutral layout request;
6. candidate geometry from a layout adapter;
7. C4ML constraint and routing stages;
8. renderer-neutral scene graph; and
9. output renderers.

No renderer or layout adapter may become the canonical semantic model.

### 9.1 Accepted runtime baseline

The accepted runtime baseline is a TypeScript monorepo with one portable
compiler core. The core MUST run directly under Node.js for the CLI and inside a
Web Worker for the editor. CLI and editor MUST NOT have separate parser,
semantic, layout, routing, or scene-generation implementations.

The accepted Phase 0 toolchain is:

- the active Node.js 24 LTS line as the minimum development and CLI baseline;
- a pnpm workspace with the package-manager version pinned in the repository;
- strict TypeScript using ECMAScript modules; and
- Vitest for the initial unit and adapter-contract tests.

C4ML is licensed under Apache License 2.0. Third-party dependencies retain
their own licenses and MUST remain behind the boundaries recorded in
`DEPENDENCIES.md`.

The compiler core MUST NOT depend on the DOM, Node.js filesystem APIs, process
state, or a network service. Environment-specific behavior belongs behind small
adapters at the frontend boundary.

The MVP MUST NOT require Python, a Python service, or any other background
service. Python or native/Wasm modules MAY be evaluated later as replaceable
algorithm adapters only after a measured need is demonstrated.

The CLI is a thin Node.js frontend over the compiler API. The editor is a
TypeScript application that invokes the same compiler API in a browser worker.
Packaging the CLI as a standalone executable MAY be considered later without
changing compiler semantics.

Candidates accepted for validation in the Phase 0 technical spike:

- Langium for grammar, typed AST, references, validation, and later language
  tooling;
- ELK.js as the first replaceable automatic-layout adapter;
- a C4ML-owned constraint, port, routing, and label-placement layer;
- a C4ML-owned SVG scene renderer; and
- resvg-js or an equivalent non-browser renderer for SVG-to-PNG conversion.

Langium, ELK.js, and resvg-js are not yet permanent dependency decisions. The
spike must verify license, installation footprint, deterministic behavior,
browser independence, and the ability to override or replace each candidate.
Passing a Phase 0 spike permits continued prototyping but does not make a
candidate part of C4ML's public semantic model or freeze the source grammar.

### 9.2 Phase 1 semantic and view contract

The implemented Phase 1 compiler core owns parser-independent TypeScript
contracts for static C4 elements, relationships, deployment data, Dynamic
Interactions, and all seven view types. These contracts are the translation
target for a future parser; they are not a proposal for concrete C4ML syntax.

Semantic objects and diagnostics carry optional source references. When source
information is available, diagnostics retain the originating file and range as
well as related declaration locations. Stable diagnostic codes identify
containment, reference, relationship, deployment, Dynamic, and view-selection
failures independently of message wording.

View resolution MUST:

- reject a semantically invalid architecture model before creating projections;
- preserve references to the original semantic objects rather than cloning or
  redefining them per view;
- apply the primary and supporting-element rules in Section 6;
- order resolved collections deterministically by stable identifiers, with
  Dynamic Interactions ordered first by occurrence order;
- expose title, purpose, scope, legend, intended audience, and C4 usage guidance
  to downstream compiler stages;
- keep collaboration and sequence display choices separate from Dynamic
  Interaction semantics; and
- keep deployment instances linked to their static Software System or Container
  identity.

Authored include and exclude selections may narrow a valid projection, but MUST
NOT admit elements or relationships from an illegal C4 level or remove a
required focal element. Layout and presentation settings remain view-local and
MUST NOT mutate the semantic model.

### 9.3 Phase 1 rendering slice

The first implemented rendering slice accepts the parser-neutral model and view
contracts rather than `.c4ml` source. It resolves one view, creates an
engine-neutral layout request, invokes a replaceable layout adapter, resolves
effective routes, creates a renderer-neutral scene graph, and serializes a
standalone SVG. A Node.js adapter can rasterize that exact SVG to PNG.

The automatically and visually validated reference path currently covers one
original Container View with a Software System boundary, a nested Visual Group,
internal Containers, external supporting elements, labelled relationships,
automatic routes, guided cardinal ports, one named corridor with lane
selection, explicit label-segment selection, view-local label offsets, and an
original semantic color theme. Fixed orthogonal routes are structurally
validated in the compiler-core suite.

The implemented internal contract represents every effective relationship
appearance as two explicit Ports, one Route, and one Arrowhead. The Route owns
the path and label placement; the Arrowhead owns its final geometry. The SVG
renderer serializes those scene objects rather than reconstructing attachment
or arrow geometry from semantic Relationships.

The internal shape contract is also implemented for built-in and caller-supplied
renderer-neutral vector shapes. It uses a normalized 100 x 100 canvas, an
explicit text content box, four cardinal port anchors, semantic paint roles,
and a restricted primitive set. The original `c4ml-person` and `c4ml-box`
shapes exercise this contract. The author-facing shape grammar remains draft.

These types are internal compiler contracts, not accepted `.c4ml` grammar. The
current slice intentionally does not claim complete placement constraints,
relative waypoints, avoidance regions, locked segments, route-junction
authorship, complete all-view rendering evidence, a frozen author-facing theme
grammar, geometry-affecting style tokens, or a bundled font. The ELK.js and
resvg-js implementations remain candidate adapters behind the accepted
engine-neutral boundaries.

## 10. Scene graph and rendering

The scene graph MUST represent at least:

- canvas and metadata;
- boundaries and groups;
- elements;
- ports;
- relationship paths and arrowheads;
- text and labels;
- legend entries; and
- accessibility metadata.

The relationship rendering chain is:

```text
source element -> source Port -> Route -> target Port -> target element
                                      -> Arrowhead
```

The semantic Relationship remains upstream of this chain. Ports, Routes, and
Arrowheads describe one view-specific visual appearance and MUST NOT be written
back as replacement semantic Relationships.

SVG is the canonical first output. The SVG renderer MUST:

- produce standalone valid SVG;
- avoid network-fetched assets;
- use stable IDs;
- provide a deterministic element order;
- preserve selectable text where practical;
- encode diagram title and description metadata; and
- avoid browser-only constructs unless an explicit output profile allows them.

PNG MUST be rendered from the same scene/SVG result. PNG generation MUST NOT
silently change layout, fonts, wrapping, or label positions.

Fonts used for reproducible rendering MUST be explicitly configured. Test
fixtures MUST not depend on whatever fonts happen to be installed on a machine.

## 11. Shapes, styles, and themes

### 11.1 Shape contract

Person MUST have a dedicated built-in shape. Other C4 element roles MAY share a
box shape by default while retaining distinct type labels and semantic theme
tokens. Shape selection MUST NOT change the element's C4 kind, ownership,
identity, validation, or view eligibility.

C4ML MUST allow additional shapes to be defined without accepting arbitrary
SVG or executable drawing code. A shape definition MUST contain:

- a stable identifier;
- a normalized 100 x 100 local canvas;
- a content box reserved for title, type, technology, and description;
- one explicit anchor for each `north`, `east`, `south`, and `west` Port; and
- one or more renderer-neutral primitives using semantic paint roles.

The initial safe primitive set consists of rectangles, ellipses, polygons, and
lines. Shape definitions MUST NOT contain scripts, event handlers, CSS, fonts,
filters, network references, embedded images, or renderer-specific markup.
Every coordinate MUST be finite and inside the normalized canvas. Cardinal
Port anchors MUST lie on their declared canvas side. Invalid shapes MUST fail
with stable diagnostics before layout or rendering.

Shape paint roles initially consist of `surface`, `accent`, and `detail`.
Themes resolve their colors; custom shapes MUST NOT embed fixed colors. The
resolved shape identifier, content box, primitives, and Ports MUST remain
inspectable in the prepared diagram and scene graph.

Custom shapes are presentation definitions, not custom C4 element kinds. A
legend MUST continue to state the underlying C4 type, and strict C4 validation
MUST behave identically before and after a shape assignment.

### 11.2 Styles and themes

The first release MUST include an original, accessible default theme. It MUST
not imitate the distinctive defaults of another C4 tool.

Themes MUST use semantic tokens rather than one undifferentiated internal
element color. The first-release color model MUST distinguish at least Person,
Software System, Container, Component, Code Element, Software System Instance,
Container Instance, Infrastructure Node, scope boundary, Visual Group,
Deployment Node, relationship policy, and internal/external element state.
Those roles describe presentation targets; they MUST NOT replace or redefine
the semantic model.

C4ML MAY use a familiar dark-to-light color progression across C4 abstraction
levels, but bundled palettes MUST be original project assets. No color palette
is required for C4 conformance. Every bundled preset MUST preserve explicit
type labels and an explanatory legend, and its normal-sized text MUST have a
contrast ratio of at least 4.5:1 against its background.

The compiler-core theme contract MUST support named built-in presets and deep,
token-level overrides. Selecting a preset, changing one role, or changing one
relationship color MUST leave all unspecified tokens inherited from the base
theme. Unknown presets and malformed color values MUST fail with stable
diagnostics. Resolved theme identifiers, element roles, and internal/external
states MUST remain inspectable in the scene graph and SVG.

Style precedence must be explicit. The proposed order, from weakest to strongest,
is:

1. renderer defaults;
2. selected theme;
3. kind/tag rules;
4. model-element defaults; and
5. view-local overrides.

Style changes MUST NOT alter semantic validity. Geometry-affecting style values
such as font size, padding, and border width must be resolved before layout.

## 12. Diagnostics

Diagnostics MUST contain:

- severity;
- stable diagnostic code;
- concise message;
- source file and range;
- related ranges where a conflict spans declarations; and
- an actionable correction when one is known.

The compiler MUST distinguish syntax errors, unresolved references, C4 semantic
errors, unsatisfied layout constraints, routing failures, rendering failures,
and environment/dependency failures.

Warnings MUST NOT be used for conditions that make the requested output
incorrect or nondeterministic.

## 13. Command-line interface

The first CLI is expected to support the following capabilities; command names
remain provisional:

- validate source without rendering;
- render one view or all views;
- select SVG, PNG, or both;
- choose output directory and scale;
- emit human-readable or machine-readable diagnostics;
- report the effective compiler and language version; and
- run without network access.

Successful validation and successful rendering MUST use distinct, documented
exit behavior from source, layout, rendering, and environment failures.

## 14. Editor

### 14.1 MVP editor

The MVP editor MUST provide:

- a source-code pane;
- a graphical SVG preview pane;
- hot compilation after source changes;
- source-located diagnostics;
- retention of the last valid preview while the current source is invalid;
- cancellation or rejection of stale compilation results;
- zoom, pan, and fit-to-view controls;
- SVG and PNG export through the same compiler/rendering contracts as the CLI;
- navigation from source declarations to preview elements; and
- navigation from preview elements to source declarations.

Compilation and language processing MUST run outside the browser UI thread.
The editor MUST remain responsive while a compile is in progress.

### 14.2 Source-to-graphics mapping

The compiler MUST preserve a traceable mapping between source ranges, syntax
nodes, stable semantic IDs, scene-graph nodes, and SVG elements. This mapping is
required for diagnostics and navigation in the MVP and for direct manipulation
in a later release.

### 14.3 Future direct manipulation

Later editor versions MAY allow moving elements, aligning selections, choosing
ports, editing routes, and creating semantic elements or relationships.

The source text MUST remain the source of truth. A graphical operation must
produce an explicit, undoable source edit rather than hidden editor-only state.
Layout operations and semantic architecture operations MUST be distinct tools.
The editor SHOULD use minimal syntax-aware text edits that preserve comments and
unrelated formatting.

Direct manipulation is not an MVP acceptance requirement, but the compiler and
source mapping MUST NOT preclude it.

## 15. MVP acceptance criteria

The MVP is accepted only when all of the following are demonstrated with
original fixtures:

1. One shared model produces System Landscape, System Context, Container,
   Component, Code, Dynamic, and Deployment views.
2. Invalid C4 containment and broken references produce source-located errors.
3. Automatic layout renders a nontrivial nested architecture without element
   overlap.
4. Relative placement and alignment constraints coexist with automatic layout.
5. One element can be pinned without forcing the entire view into manual mode.
6. A relationship can select ports and combine automatic orthogonal routing
   with author-supplied waypoints.
7. Contradictory hard constraints fail with a clear multi-location diagnostic.
8. Identical inputs produce byte-stable normalized SVG and visually stable PNG.
9. Adding comments or reformatting source does not alter output geometry.
10. SVG and PNG contain the same elements, labels, routes, and bounds.
11. The CLI operates locally and does not require a browser or network service.
12. All requirements in `TESTING.md` for an MVP change pass.
13. The editor uses the same compiler core as the CLI and produces equivalent
    diagnostics, geometry, and SVG for the same effective input.
14. The editor hot-compiles in a worker, rejects stale results, retains the last
    valid preview on errors, and supports navigation between source and preview.
15. The complete C4 profile enforces titles, legends, element descriptions,
    Container and Component technologies, unidirectional labelled
    relationships, and protocols on Container-to-Container relationships.
16. Dynamic Views render the same ordered interactions in collaboration and
    sequence presentations.
17. Deployment Views render nested Deployment Nodes, Infrastructure Nodes, and
    multiple instances that resolve to the static model.
18. Code Views render explicitly modeled code-level constructs inside one
    Component without requiring automatic source-code discovery.
19. Every view carries its purpose, intended audience, and official C4 usage
    guidance in compiler-visible metadata.

## 16. Open design decisions

The following decisions remain deliberately open:

- final project name and source extension;
- exact source grammar and formatting rules;
- editor UI framework and code-editor component;
- single-file versus optional sidecar layout organization;
- namespace and multi-file merge rules;
- whether custom element kinds are allowed in strict C4 mode;
- precise units and coordinate systems;
- the first constraint-solving strategy;
- whether C4ML owns the full orthogonal router in the MVP or initially wraps a
  replaceable routing engine;
- bundled font choice and redistribution terms;
- the accessibility target for generated SVG.

The project license and initial distribution decision are accepted: C4ML is an
open-source project under Apache License 2.0. Packaging formats and release
channels remain open implementation decisions.

## 17. Sources consulted for capability analysis

These sources establish observed capabilities and limitations only. They are
not source material for C4ML syntax or implementation.

- C4 model abstractions, notation, and review checklist:
  <https://c4model.com/abstractions>,
  <https://c4model.com/diagrams/notation>,
  <https://c4model.com/diagrams/checklist>
- Complete C4 diagram family:
  <https://c4model.com/diagrams>,
  <https://c4model.com/diagrams/system-context>,
  <https://c4model.com/diagrams/container>,
  <https://c4model.com/diagrams/component>,
  <https://c4model.com/diagrams/code>,
  <https://c4model.com/diagrams/system-landscape>,
  <https://c4model.com/diagrams/dynamic>,
  <https://c4model.com/diagrams/deployment>
- Structurizr DSL and layout documentation:
  <https://docs.structurizr.com/dsl/language>,
  <https://docs.structurizr.com/ui/diagrams/manual-layout>,
  <https://docs.structurizr.com/ui/diagrams/automatic-layout>
- C4-PlantUML layout documentation:
  <https://github.com/plantuml-stdlib/C4-PlantUML/blob/master/LayoutOptions.md>
- Mermaid C4 and architecture diagrams:
  <https://mermaid.js.org/syntax/c4.html>,
  <https://mermaid.js.org/syntax/architecture.html>
- LikeC4 views and layout predicates:
  <https://likec4.dev/dsl/views/>,
  <https://likec4.dev/dsl/views/predicates/>
- D2 position and export documentation:
  <https://d2lang.com/tour/positions/>,
  <https://d2lang.com/tour/exports/>
- Graphviz attributes and SVG output:
  <https://graphviz.org/doc/info/attrs.html>,
  <https://graphviz.org/docs/attr-types/portPos/>,
  <https://graphviz.org/docs/outputs/svg/>
- Eclipse Layout Kernel layered algorithm and routing options:
  <https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html>,
  <https://eclipse.dev/elk/reference/options/org-eclipse-elk-edgeRouting.html>,
  <https://eclipse.dev/elk/reference/options/org-eclipse-elk-portConstraints.html>
- SVG coordinate systems and the `viewBox` model:
  <https://www.w3.org/TR/SVG/coords.html>
- Penrose separation of domain, substance, and style:
  <https://penrose.cs.cmu.edu/docs/ref>,
  <https://penrose.cs.cmu.edu/docs/ref/substance/overview>,
  <https://penrose.cs.cmu.edu/docs/ref/style/overview>
