# C4thedral Specification

Status: Draft 0.46

Date: 2026-08-31

Product name: C4thedral

Language and compiler name: C4ML

This document defines the intended product and architectural boundaries. It is
not yet a frozen language grammar. Examples of concrete syntax must remain
non-normative until a grammar proposal has been reviewed and accepted.

The terms MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY express requirement
strength in this specification.

## 1. Product statement

C4thedral is a local architecture workbench powered by C4ML, its
model-and-diagram language and compiler for software architecture based on the
C4 model. Together they combine:

- a semantic architecture model;
- explicit, reusable views of that model;
- useful automatic layout;
- text-native constraints and manual layout overrides;
- controllable relationship routing;
- deterministic SVG and PNG output; and
- a local editor with source code and live graphical preview.

The first implemented differentiator is a hybrid layout model. Automatic layout
provides a good initial result, while authors retain precise and versionable
control over positions, alignment, ports, routes, waypoints, and labels.

### 1.1 Accepted strategic product pillars

**Status: Accepted product direction; detailed public contracts remain draft.**

C4ML is intended to grow from a model-and-diagram compiler into an explainable,
versionable architecture compiler. Three connected product pillars guide that
development after the current compiler foundation:

1. **Intent-based authoring.** Graphical operations express architecture or
   layout intent and produce explicit, reviewable, undoable source edits. The
   source remains authoritative; the editor MUST NOT persist hidden geometry or
   private architecture state. Automatic layout, semantic placement, relative
   adjustment, exact positioning, and route guidance remain distinguishable so
   the compiler can explain why an element or route has its effective geometry.
2. **Semantic architecture evolution.** C4ML compares validated architecture
   states by stable identity rather than by text lines or rendered pixels. It
   distinguishes semantic, view, deployment, presentation, and layout changes;
   ignores formatting-only differences; and SHOULD preserve unchanged geometry
   so a visual comparison shows architecture change instead of layout noise.
   Version-control access remains a frontend adapter over the portable
   comparison contract.
3. **Architecture proof.** Deterministic rules and graph queries evaluate what
   the architecture claims, which elements and paths are affected, and why a
   finding exists. Findings retain stable rule identity, affected semantic
   identities, evidence, and source locations. Suggested corrections, when
   available, are proposed source edits rather than direct model mutation.
   External observations or repository evidence enter through replaceable
   adapters and MUST NOT silently overwrite authored source.

These pillars share the existing stable-identity, source-location, diagnostic,
worker, CLI-parity, and deterministic-output foundations. Optional AI MAY help
authors phrase questions or proposed edits, but it MUST NOT replace compiler
validation, deterministic comparison, or rule evaluation.

### 1.2 Product and technical naming

**Status: Accepted.**

The visible product name is **C4thedral**. Application chrome, window titles,
native menus, About copy, development wrappers, executables, installers, and
archives MUST use that exact spelling.

**C4ML** remains the technical name of the language, source format, compiler,
CLI, package namespace, diagnostic family, worker and desktop contracts, and
other compatibility-sensitive identifiers. Existing `.c4ml` documents,
settings records, application data, scripts, and integrations MUST NOT require
migration solely because the workbench product was renamed.

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
- a complete icon marketplace;
- arbitrary user scripting inside source files; or
- a standalone web-hosted or browser-delivered editor.

The first-release product is the Electron desktop application. Angular,
Monaco, and Web Workers are implementation technologies inside its sandboxed
renderer, not a second browser product or deployment target.

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

| Observation                                                                                                                                        | C4ML requirement                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| C4 is notation-independent, but diagrams still need explicit scope, types, descriptions, relationships, and a legend.                              | C4 semantics and diagram readability are validated independently of the chosen visual theme.                                    |
| Some model-as-code systems keep manual layout outside the authored DSL.                                                                            | Layout decisions MUST be representable as reviewable text associated with a stable view.                                        |
| Some systems require choosing between locked automatic layout and manual editing.                                                                  | Automatic and manual mechanisms MUST coexist within one view.                                                                   |
| Direction hints used as invisible relationships are difficult to reason about.                                                                     | Layout constraints MUST be first-class and MUST NOT masquerade as architecture relationships.                                   |
| Statement order is sometimes used implicitly to affect placement.                                                                                  | Source order MUST have no layout meaning unless a construct explicitly declares ordered placement.                              |
| Model-based projections avoid repeating the architecture for every diagram.                                                                        | Views MUST select from a shared semantic model.                                                                                 |
| Rank and alignment constraints improve automatic results but do not provide exact routing.                                                         | C4ML MUST support both relational placement constraints and explicit route controls.                                            |
| Generic graph engines expose useful ranks, ports, compound graphs, and routing modes, but engine-specific limitations leak into output.            | The internal layout contract MUST normalize engine results and allow C4ML-owned post-processing.                                |
| Graph-layout systems use ports as explicit edge attachment points, while vector formats separate paths from their markers or arrow geometry.       | C4ML MUST keep relationship semantics, endpoint ports, route geometry, and arrowheads as separate inspectable compiler objects. |
| Scalable vector formats map a stable local coordinate space onto varying output sizes.                                                             | Custom C4ML shapes MUST use a normalized renderer-neutral canvas with explicit content and port geometry.                       |
| Constraint-based systems demonstrate the value of separating meaning from visual realization.                                                      | Semantic objects, view selection, visual style, and geometry MUST be separate compiler stages.                                  |
| Browser-screenshot PNG export adds a large and variable runtime dependency.                                                                        | PNG SHOULD be derived directly from the canonical SVG without a headless browser.                                               |
| Users of model-as-code tools request graphical control without losing changes, fighting stale connection controls, or abandoning automatic layout. | Graphical operations MUST become explicit source intent, and C4ML SHOULD explain the effective controls behind geometry.        |
| Architecture authors request before/after, migration, and Git-oriented visual comparisons, while text and pixel diffs obscure semantic change.     | C4ML SHOULD compare normalized architecture states by stable identity and separate architectural change from layout movement.   |
| Existing tools can highlight tagged perspectives, but visual classification alone does not prove that architecture constraints hold.               | C4ML SHOULD provide deterministic, source-located rules and impact queries over the validated architecture graph.               |

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

Cross-file references use the project and namespace rules in Section 7.1.
Moving a declaration between project documents MUST NOT change its stable
identity.

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

### 7.1 Project and multi-document source contract

**Status: Accepted and implemented foundation for architecture source
documents, the portable compiler contract, language package, CLI, compiler
worker, and desktop editor.**

The project is the compilation unit, a source document is the editing unit, and
a View is an output unit. A project MUST produce one validated architecture
model and one set of resolved Views regardless of how declarations are divided
among its source documents.

A single `.c4ml` file remains an implicit project. Opening or compiling it MUST
require no manifest, module declaration, or namespace knowledge. A directory
containing exactly one root-level `.c4ml` file and no manifest is the equivalent
implicit project.

An explicit multi-document project uses `c4ml.project.json`. Its version-one
manifest contains:

- `version`, which is exactly `1`;
- a stable non-empty project `id`;
- optional non-empty `name` and `description` text;
- a non-empty explicit `sources` list; and
- an optional `policy` path naming one local version-one architecture-policy
  resource; and
- an optional `observations` path naming one local version-one architecture-
  observation resource; and
- an optional `glossary` path naming one local version-one architecture
  glossary; and
- an optional non-empty `narratives` list naming local version-one architecture
  narrative chapters; and
- an optional `publication` path naming one local version-one publication
  resource; and
- an optional `theme` path naming one local version-one semantic diagram theme;
- an optional `shapes` path naming one local version-one safe shape catalogue;
  and
- an optional `assets` path naming one local version-one licensed passive-asset
  manifest.

Source entries are normalized forward-slash paths relative to the project
directory. Absolute paths, URI schemes, backslashes, empty segments, `.` or
`..` segments, duplicate entries, paths escaping through symbolic links, and
remote sources MUST be rejected. A policy path follows the same containment
rules, is unique within the project, and MUST end in `.c4ml-policy.json`. An
observation path follows the same containment and uniqueness rules and MUST end
in `.c4ml-observations.json`. A glossary path follows those rules and MUST end
in `.c4ml-glossary.json`. Narrative paths follow those rules, are unique, and
MUST end in `.c4ml-narrative.md`.
A publication path follows the same rules and MUST end in
`.c4ml-publication.json`.
A theme path follows the same rules and MUST end in `.c4ml-theme.json`.
A shape path follows the same rules and MUST end in `.c4ml-shapes.json`.
An asset-manifest path follows the same rules and MUST end in
`.c4ml-assets.json`.
Version one intentionally has no globs,
network imports, transitive project dependencies, or source-order precedence.
The manifest and every source required for compilation MUST be available
offline.

Every architecture source retains the normal C4ML language header. In an
explicit project it MAY contain any subset of the currently executable top-level
model, relationship, deployment, and View blocks. Completeness is assessed over
the merged project, not independently per fragment. A source fragment does not
textually include or paste another fragment.

All documents contribute additively to the existing typed semantic namespaces.
Identifiers remain unique within the namespace defined by their semantic kind
and scope. A filename or declaration order MUST NOT become part of stable
identity. Duplicate declarations MUST fail with source information for every
involved document; no declaration silently overrides another. Cross-document
references obey the same target-type and scope rules as references inside one
document.

The portable compiler core receives a versioned `ArchitectureProjectInput`
containing project metadata, a deterministic URI-sorted set of source
documents, and the optional raw local policy, observation, glossary, and
narrative, publication, theme, shape, and asset resources. It MUST NOT open
files itself. CLI, Electron, and renderer adapters load documents and enforce
their environment's path and access rules.
Diagnostics and navigation retain project-relative source URIs.

The desktop editor opens an explicit project directory through its native
bridge, presents the manifest-selected sources in a project explorer and source
tabs, and compiles the complete in-memory project after an edit. Each document
retains its own source buffer, opaque native handle, dirty marker, Monaco text
model, undo history, cursor, and scroll state; the native close guard reflects
aggregate project dirtiness. Save and Save As act on the active document. Save
All writes every dirty document sequentially through the same validated
opaque-handle bridge, preserves successful writes if a later write fails or is
canceled, and leaves every unsaved document visibly dirty. Diagnostics and
preview navigation select the owning document before revealing its range.
Context completion sees the complete project namespace while highlighting and
cursor help remain properties of the active source text.
The desktop starts with an empty editor rather than an implied
`architecture.c4ml` source. Its File menu exposes one context-sensitive close
action: Close File for an implicit single document and Close Project for an
explicit project. Closing returns to the empty editor, clears derived compiler
and preview state, and retains the existing aggregate dirty-state confirmation.

The desktop loads and evaluates the optional policy resource with the complete
project but does not expose it as an editable Monaco source tab in this first
slice. Policy violations appear as ordinary architecture findings in Output
and navigate to the affected architecture declaration. Malformed or
inapplicable policy input fails visibly; it never changes the architecture
model or diagram output.

The desktop also loads and evaluates the optional observation resource with the
complete project but does not expose it as an editable Monaco source tab.
Confirmed drift and unreviewed or disputed uncertainty appear as ordinary
architecture findings in Output. Selecting a finding navigates to the authored
architecture declaration when one exists. Malformed or inapplicable observation
input fails visibly and never changes source, model, layout, or diagram output.

One project revision is derived deterministically from the project identity,
ordered document identities, exact document revisions, and optional policy,
observation, glossary, narrative, publication, theme, shape, and asset resource
identities and content. A project source change set addresses every edit by
document URI, validates all document ranges against one project revision, and
applies all edits atomically or none. One authoring action spanning several
documents MUST remain one preview and one undo transaction at the editor
boundary.

No further version-one project resource is reserved by this section. Any future
resource requires its own typed contract before it may enter the project, and
MUST NOT be treated as architecture source by default. Publication settings
MUST not mutate semantic architecture, and installation-local workbench
settings MUST remain outside the project.

The implemented version-one glossary resource is a portable, non-semantic
project concern. It declares a stable resource identity and one or more stable
entries. Every entry has a term, `term` or `acronym` kind, explanation, optional
aliases, and an expansion exactly when it is an acronym. Entries are ordered by
identity; term and alias lookup is case-insensitive; entry identities and all
lookup labels MUST be unique. Invalid structure uses stable `C4ML-GLOSSARY-*`
errors. The resource participates in the deterministic project revision and is
loaded identically from working files and read-only Git revisions. It is not a
`.c4ml` source document, does not create or rename architecture identities, and
does not infer missing glossary entries from authored prose. The desktop and
worker may transport its bounded raw content, but editing and a visible glossary
browser remain later UI work.

The implemented version-one narrative resource is passive Markdown-backed
project context. Every `.c4ml-narrative.md` file begins with a fixed metadata
header containing `c4ml-narrative: 1`, a lowercase kebab-case `id`, and a
non-empty `title`, followed by a non-empty Markdown body. Narrative identities
are unique across the project. Links may target only normalized local project
paths or anchors. Raw HTML, embedded images, URI schemes, absolute paths, and
parent traversal fail with stable `C4ML-NARRATIVE-*` errors before presentation.
Narratives are deterministically URI-sorted, participate in project revisions,
and load identically from working files and read-only Git revisions. They are
not architecture source, are never compiled into semantic identities, and are
not rendered into diagrams. A visible narrative reader/editor and Markdown
rendering remain later UI work.

The implemented version-one publication resource selects an ordered non-empty
set of declared View identities with optional captions and one or more named
render profiles. A profile selects SVG and/or PNG, scale `1`, `2`, or `3`, and
theme or transparent background. View order is preserved; profiles are
deterministically identity-sorted. Duplicate or unknown View identities and
malformed profiles fail with stable `C4ML-PUBLICATION-*` errors. The CLI and
compiler worker validate publication View references against the compiled
project. Publication content participates in project revisions but MUST NOT
mutate architecture semantics, source, View definitions, layout, or styling.
Print composition and a visible publication editor remain later work.

The implemented version-one project theme resource wraps the existing portable
semantic theme selection. A `.c4ml-theme.json` file declares `version: 1`, a
theme identity, a built-in preset, and optional deep canvas, element, boundary,
and route token overrides. Unknown top-level fields, presets, or malformed color
values fail before rendering. CLI and compiler worker pass the same validated
selection into the shared scene builder. The resource participates in project
revisions and changes diagram presentation only; it MUST NOT change model, View,
layout intent, source, exports' semantics, or installation-local workbench
preferences.

The implemented version-one project shape resource wraps the existing safe,
renderer-neutral shape contract. A `.c4ml-shapes.json` file declares one or more
validated normalized definitions, optional architecture-identity-to-shape
assignments, or bounded presentation for the built-in box bar. That
presentation accepts `bar` as `on` or `off`, an optional six-digit hexadecimal
color, and an optional transparency percentage from zero through one hundred.
The bar remains on, theme-colored, and opaque when those values are omitted.
The shared catalogue rejects invalid canvas, content box, Ports, primitives,
geometry, color, opacity, duplicate IDs, and built-in collisions; diagram
preparation rejects unknown assignments. CLI and compiler worker pass the same
options into shared preparation. The resource cannot contain SVG, scripts, CSS,
fonts, filters, embedded images, network references, or new C4 kinds. It changes
presentation and Port geometry only and participates in project revisions.

The implemented version-one asset manifest covers passive UTF-8 project
material only: `text/plain`, `text/markdown`, and `application/json`. Every
entry declares stable identity, normalized local path, narrative/publication/
reference purpose, media type, lowercase SHA-256, one SPDX license identifier,
and optional attribution. Entry identities and paths are unique. Filesystem and
read-only Git adapters verify containment, exact content integrity, and JSON
syntax before constructing the portable project input. Manifest and exact file
contents participate in deterministic project revisions and bounded desktop
transport. Binary, image, font, executable, active, and remote assets are not
accepted by version one and require separately reviewed media-specific safety,
licensing, decoding, rendering, and packaging contracts.

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

Automatic compound layout MUST reserve presentation-aware internal clearance
between a boundary title and its first child. This is an effective layout
default, not a frozen public source-level padding property.

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

Placement controls use this relevance order:

1. semantic `place`, multi-element `align`, and ordered `distribute` intent;
2. a relative `adjust` offset from the complete automatic candidate; and
3. an exact `pin` in diagram units only as an escape hatch.

Named gaps `tiny`, `small`, `normal`, and `large` resolve to 1, 2, 4, and 8
layout steps. One layout step is 16 diagram units (`du`). A `du` is a unit in
the normalized SVG/layout coordinate space, not a CSS or device pixel. Exact
coordinates MUST state the `du` suffix. Relative adjustment MUST always be
recomputed from candidate geometry and MUST NOT accumulate across builds.

Multi-element alignment MUST name an anchor from its element list and MUST
support left, horizontal center, right, top, vertical center, and bottom
edges/axes. Distribution MUST preserve its explicitly authored list order,
keep the first listed element as its position reference, and place consecutive
elements with equal requested gaps. Source order outside such an explicitly
ordered construct remains semantically irrelevant.

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

Relationship labels MUST NOT show a visible card, banner, or canvas-colored
background. The selected route segment MUST instead contain a bounded geometric
gap behind the label so the route remains visible on both sides without running
through the text. Elements and Arrowheads remain visually authoritative.

Relationship labels and technology text MUST retain their controlled font size
and wrap deterministically into bounded line blocks when one line would intrude
into an endpoint element. The renderer-neutral scene owns the effective lines
and bounds; SVG and PNG adapters MUST NOT choose different wrapping.

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

The accepted toolchain baseline is:

- Node.js 24.15.0 or a newer 24.x release as the reference native desktop
  packaging runtime and minimum workspace and CLI baseline;
- a warning rather than a forced public download when a contributor uses a
  different installed runtime; source validation may accept a newer supported
  line, while the replaceable Forge 7 packaging adapter fails clearly outside
  the accepted Node.js 24.x build line;
- a pnpm workspace with the package-manager version pinned in the repository;
- strict TypeScript using ECMAScript modules; and
- Vitest for the initial unit and adapter-contract tests.

The accepted editor application baseline is Angular 22 with the pinned
TypeScript 6.0.x toolchain and Monaco Editor 0.56.0. The editor SHOULD use
Angular standalone components and Signals for application-local state. Angular
owns UI composition and interaction; Monaco owns source editing, selection,
completion presentation, markers, keyboard commands, and undo behind a
C4ML-owned adapter. Neither library may introduce editor-specific semantic,
layout, routing, scene, or rendering behavior. Compilation and language
processing remain in a local Web Worker behind the same C4ML-owned contracts
used by the CLI.

Electron 44 is the accepted first desktop application shell. Electron owns only
native application lifecycle, windows, menus, file dialogs, packaging, and the
small privileged adapter needed for those capabilities. It MUST NOT contain a
second compiler, parser, language service, semantic model, layout pipeline, or
renderer.

C4thedral and C4ML are licensed under Apache License 2.0. Third-party dependencies retain
their own licenses and MUST remain behind the boundaries recorded in
`DEPENDENCIES.md`.

The compiler core MUST NOT depend on the DOM, Node.js filesystem APIs, process
state, or a network service. Environment-specific behavior belongs behind small
adapters at the frontend boundary.

The MVP MUST NOT require Python, a Python service, or any other background
service. Python or native/Wasm modules MAY be evaluated later as replaceable
algorithm adapters only after a measured need is demonstrated.

The CLI is a thin Node.js frontend over the compiler API. The desktop renderer
is a TypeScript application that invokes the same compiler API in a local Web
Worker.
Packaging the CLI as a standalone executable MAY be considered later without
changing compiler semantics.

Candidates accepted for validation in the Phase 0 technical spike:

- Langium for grammar, typed AST, references, validation, and later language
  tooling;
- ELK.js as the first replaceable automatic-layout adapter;
- a C4ML-owned constraint, port, routing, and label-placement layer;
- a C4ML-owned SVG scene renderer; and
- resvg-js or an equivalent non-browser renderer for SVG-to-PNG conversion.

At the time of Phase 0, Langium, ELK.js, and resvg-js were not permanent
dependency decisions. The spike had to verify license, installation footprint,
deterministic behavior, browser independence, and replacement boundaries.
ELK.js was subsequently accepted for production automatic layout in Section
9.5.2, and resvg-js was accepted as the replaceable Node.js PNG adapter in
Sections 9.7 and 10. Passing another Phase 0 spike still permits continued
prototyping but does not make a candidate part of C4ML's public semantic model
or freeze the source grammar.

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
standalone SVG. The production `@c4ml/render-resvg` Node.js adapter rasterizes
that exact SVG to PNG behind the compiler-owned `PngRenderer` contract.

The automatically and visually validated reference path currently covers one
original Container View with a Software System boundary, a nested Visual Group,
internal Containers, external supporting elements, labelled relationships,
automatic routes, guided cardinal ports, one named corridor with lane
selection, explicit label-segment selection, view-local label offsets, and an
original semantic color theme. Fixed orthogonal routes are structurally
validated in the compiler-core suite.

The compiler-owned placement stage accepts the automatic adapter result as
candidate geometry and applies an engine-neutral intent hierarchy. It
implements hard or soft relative `left-of`, `right-of`, `above`, and `below`
placement; anchored multi-element edge or center-axis alignment; explicitly
ordered horizontal or vertical equal-gap distribution; relative x/y or
directional adjustment from automatic geometry; and an individual exact pin.
Named gap presets, `step`, and exact `du` distances resolve deterministically.
Hard conflicts fail before routing and preserve every involved constraint
source; relaxed soft rules remain inspectable and emit a stable warning. Final
constrained geometry and the original candidate layout are both compiler-visible.

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

These types are internal compiler contracts, not accepted public `.c4ml`
grammar. The current slice implements the placement controls described above,
relative route anchors, hard and soft avoidance regions, and locked segments,
but intentionally does not claim row/column membership beyond explicit
alignment, minimum-gap groups, preferred proximity, bounded movement,
constrained size,
route-junction authorship, relative corridors,
complete all-view rendering evidence, a frozen author-facing theme grammar, or
geometry-affecting style tokens. ELK.js is the accepted first
automatic-layout adapter behind the engine-neutral boundary; resvg-js is the
accepted replaceable Node.js PNG adapter behind `PngRenderer`.

### 9.4 Experimental `draft-1` language slices

An internal, runtime-portable language package implements the executable
`draft-1` slices needed by the original `examples/draft/hello-context.c4ml`,
`examples/draft/hello-container.c4ml`, and
`examples/draft/hello-static-zoom.c4ml`, plus
`examples/draft/hello-dynamic.c4ml` and
`examples/draft/hello-deployment.c4ml`. The larger original
`examples/draft/signal-garden.c4ml` composes those same executable slices into
one model covering all seven view types. The slices currently recognize:

- Person and Software System declarations with name, responsibility, and
  internal or external classification;
- Container declarations with explicit Software System ownership,
  responsibility, and technology;
- Component declarations with explicit Container ownership, responsibility,
  and technology;
- Code Element declarations with explicit Component ownership, responsibility,
  code kind, and optional implementation language;
- directed relationships with source, target, intent, and optional technology
  or protocol, with normal semantic enforcement for Container relationships;
- one or more System Context, Container, Component, or Code Views with a scope
  restricted to the required C4 element kind, title, purpose, default audience,
  generated legend, and optional flow direction; and
- System Landscape Views with a quoted organizational scope;
- Dynamic Views with a quoted scenario, collaboration or sequence display,
  ordered interactions, explicit parallel groups, typed endpoints, and
  references to static Relationships;
- Deployment Environments, nested Deployment Nodes, Infrastructure Nodes,
  Software System Instances, Container Instances, and deployment
  relationships that may reference corresponding static Relationships;
- Deployment Views that select one Environment and one or more Software
  Systems; and
- line comments and formatting-only whitespace changes.

The executable view-local placement subset additionally recognizes:

- hard or soft relative `left-of`, `right-of`, `above`, and `below` placement
  between visible static elements;
- hard or soft anchored alignment of two or more visible static elements by
  left, horizontal center, right, top, vertical center, or bottom geometry;
- hard or soft horizontal or vertical equal-gap distribution of three or more
  explicitly ordered visible static elements;
- hard or soft directional or x/y adjustment relative to automatic candidate
  geometry; and
- one view-local exact pin per visible static element with non-negative `du`
  coordinates.

Relative placement and distribution gaps accept `tiny`, `small`, `normal`,
`large`, non-negative `step`, or non-negative `du` values. Adjustments accept the same
non-negative magnitudes for directional movement or signed `step`/`du` x/y
offsets. Exact pins require the explicit `du` suffix.

These controls lower into compiler-owned `DiagramPlacementOptions`, are applied
after automatic candidate layout and before routing, and are passed identically
by the CLI and compiler worker. Duplicate placement identities, missing relative
gaps, inappropriate alignment gaps, unknown or non-visible items, invalid
coordinates, invalid or duplicate alignment/distribution sets, invalid
adjustment combinations, conflicting hard pins, and contradictory hard constraints fail
with stable source-located diagnostics. Soft constraints may be relaxed only
with a warning. General row/column membership, grouped minimum gaps, proximity,
bounded movement, and constrained size remain outside this executable slice.

The first executable view-local routing subset additionally recognizes:

- named horizontal or vertical corridors at an absolute integer canvas
  coordinate, with positive capacity and lane spacing;
- route controls keyed by a declared static Relationship identifier;
- independent `automatic`, `guided`, and `fixed` authorship policies and
  `direct` or `orthogonal` route styles;
- independent automatic or cardinal source and target Ports;
- absolute integer waypoints for guided routes and complete point lists for
  fixed routes;
- ordered guided waypoints relative to source or target Ports, cardinal sides
  of visible elements, or absolute canvas points, with optional integer shifts;
- ordered locked segments whose endpoints use the same anchor forms;
- reusable view-local hard or soft avoidance regions using absolute bounds or
  the padded effective bounds of a visible element;
- explicit selection of avoidance regions by guided routes;
- a named corridor plus a zero-based exclusive lane for guided routes; and
- a zero-based effective label segment and an integer x/y label offset.

These controls lower into the compiler-owned `DiagramRoutingOptions` for their
own view and are passed identically by the CLI and compiler worker. They do not
alter the semantic Relationship or the resolved view. The lowering stage
rejects duplicate corridor or avoidance identities, duplicate controls for one Relationship,
missing required corridor properties, non-positive corridor capacity or lane
spacing, and policy-incompatible combinations. The routing stage rejects an
unknown or non-visible Relationship, unknown corridors, out-of-capacity lanes,
shared exclusive lanes, invalid point geometry, obstacle crossings, invalid
label segments, unknown relative anchors or avoidance regions, impossible hard
avoidance, loss of locked geometry, and fixed endpoints that do not attach to
their nodes. A soft avoidance conflict remains valid but emits a stable warning
and is retained as a relaxed effective region.

The Langium-generated syntax types remain private to the language package. An
explicit lowering stage translates them into the parser-independent C4ML model
and view contracts, preserves source locations, assigns stable C4ML diagnostic
codes, and invokes the same semantic and view resolution used by TypeScript-fed
inputs. Parsed source can therefore enter the existing layout, scene, and SVG
pipeline without introducing a second compiler implementation.

These slices are an implemented feasibility boundary, not an accepted public
grammar or compatibility promise. They do not yet cover Visual Groups,
complete selection, styling, shapes, route junctions, relative corridors,
route controls for Dynamic Interactions or Deployment
Relationships, formatting, incremental documents, or complete editor language
services. They expose context-completion for the executable subsets, including
only valid properties and references inside route and corridor blocks. The rest
of the syntax in `DOCUMENTATION.md` and `examples/draft` remains non-executable
review material.

When the parser encounters a known, deliberately non-executable construct from
the language-preview material, it MUST report that limitation directly instead
of presenting the next expected closing brace as the authoring error. The
current diagnostic `C4ML-LANG-005` covers proposed element tags, Visual Group
declarations, and View presentation blocks. It retains the exact source range
and directs the author to remove the proposal from executable source or keep it
in a separate language-preview document. Unknown malformed syntax continues to
use the normal parsing diagnostic.

### 9.5 Angular editor foundation

The production-bound editor foundation is implemented as an Angular 22
standalone application under `apps/editor`. It uses Signals and zoneless change
detection for UI state and keeps parser, semantic, layout, scene, and rendering
behavior outside Angular components.

The workbench root component is a composition boundary. Focused Angular
facades own document/export, preview, help, and command-palette presentation
state. Those facades may coordinate renderer or desktop adapters but MUST NOT
own C4ML syntax, semantics, layout, or rendering. Worker transport is composed
from independent Compile, Language, and Authoring contracts over one shared
version and source-location core. The combined protocol module remains a
compatibility and dispatch boundary rather than the owner of domain contracts.

The editor communicates with a module Web Worker through a C4ML-owned message
contract. Compile, completion, syntax-highlight, help-context, and wizard-source requests share one
monotonically increasing request sequence and carry a protocol version. Each UI
consumer accepts a response only when it matches that consumer's newest active
request, so an older compilation, completion list, or generated source can
never replace a newer result. Invalid current source replaces the diagnostic
list but retains the last valid SVG. Source changes are compiled after a short
local debounce. A successful compilation returns the declared executable view
catalogue and active view identity; the UI can request another view by stable
identifier without creating another semantic model.

The worker executes the experimental `draft-1` parser, explicit AST-to-domain
lowering, shared semantic and view resolution, diagram compiler, scene builder,
and SVG renderer. The UI displays compiler-produced SVG as an image through a
local object URL rather than injecting authored markup into the application
DOM. The same worker uses the language package's lexer spans, completion scopes,
and wizard source generator, so Angular and Monaco contain no parallel C4ML
grammar or C4 rules. No compiler service or runtime network connection is
required.

This is the accepted foundation of the production editor, not a claim that the
MVP editor is feature-complete. A lazy Monaco 0.56.0 adapter owns text input,
selection, undo, keyboard commands, completion presentation, and marker
presentation. Context-valid candidates and
their exact replacement ranges still come only from the C4ML language worker.
Compiler diagnostics are mapped to Monaco markers and can be selected in the
diagnostic list to reveal and focus their source range. Zoom, fit-to-view,
scroll-pan at enlarged scale, and local SVG download are implemented without
mutating compiler geometry. Syntax highlighting is implemented with spans from
the authoritative C4ML lexer, transported through the compiler worker and
encoded as Monaco semantic tokens. The language package contextually
distinguishes declaration words, properties, predefined values, identifiers and
references, strings, numbers, operators, and comments. Monaco only presents
those classifications. Successful compilation also returns an
inspectable navigation map from source ranges through stable scene-node and SVG
identities to scene bounds. Selecting a source declaration highlights the
smallest matching source-mapped preview node. Selecting a preview node reveals
and selects its source declaration. The selection style is applied only to the
displayed SVG copy; SVG export retains the canonical, unselected compiler
output. Invalid edits retain the last valid navigation map with the last valid
preview, but preview clicks are disabled until current source compiles again.
The navigation map also preserves every effective Route's Relationship source,
optional view-local route-control source, stable scene/SVG identities, final
polyline, endpoint Ports, policy, style, label anchor and segment, effective
corridor lane, relative waypoints, locked segments, and effective avoidance
regions including soft relaxation. Relationship or route-control selection therefore highlights
the corresponding Route; path hit testing reveals the semantic Relationship,
Dynamic Interaction, or Deployment Relationship declaration. Element interiors
take precedence over Routes, Routes take precedence over enclosing boundaries,
and nearby path selection uses a bounded scene-space tolerance.

A toggleable routing-debug overlay displays the selected Route's effective
points, relative waypoints, locked segments, avoidance bounds, endpoint Ports,
label anchor, and all lanes of its selected corridor. An adjacent inspector
reports the same compiler-owned route facts. This is
preview-only editor presentation; it does not recalculate geometry, mutate
source, or enter SVG export. Ports, route labels, and corridors are distinct
preview navigation targets. Selecting one identifies its owning Route and
reveals the route-control source range; it does not invent a separate semantic
relationship. Arrowheads are not separate navigation targets yet. Native
source-file Open/Save/Save As and PNG export are implemented by the desktop
shell.

The implemented read-only geometry inspector extends each selectable node with
its automatic candidate bounds, final scene bounds, movement delta, and every
effective placement constraint that references it. Automatic engine choice,
applied hard intent, applied soft intent, and relaxed soft intent are distinct
states. Automatic choice navigates to the owning view declaration; placement
constraints, route controls, avoidance regions, and corridors navigate to their
own source declarations. The inspector consumes compiler-owned candidate and
final geometry and MUST NOT recalculate or persist either. Graphical source
editing remains unimplemented.
The production preview uses the accepted ELK.js adapter described in Section
9.5.2; the former deterministic linear preview remains test-only compatibility
code.

#### 9.5.1 Accepted source-editor dependency

**Status: Accepted and implemented for the desktop editor.**

The editor pins Monaco Editor 0.56.0 and loads its editor, selected
interaction features, stylesheet, and generic editor worker locally. The
Monaco runtime is a lazy chunk; its completion items receive explicit
replacement ranges translated by a C4ML-owned source-editor contract. Monaco
MUST remain a replaceable Angular UI adapter: it may own text editing,
completion presentation, markers, keyboard commands, and undo, but it MUST NOT
own C4 syntax or semantic rules. The existing C4ML compiler worker remains the
only source of contextual candidates, highlighting spans, and diagnostics. Monaco's TypeScript,
CSS, HTML, JSON, and native LSP language services are not loaded. C4ML syntax
highlighting remains C4ML-owned and MUST NOT introduce a second authoritative
parser or grammar. Monaco only receives already classified, source-located
semantic-token spans.

The workbench MUST advertise a suggestion shortcut that reaches Monaco on the
active platform. Windows and Linux use `Ctrl+Space`. macOS uses Monaco's `Cmd+I`
binding because `Ctrl+Space` is commonly reserved by the operating system for
input-source switching. The visible suggestion action remains a
keyboard-independent equivalent.

Superseded evaluation note (2026-08-28): CodeMirror 6 was considered as a
smaller modular fallback. Monaco's broad adoption, familiar desktop interaction,
implemented integration, and acceptable lazy-load cost for C4ML's explicitly
desktop-only editor led to Monaco's acceptance. CodeMirror is no longer an
active production-library decision.

The measured production build has a 243.20 KB initial application total,
a 3.06 MB lazy Monaco runtime, a 304.37 KB generic Monaco worker, and a locally
loaded 350,112-byte Monaco stylesheet before transfer compression. The compiler
worker remains a separate 805.64 KB chunk; the unchanged 1,595,334-byte ELK
worker and 469,600 bytes of IBM Plex WOFF2 files are separate local assets.
Automated tests protect exact edit,
diagnostic-range, and semantic-token translation plus stale asynchronous
completion and highlighting handling.
Interactive renderer-harness evidence covers an in-place context-only popup, exact edit
application, marker display, diagnostic navigation, keyboard undo/redo, source
synchronization, last-valid preview retention, and wizard apply/undo. The
accessible renderer tree exposes the editor as a labelled textbox and the popup
as a listbox, but a real assistive-technology pass is still outstanding. All
runtime assets were served locally without a compiler service or CDN.

The first-release editor is explicitly desktop-only, and the measured lazy-load
and installation costs are accepted for that scope. The production build MUST
ship Monaco's license and upstream third-party notices. The pinned adapter's
version-sensitive Suggest controller and semantic-token feature imports MUST be
checked on every dependency upgrade. A real assistive-technology pass remains
required before an accessible release claim, but it is not a renewed
source-editor selection gate.

Sources: [Monaco README](https://github.com/microsoft/monaco-editor/blob/main/README.md),
[Monaco 0.56 changelog](https://github.com/microsoft/monaco-editor/blob/main/CHANGELOG.md),
[Monaco completion item API](https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor_editor_api.languages.CompletionItem.html),
[CodeMirror completion guide](https://codemirror.net/examples/autocompletion/),
[CodeMirror reference manual](https://codemirror.net/docs/ref/), and
[CodeMirror lint guide](https://codemirror.net/examples/lint/).

#### 9.5.2 Accepted automatic-layout dependency

**Status: Accepted and implemented for Node.js and the desktop renderer.**

ELK.js 0.12.0 is the first production automatic-layout adapter. C4ML owns the
request and result contracts, validates input before invocation, fixes the
layout seed, and normalizes compound-node and edge geometry before any later
compiler stage sees it. ELK identifiers, configuration objects, and relative
coordinates MUST remain inside `@c4ml/layout-elk`.

Node.js frontends use the reviewed bundled entry behind a dedicated factory.
The renderer compiler worker uses ELK's API-only entry and starts the unmodified
published `elk-worker.min.js` as a separate local classic Web Worker. This
avoids the bundled entry's incompatible internal worker constructor, keeps
layout work off the Angular UI thread, and requires no network service. The
desktop renderer artifact MUST ship the exact reviewed worker and ELK license.
The Web Worker and bundled Node.js factories are separate exports over the same
normalization adapter so neither frontend can leak environment concerns into
compiler-core.

The adapter is replaceable; its acceptance does not make ELK options part of
the C4ML semantic model or source grammar. C4ML routing, explicit Ports,
corridors, waypoints, fixed paths, labels, and author constraints remain C4ML
contracts applied independently of automatic-layout engine selection.

Source:
[ELK.js README and Web Worker guidance](https://github.com/kieler/elkjs/blob/0.12.0/README.md).

### 9.6 Experimental authoring assistance

The language package exposes an editor-independent completion contract for the
`draft-1` subset. It accepts source text and a cursor offset and returns stable
candidate identities, a C4ML-owned candidate kind, documentation, and one exact
replacement range and text. Candidate discovery uses the current grammar and
scope provider. It filters already-declared singleton properties and restricts
cross-references by their semantic target type, including Software-System-only
System Context and Container scopes, Container-only Component scopes, and
Component-only Code scopes. Results are deterministically ordered.
At a document-level cursor, error recovery MUST retain the foundational
`model` candidate when an invalid or incomplete header would otherwise leave
the completion list empty. At declaration level inside a lexically intact
`model` block, the same recovery MUST retain the foundational `person` and
`system` candidates. At property level inside a lexically intact but incomplete
`view` block, it MUST retain the executable View-property candidates even when
the View ID or document header is still invalid. Monaco-owned completion-state copy MUST follow the
selected workbench language through the C4ML editor adapter.

The guided-modeling foundation generates either a new System Context document
or a new Container document. The Context path asks about one focal application,
one user role, and their directed intent. The Container path asks about parts
that can be started, deployed, or operated separately, their responsibilities
and technologies, and explicit directed connections with protocols. Both paths
generate ordinary `draft-1` source and pass it through the normal parser,
semantic validator, compiler, and preview.

Wizard questions MUST lead with familiar architecture tasks and descriptions.
C4 terms such as System Context and Container MUST be presented as optional
translations or explanations, not as knowledge the user must already possess.
Owned labels, explanations, and initial example answers MUST follow the selected
workbench language. Every form control MUST expose an adjacent, keyboard-
accessible explanation on demand. Stable identities MUST be named explicitly
as IDs or source tokens and explained as references that can remain unchanged
when a visible name changes; vague labels such as "technical name" are not
sufficient on their own. Initial answers across all wizard steps MUST form one
coherent domain example rather than unrelated field-level samples. The current
original example is an online shop whose customer-facing and administrative web
applications communicate with an application service, Kafka, PostgreSQL, and
S3-compatible object storage.
The editor displays the proposed source before apply; cancel leaves the active
source unchanged, and an applied generation has an explicit one-step undo. That
single restoration is offered as contextual feedback above the status bar, not
as a persistent title action, and requires confirmation because this bounded
foundation does not yet provide redo. It expires on the next source or document
change. This
foundation does not extend or reformat existing documents and does not claim
the full wizard scope described in Section 14.4.

#### 9.6.1 Local handbook and contextual help

**Status: Accepted and implemented foundation.**

The workbench MUST package an original, offline C4ML handbook in English and
German. Its primary navigation is a Help activity with local search and
expandable task-oriented chapters. A Handbook tab in the right editor group
MUST provide enough width for explanations and source examples without hiding
the source editor. The diagram remains available as a sibling tab.

The handbook MUST lead with recognizable authoring tasks before introducing C4
vocabulary. It MUST distinguish executable `draft-1` syntax from proposed or
planned constructs and MUST NOT present a planned construct as available. Its
examples are original C4ML assets and MUST require no network content.
Example syntax, keywords, and stable identifiers remain literal C4ML. In the
German handbook, author-facing descriptive values such as names,
responsibilities, relationship intent, titles, and purposes MUST be German;
the English handbook presents the corresponding values in English.

Help for the current cursor position MUST come from the language package through
the versioned compiler-worker contract. Angular and Monaco MUST NOT infer block
or grammar context independently. Stale cursor-context responses MUST be
rejected. The Help activity exposes the current topic, and `F1` plus the command
palette open that topic in the Handbook tab. Reading, searching, or navigating
help MUST NOT modify source, mark a document dirty, compile a different model,
or alter canonical diagram output.

The first implemented handbook covers the executable document structure,
static model hierarchy, relationships, all seven view families, deployment,
view-local flow, the current Port/corridor/Route subset, and SVG/PNG output.
Copying or inserting examples, generated reference pages, safe topic links from
completion details, and documentation for future grammar slices remain later
extensions. Any insertion command requires a separate undoable, syntax-aware
source-edit contract.

### 9.7 Electron desktop shell

**Status: Accepted, implemented, automatically validated, and visually
validated on macOS arm64.**

The first desktop shell is an Electron 44 application under `apps/desktop`.
It loads the production Angular editor from packaged local resources and keeps
the existing module Web Worker and C4ML compiler contracts unchanged. The
interface is the original C4thedral workbench; an IDE-like window model does not imply
copying Visual Studio Code source, extensions, branding, layout, or assets.

The Electron main process owns application lifecycle, the authoritative main
workbench window, an optional projection-only preview window, native menus and
shortcuts, Open/Save/Save As dialogs, source-file reads and writes, title
updates, context-sensitive File/Project closing, and close protection for
unsaved source. The main renderer receives
opaque document handles rather than filesystem paths. File operations are
limited to validated C4ML source documents up to 8 MiB and report stable desktop
diagnostic codes. Source remains authoritative and saving writes the current
editor text, not hidden graphical state.

The main workbench provides a single-window full-size preview mode and may open
the same preview in a separate native window. The second window receives only a
versioned, validated projection containing the current view and compiler
status, bounded SVG, source-neutral navigation geometry, stable scene-object
identities, selection, zoom, Route-overlay state, and safe presentation
settings. It MUST NOT receive source text or ranges, document URIs or handles,
filesystem paths, compiler services, export methods, or the main desktop
bridge. Its separate preload exposes only projection requests and preview
interactions. The main window remains the only compiler and document authority;
selection events are resolved against its current navigation before source is
revealed. The main process assigns the cross-window projection revision so a
main-renderer reload cannot make a still-open preview reject the replacement
projection stream. A newly bootstrapped main renderer explicitly reads the
current preview-window state before resuming synchronization.

Closing, reopening, moving, or redocking the preview window MUST NOT change
source, canonical geometry, or exported SVG/PNG. Only bounded visible window
geometry and ordinary workbench presentation state may be restored. Zoom,
selection, fit, and Route-overlay changes travel through the same projection
contract so main and detached views converge without a second compiler. A
single compact control occupies the same upper-right workbench position for
both transitions: it points outward before detaching and inward while the
preview is detached. Redocking MUST NOT introduce a separate title-bar action.
A preview canvas matching the canonical diagram canvas surrounds the rendered
SVG in both workspaces, independent of workbench brightness and color family,
without a pattern or sheet shadow. The rendered diagram therefore does not
appear as a separate pasted sheet. This canvas choice is workbench presentation
only and MUST NOT alter SVG or PNG output. The detachable preview is a native
Electron window. A browser pop-out, separate development ports, and a hosted
multi-window variant are outside the product scope. The internal renderer
harness uses the full-size single-window mode.

The main process also owns native PNG export. The renderer sends only the
canonical current SVG, a validated suggested name, and a scale of 1x, 2x, or
3x through the versioned bridge. SVG input is bounded to 16 MiB. The main
process rasterizes it locally through the replaceable `PngRenderer` adapter,
loads the controlled IBM Plex Sans TTF faces, disables system-font discovery,
and opens the native save dialog. PNG export MUST NOT run a second layout pass
or alter source, scene geometry, or SVG text layout.

The renderer MUST run sandboxed with context isolation enabled, Node.js
integration disabled, web security enabled, external navigation and new
windows denied, and permission requests denied. A C4ML-owned preload exposes
only the versioned desktop bridge. The main process MUST reject IPC from an
untrusted sender. Packaged assets are served only through the privileged but
local `c4ml://app` protocol, with traversal protection and a local-only content
security policy. Application code is packaged in ASAR; production Electron
fuses disable RunAsNode, `NODE_OPTIONS`, and command-line inspection, require
ASAR integrity and ASAR-only application loading, and enable cookie encryption.

Electron Forge is the replaceable packaging adapter. macOS `.app`, DMG, and ZIP
artifacts are configured and locally validated. The Windows Squirrel maker is
configured for a Setup EXE, and Linux uses a portable ZIP without an additional
distribution-specific maker. Windows and Linux still require native build,
launch, and install or unpack validation. Current macOS artifacts are ad-hoc
signed for local execution only.
A release MUST add a final product version and icon, Apple Developer ID signing
and notarization, Windows code signing, and native validation on each supported
platform. The installed application MUST run offline; dependency and Electron
binary downloads are build/install-time concerns only.

Builds MUST run on their target operating system. Platform-specific packaging
helpers MUST remain optional or transitive to their maker and MUST NOT execute
on unrelated hosts. The exact host matrix, prerequisites, outputs, runtime
differences, and native verification procedure are recorded in `PLATFORMS.md`.

### 9.8 Local workbench preferences

**Status: Accepted, implemented, automatically validated, and visually
validated foundation.**

The desktop editor has an extensible settings area with category navigation.
Its first version owns the local workbench interface language, color scheme,
color family, and interface font size plus source-editor syntax theme, font
family, and size.
Settings apply live and persist locally
as a validated, versioned record. Interface language supports `en` and `de`,
with English as the default. It changes C4thedral-owned interface copy, accessibility
labels, command search, native menu commands, file-dialog labels, and
unsaved-document warnings immediately. It MUST NOT translate authored names,
descriptions, generated source, compiler diagnostics, or diagram content. The
document root language attribute MUST reflect the current interface language.
The color scheme supports `system`, `light`, and `dark`;
`system` tracks operating-system changes while the application is running.
The independent color family supports `blue`, `gray`, `yellow`, `green`,
`violet`, `red`, `orange`, and `turquoise`, with blue as the default. Each
family has a quiet light and dark realization, producing sixteen concrete
workbench variants while `system` merely chooses the effective light or dark
half. A family changes workbench accents, subtle surfaces, controls, Monaco
chrome, and the syntax declaration accent without changing the stable meaning
of the remaining syntax roles, diagram themes, or exported artifacts.

The source editor has a separate C4ML-owned syntax-theme contract. Its semantic
roles are comment, declaration, property, predefined value, structural keyword,
number, operator, string, and identifier/reference. Monaco only adapts these
roles to semantic-token presentation and MUST NOT own their classification or
meaning. The five local presets are `balanced`, `minimal`, `vivid`,
`high-contrast`, and `color-safe`, with `balanced` as the default. Minimal uses
restrained, nearly monochrome differentiation; vivid uses stronger semantic
separation; high contrast adds redundant weight and underline cues where
appropriate; color-safe does not rely on red-versus-green distinctions.
Every preset has explicit light and dark values. The active workbench color
family supplies the declaration accent, cursor, selection, and focus colors;
all other semantic role colors stay stable within the selected preset.
Interface font size is bounded to 9–16 px in 0.5 px steps, defaults to 13 px,
and scales C4thedral-owned workbench text through one root typography token. The
status bar uses the same effective interface size as source and preview tabs.
Source font choice is bounded to the packaged IBM Plex Mono, Fira Code, Hack,
Source Code Pro, Intel One Mono, Inconsolata, and Cascadia Code families or a
local system monospace stack. Source font size is bounded to 11–24 px in 0.5 px
steps and defaults to 15 px. A newly selected packaged face MUST be loaded
locally and Monaco font metrics MUST be remeasured after loading.

Programming ligatures are enabled by default and MUST have an independent local
on/off preference. C4ML MAY select documented family-specific OpenType features
to expose a family's intended programming ligatures. Ligature presentation MUST
NOT change source characters, offsets, selections, diagnostics, compiler input,
diagram output, or exported artifacts.

Monaco completion lists MUST explicitly theme normal, highlighted, selected,
and keyboard-focused states in every light/dark color-family combination.
Syntax roles MUST be explicit in every syntax-preset, light/dark, and
color-family combination. Text in each normal and selected state and every
syntax role MUST retain a contrast ratio of at least 4.5:1 against its effective
background; no selected-state or syntax foreground may be inherited implicitly
from Monaco's base theme.

Interface font size MUST NOT change Monaco source text or any diagram content,
geometry, SVG, or PNG. These are installation-local presentation preferences. They MUST NOT modify
`.c4ml` source, mark a source document dirty, enter compiler or language-worker
requests, or alter diagram theme, geometry, text measurement, SVG, or PNG.
IBM Plex Sans remains the controlled interface and diagram family. A future
project-, workspace-, document-, or view-scoped setting requires a separate
contract and MUST NOT be added silently to the local preference record.

The version-one record MUST validate every value at the storage boundary and
fall back safely when storage is unavailable, malformed, or from an unsupported
version. A version-one record created before the language field existed MUST
retain its other valid values and use English. Components MUST consume the
preferences service rather than read local storage directly. The panel MUST
support keyboard operation, contained modal focus, Escape dismissal, and return
focus to its invoking toolbar control. The same panel is opened by the native
`Cmd/Ctrl+,` application-menu command. The renderer-to-main language update MUST
use the narrow validated desktop bridge and MUST NOT expose locale or filesystem
capabilities to the renderer.
`SETTINGS.md` records the current setting catalogue and extension rules.

### 9.9 Workbench shell and local session

**Status: Accepted, implemented, automatically validated, and visually
validated foundation.**

The editor uses the original C4thedral workbench with C4ML-specific Files, Source
Control, Diagrams, Output, and Help activity areas, simultaneous source,
preview, and Handbook tabs, a bottom panel
for Problems and Route details, a status bar, and a searchable command palette.
These concepts provide familiar desktop navigation without adopting another
product's branding, source, extensions, assets, or distinctive interface.
The activity areas and Settings use a fixed, locally packaged subset of
Material Symbols Outlined plus one original C4ML Source Control symbol. Symbols
are decorative inside already named buttons;
localized accessible names and tooltips remain C4thedral-owned text. The icon assets
MUST load offline, follow the active workbench color, and MUST NOT enter diagram
themes or exported SVG/PNG.

A versioned session record may persist only installation-local presentation
state: the active activity area, bottom-panel visibility and tab, preview zoom,
route-debug visibility, single-window preview mode, and bounded preview-window
geometry. It MUST reject malformed or unsupported records and MUST NOT persist
source text, document handles, filesystem paths, compilation results, diagram
semantics, or uncommitted graphical state. Source files remain the only
persistent architecture authority.

Primary work areas remain grouped at the top of the activity bar. Help is
grouped with Settings at the bottom so its global application context is not
confused with file operations. The visible Problems count and the active panel
tab both toggle the panel; the panel MUST NOT add a separate unlabeled close
glyph. A status-bar action that opens the Diagrams area is labelled by that
destination rather than repeating the authored title of the current View.

### 9.10 Shared authoring, comparison, and analysis foundations

**Status: Accepted architectural direction; portable version-one contracts
implemented and automatically validated.**

The three product pillars in Section 1.1 require shared portable contracts
before feature-specific editor work begins:

- A proposed source change set identifies the exact source revision it was
  created from, contains deterministic non-overlapping text edits, describes
  the affected stable architecture identities and author intent, and can be
  previewed, compiled, applied atomically, or rejected as stale. Applying one
  change set in the editor MUST create one understandable undo operation.
- A canonical architecture snapshot normalizes a validated model and its
  resolved views independently of parser AST objects, declaration order,
  source formatting, frontend state, and renderer output. It MUST retain stable
  identities and enough typed information to classify semantic, view,
  deployment, presentation, and layout changes without treating source ranges
  as architectural meaning.
- An analysis finding identifies its rule or query, severity or result kind,
  affected stable identities, source locations, and an inspectable evidence
  path. A proposed correction MAY reference a source change set, but analysis
  MUST NOT mutate the semantic model.

These contracts MUST remain usable in Node.js and a local Web Worker. Git,
filesystem, repository scanners, deployment observations, and other external
inputs belong in frontend or importer adapters. Angular components, Monaco,
Electron, and CLI argument handling MUST NOT implement competing diff, rule, or
source-rewrite semantics.

The implemented source-change contract uses a deterministic versioned revision
identity, normalized non-overlapping offset edits, affected stable identities,
and an explicit architecture/layout/route/policy intent. It rejects stale or
overlapping edits before application and can evaluate a candidate source without
mutating the active source string. Syntax-aware edit generation and conversion
to one Monaco undo unit are implemented behind the language and Monaco adapter
boundaries. The first syntax-aware generator changes one supported element
property by replacing only its value range; it deliberately does not reprint the
document or normalize unrelated formatting.

The implemented project extension adds a deterministic project revision and
document-addressed change set. It validates every edit before applying any,
rejects stale or unknown documents, and can preview a complete candidate project
without mutating active documents. The original single-document contract remains
available as the implicit-project convenience boundary.

The first graphical placement-authoring slice is implemented in the editor.
A selected source-mapped element can be placed relative to another element,
nudged from its automatic candidate, aligned with a selected set, distributed
in explicit order, or pinned to its current `du` position through a deliberately
last-listed exact-position action. The language package owns the syntax-aware,
project-addressed change generation; the worker compiles the complete candidate
project without changing the active documents. Angular presents the proposed
source and candidate SVG, and Monaco applies an accepted one-document
transaction as one undo unit. Applying and undoing restore the preceding source
and dirty-state semantics; no hidden geometry is retained by the editor.

The first graphical Route-authoring slice is also implemented. From a selected
effective Route, the editor can choose cardinal or automatic source and target
Ports, add guidance at an effective segment midpoint, move existing waypoint
guidance in diagram-unit steps, remove one waypoint, or return guidance to
automatic routing. Relative Port and element anchors retain their symbolic
reference when moved; the authoring generator changes or adds their relative
shift rather than replacing them with absolute canvas geometry. The language
package owns deterministic, project-addressed edits and removes controls that
are obsolete or incompatible with the requested operation. Those removals are
reported as safe compiler-proposed repairs. The worker compiles the complete
candidate project and reports hard diagnostics separately before Angular can
enable apply. Monaco applies an accepted transaction as one undo unit, and the
editor retains no hidden Route geometry.

The first semantic graphical-authoring slice is implemented for the five
static C4 views. The language package inspects the active resolved view and
returns the permitted creation kinds, their scope-derived owner, and valid
directed relationship endpoint pairs. System Landscape and System Context may
create People or Software Systems; Container, Component, and Code views create
only the element type owned by their active Software System, Container, or
Component scope. Angular asks in familiar architecture language and does not
own those C4 rules. A requested action becomes a deterministic project-
addressed source change, the worker compiles the complete candidate project,
and Monaco applies an accepted single-document transaction as one undo unit.
The dialog is visibly identified as an architecture-model change and remains a
separate tool from placement and Route editing. Every operation form remains
contained in its dialog column regardless of intrinsic control content;
multi-line responsibility input can be resized vertically but cannot grow into
the candidate preview. Element creation and directed connection authoring are
separate top-level workbench actions rather than modes hidden in one operation
selector. The connection action may begin with a currently selected element as
its source. Its own dialog offers both bounded source/target lists and a
temporary Source-then-Target diagram picker. The picker accepts only
worker-reported, context-valid element pairs, keeps direction explicit, and
returns to the same non-mutating candidate preview before any source change is
applied. It creates no hidden relationship or selection state in the model.
Dynamic interactions and
deployment topology require dedicated later operations and are not represented
by a generic element-creation action.

The implemented architecture snapshot removes source locations and parser
objects, sorts unordered declarations, preserves typed semantic, deployment,
view, presentation, and layout data, and serializes deterministically. Its graph
index uses kind-qualified keys so identities in different namespaces cannot
collide. It exposes deterministic containment, relationship, deployment-instance,
view-membership, upstream, and downstream traversal.

The implemented version-one semantic differ compares two canonical snapshots
by their kind-qualified stable identities. It classifies additions, removals,
renames, and other property changes independently for model elements,
Relationships, deployment, Views, presentation, and layout. One changed name
therefore remains a rename of the same object rather than a removal plus an
addition. View snapshots retain their typed stable scope reference separately
from the human-readable resolved scope, so renaming a scoped element does not
invent a second View change. Comments, formatting, declaration order, source
files, and source ranges never enter the comparison. The result has a
deterministic versioned JSON form and category summary. The compiler worker and
the experimental CLI `diff` command call this portable comparison directly;
neither frontend owns comparison semantics.

The implemented version-one impact report derives deterministic shortest
upstream and downstream paths from the validated architecture graph. A changed
Relationship starts at its resolved source and target endpoints; additions use
the later graph, removals use the earlier graph, and other changes merge both
states. Presentation- and layout-only changes never invent semantic traversal.
The portable result also lists directly affected identities and Views and is
exposed unchanged through the compiler worker and CLI.

The implemented comparison-layout stage conservatively retains baseline
geometry only for compatible leaf nodes. It never overrides nodes participating
in hard placement constraints and falls back to the later automatic geometry
when size, containment, parentage, or sibling-collision checks fail. Its
deterministic decisions make retained and rejected geometry inspectable rather
than hidden renderer behavior.

The renderer-neutral comparison scene provides `before`, `after`, `overlay`,
and `change-only` modes. Stable identities distinguish added, removed,
modified, semantically impacted, geometrically moved, and unchanged objects.
Semantic change and layout-only movement have separate encodings. Standalone
SVG metadata and a visible legend describe the encoding; PNG is derived from
the same SVG. In an overlay, earlier text is suppressed so coincident labels do
not become illegible while the earlier outline remains visible.

The implemented local Git revision adapter remains in the existing Node.js
`project-node` boundary shared by desktop and CLI frontends. It invokes the
installed Git executable without a shell and uses only read-only object and
tree queries. A file, implicit project directory, or explicit project manifest
can be loaded from a commit, tag, or branch without checkout; working source
continues through the ordinary filesystem loader. Both paths produce the same
portable project input before parsing and semantic comparison. Repository paths
and refs never enter the compiler contracts or persisted workbench session.
The experimental CLI selects these states with `--before-ref` and
`--after-ref`, where `working` names the current filesystem state.

The desktop Source Control area uses a separate working-tree adapter in that
same Node.js boundary. Through an opaque document handle it may discover the
containing local repository, report branch, upstream, ahead/behind counts,
remotes, index changes, and working-tree changes, and perform only an explicitly
requested stage, unstage, commit, or push operation. The renderer receives only
the repository display name and repository-relative paths; absolute repository
paths, credentials, and refs MUST NOT enter compiler contracts or the persisted
workbench session. Git is invoked without a shell, output and input are bounded,
interactive credential prompts are disabled, and no action may discard working
files, check out another revision, reset the worktree, pull, fetch, or rewrite
history.

A commit requires saved editor documents, a non-empty bounded message, and at
least one staged change. Push uses the configured upstream. If the branch has no
upstream and exactly one remote exists, an explicit Push sets that remote as the
upstream; zero or several possible remotes fail visibly. Hosted-provider login,
remote browsing, pull/sync, branch creation/switching, and conflict resolution
remain later adapters.

The implemented portable migration-story contract composes two or more
explicitly reviewed architecture snapshots into ordered transitions. Every
state has its own stable identity and authored or Git provenance; every change
retains the transition identities from which it was derived. Transitions reuse
the canonical semantic difference and impact contracts rather than inferring
change from rendered pixels. A deterministic offline HTML presentation embeds
the before, after, overlay, and change-only SVG for every included View,
provides step navigation and visible provenance, and contains no network
resources or executable page content. Frontends remain responsible for
selecting reviewed states and producing the comparison SVGs; the portable core
owns story validation, ordering, provenance, and presentation serialization.

The implemented analysis contract represents findings and query results with
stable rule/query identity, qualified affected items, ordered evidence, sorted
source locations, and optional proposed source corrections. Observed evidence
requires its adapter identity, observation time, and explicit confirmation
state. A versioned portable analysis
report combines the canonical snapshot and deterministic findings. The compiler
worker and the experimental CLI `analyze` command expose that same report.

The implemented version-one built-in quality evaluator promotes non-blocking
shared semantic/View diagnostics into source-located findings and adds only
facts that can be proven from the validated architecture: architecture items
that occur in no resolved View and Views that resolve to no static, dynamic, or
deployment content. Blocking syntax or semantic errors remain diagnostics
because no canonical snapshot exists for an invalid model. Findings carry a
plain-language explanation, stable rule and subject identities, authored or
derived evidence, and deterministic source locations. The CLI prints those
locations, and the workbench Output area navigates from a finding to its owning
source declaration. This built-in catalogue is compiler-owned and introduces
no public policy syntax.

The implemented version-one architecture-query engine evaluates upstream,
downstream, shortest-path, containment, deployment-placement, and resolved-View
coverage questions over the canonical snapshot and its kind-qualified graph.
Every returned item and Relationship has derived evidence explaining its
inclusion; unknown identities and absent requested paths fail explicitly.
Query results can be projected into a temporary focus View containing only
stable architecture references and their explanations. It never copies or
mutates semantic, deployment, Relationship, or authored View definitions. The
experimental CLI exposes the same portable result and focus projection through
`query`; no public source-language query syntax is accepted by this decision.

The implemented version-one architecture-policy contract is an internal,
portable compiler-core boundary over validated canonical snapshots. One
versioned policy set contains deterministic, uniquely identified rules using
exact kind-qualified stable architecture identities. Its first rule families
cover forbidden dependencies, required Relationship protocols, required
semantic ownership, allowed Relationship direction, required deployment
instances by Environment, and required element properties, metadata keys, or
tags. Evaluation never uses scene or renderer geometry. A violation becomes an
ordinary source-located analysis finding with authored policy evidence and
derived snapshot evidence. Malformed policies, unknown identities, and rules
that cannot apply to their selected architecture kinds fail with stable
`C4ML-POLICY-*` errors instead of being ignored.

An optional policy correction MUST be a complete versioned proposed source
change set with policy intent. Both a single-document change set and an atomic
project change set are accepted; raw edits or direct model mutation are not.

An explicit project MAY select exactly one local JSON policy resource through
the manifest's `policy` field. The resource MUST end in
`.c4ml-policy.json`, declare `version: 1`, a non-empty stable `id`, optional
non-empty `name`, and a non-empty `policies` array matching the portable policy
contract. It uses qualified architecture identities such as
`element:catalog-api` and `relationship:browser-calls-api`; it does not extend
or freeze the `.c4ml` grammar. The Node.js project adapter loads and validates
the bounded local resource without network access, and the compiler worker and
CLI pass the same normalized policy set to the same portable evaluator.

The CLI `analyze` command evaluates built-in and project-selected policies in
one deterministic report. `--fail-on never|error|warning` controls only its
process result: `never` is the default, `error` fails when an error finding is
present, and `warning` fails for warning or error findings. A reached threshold
returns classified exit code `6` after still emitting the full report. This is
the first CI boundary; no hosted-provider workflow or separate CI configuration
format is accepted. The desktop opens the same project policy through its typed
bridge and shows its findings in Output, but policy-resource editing and saving
remain later work.

The implemented version-one architecture-observation contract is an internal,
portable compiler-core boundary over validated canonical snapshots. A versioned
observation set contains a stable identity and deterministic, uniquely
identified observations. Each observation names one qualified architecture
identity, the producing adapter, an ISO timestamp with timezone, and a
confirmation state of `confirmed`, `unreviewed`, or `disputed`. A claim either
states presence or states the canonical value of one selected field applicable
to that architecture kind. Supported fields cover stable descriptive,
ownership, endpoint, protocol, technology, scope, deployment, group, and
interaction facts already present in the snapshot; the contract adds no C4
element or Relationship kind.

Evaluation compares each normalized claim with authored snapshot state. A
confirmed equal value is consistent and produces no finding. A confirmed
mismatch is warning-level drift. An unreviewed or disputed observation is
information-level uncertainty regardless of whether its value currently
matches source. Findings keep distinct authored and observed evidence; the
observed evidence retains adapter identity, normalized time, confirmation state,
and the observation-resource source location. Evaluation MUST NOT reconcile,
copy, or write observed values into source, model, snapshot, View, layout, or
render output. Malformed resources and fields inapplicable to their selected
architecture kind fail with stable `C4ML-OBSERVATION-*` errors.

An explicit project MAY select exactly one local JSON observation resource
through the manifest's `observations` field. The resource MUST end in
`.c4ml-observations.json`, declare `version: 1`, a non-empty stable `id`,
optional non-empty `name`, and a non-empty `observations` array matching the
portable contract. The Node.js project adapter validates path containment and
resource content for both working files and read-only Git revisions. The
desktop transports only the bounded raw local resource, and the compiler worker
and CLI pass the same normalized set to the same portable evaluator. The
resource participates in deterministic project revisions but is not an
architecture source document or editable source tab.

This local file is the first replaceable observation adapter boundary, not a
runtime, repository, cloud, or monitoring integration. Such integrations MAY
produce the same portable contract later, but remain optional frontend/importer
adapters and require their own trust, credential, freshness, and failure
decisions. No hosted-provider schema or public `.c4ml` observation syntax is
accepted.

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

### 10.1 Controlled typography

IBM Plex v6.4.2 is accepted as C4ML's controlled typography family. IBM Plex
Sans MUST be used for the desktop interface and all generated diagram text.
IBM Plex Mono MUST be confined to C4ML source and literal-code presentation;
it MUST NOT be used as the general diagram typeface.

The exact unmodified upstream files, release commit, license, and hashes are
recorded in `packages/font-ibm-plex`. The editor MUST package those files
locally and MUST NOT load fonts from Google Fonts or another runtime CDN.
Standalone SVG MUST embed the Sans WOFF2 faces it uses as validated data URLs.
Node PNG rendering MUST load the matching TTF files explicitly and MUST keep
system-font discovery disabled. The compiler's font embedding input is a
renderer contract, not a semantic-model or author-facing grammar feature.

The editor preview MUST resize the SVG's actual display box for zoom. It MUST
NOT use CSS transform scaling that can leave text rasterized at a different
resolution. Interface and preview font availability, SVG embedding, packaged
asset integrity, and PNG font loading require automated and visual evidence.

## 11. Shapes, styles, and themes

### 11.1 Shape contract

Person MUST have a dedicated built-in shape. Its compact information card MUST
show a recognizable head-and-shoulders pictogram, with the explicit type label
above the pictogram and the element title below it. Description and optional
technology text MUST remain legible without overlapping the pictogram. Other C4
element roles MAY share a box shape by default while retaining distinct type
labels and semantic theme tokens. The built-in box MUST keep a visible text
gutter after its accent rail; the gutter is at least half again as wide as the
former initial spacing. Its default accent rail MUST leave deliberate equal
clearance at its top and bottom. Project presentation MAY hide that rail or
override only its six-digit hexadecimal color and percentage transparency;
omitted values retain the semantic theme accent and full opacity. Shape
selection MUST NOT change the element's
C4 kind, ownership, identity, validation, or view eligibility.

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

### 13.1 Experimental CLI slice

A thin Node.js CLI is implemented for the currently executable `draft-1`
language slices. It delegates parsing, semantic validation, view
resolution, layout, scene construction, SVG serialization, and PNG
rasterization to the same packages used elsewhere. It supports validation,
semantic comparison of two valid files or projects, optional stable visual
comparison of one shared View in all four comparison modes, one-view or
all-view rendering, SVG and PNG selection, PNG scale, output
directory selection, human or JSON diagnostics, version reporting, and the
documented exit classes `0`, `2`, `3`, `4`, and `5`.

The CLI additionally accepts an explicit project manifest or project directory
for the executable architecture-source subset. Direct `.c4ml` input remains the
implicit single-document mode. A directory with several root sources requires
an explicit manifest. Project loading and path containment remain Node.js
frontend behavior; the language and compiler receive only portable documents.

This is an implementation foundation, not the accepted final public CLI contract. Command
names remain provisional and there is no distributable package yet. SVG embeds
the controlled IBM Plex Sans WOFF2 faces; PNG uses matching local TTF faces with
system-font discovery disabled. The spike still does not satisfy the complete-
language or release-packaging requirements.

## 14. Editor

### 14.1 MVP editor

The first-release editor is exclusively an Electron desktop application. Its
sandboxed Angular renderer uses local web-platform APIs and Web Workers, but it
is not shipped, hosted, or supported as a standalone browser application. The
internal renderer harness exists only for isolated development and visual
testing. The desktop shell MUST NOT change the worker, compiler, or
source-editor contracts.

The MVP editor MUST provide:

- a source-code pane;
- a graphical SVG preview pane;
- hot compilation after source changes;
- source-located diagnostics;
- retention of the last valid preview while the current source is invalid;
- cancellation or rejection of stale compilation results;
- zoom, pan, and fit-to-view controls;
- native Open, Save, and Save As for `.c4ml` source, plus protection against
  silently discarding unsaved changes;
- SVG and PNG export through the same compiler/rendering contracts as the CLI;
- navigation from source declarations to preview elements; and
- navigation from preview elements to source declarations.

Compilation and language processing MUST run outside the renderer UI thread.
The editor MUST remain responsive while a compile is in progress.

### 14.2 Source-to-graphics mapping

The compiler MUST preserve a traceable mapping between source ranges, syntax
nodes, stable semantic IDs, scene-graph nodes, and SVG elements. This mapping is
required for diagnostics and navigation in the MVP and for direct manipulation
in a later release.

### 14.3 Graphical source manipulation

The editor allows intent-based placement, alignment, distribution, nudge, and
explicit exact-position actions for selected elements. It also allows cardinal
Port choice and source-backed add, move, remove, and automatic-reset operations
for selected effective Routes. For the five static C4 views, it can create the
context-valid architecture element type or connect a context-valid directed
pair through source-backed semantic operations. Dynamic interactions and
deployment topology require their own later graphical actions.

The source text MUST remain the source of truth. A graphical operation must
produce an explicit, undoable source edit rather than hidden editor-only state.
Layout operations and semantic architecture operations MUST be distinct tools.
The editor SHOULD use minimal syntax-aware text edits that preserve comments and
unrelated formatting.

A graphical move SHOULD first emit or update semantic `place`, `align`, or
`distribute` source. A nudge SHOULD emit or update `adjust` relative to the
automatic candidate. Only an explicitly chosen exact-position action SHOULD
emit a `pin` with `du` coordinates. No graphical operation may persist a hidden
pixel offset.

Graphical Route manipulation and the bounded static-view semantic operations
above are current implemented editor slices. Broader semantic manipulation is
not a current acceptance requirement, but the compiler and source mapping MUST
NOT preclude it.

### 14.4 Guided modeling wizard

A guided wizard provides an additional way to create or extend a model. It
MUST be usable by people who recognize their architecture's parts and
connections but do not have C4 vocabulary ready. Questions MUST therefore use
plain task and domain language first. C4 names SHOULD appear as short optional
translations that teach without blocking progress. For example, ask what runs,
is deployed, or is operated separately before explaining that C4 calls such a
unit a Container.

The wizard should ask context-sensitive questions
about the architecture, including:

- people and software systems;
- Containers, Components, Code Elements, and their ownership;
- responsibilities, technologies, classifications, and other required C4
  metadata;
- directed relationships, their architectural intent, and applicable
  technologies or protocols;
- views, scopes, audiences, and purposes;
- deployment environments, nodes, infrastructure, and instances; and
- optional Visual Groups and presentation or layout preferences where they are
meaningful.

Each answer control SHOULD provide progressive, on-demand help in the selected
interface language. The help MUST distinguish visible names and authored
descriptions from stable source IDs, reference tokens, protocols, and layout
preferences without requiring users to infer those distinctions from examples.

Available questions and choices SHOULD be derived from the current semantic
context. For example, Component questions require a selected owning Container,
and Code Element questions require a selected owning Component. Relationship
questions must offer only valid source and target elements for the active C4
scope while still allowing the user to return to earlier answers.

The result of the interview MUST be ordinary, explicit C4ML source that can be
reviewed, compiled, edited, formatted, versioned, and processed by the CLI or
editor like hand-authored source. The wizard MUST NOT create a private model,
hidden relationships, or editor-only architecture state. It MUST use the same
semantic validation and stable-identity rules as every other source-producing
operation.

Before applying generated source, the editor SHOULD show the proposed source
and resulting diagnostics or preview. Applying, cancelling, and undoing the
wizard operation MUST be explicit. Whether the first wizard creates only new
documents or can also extend existing source without disturbing comments and
formatting remains an open interaction-design decision.

The implemented experimental wizard currently chooses the conservative
new-document-only behavior and supports bounded System Context and Container
starters. This is foundation evidence, not acceptance of the final wizard
interaction model; Components, Code, deployments, Visual Groups, and safe
extension of existing documents remain open and unimplemented.

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

- final public source extension and pre-release legal/trademark clearance for
  the accepted C4thedral product name;
- exact source grammar and formatting rules;
- optional sidecar layout organization beyond normal View fragments;
- module, alias, reusable-library, and external-project namespace rules beyond
  the implemented flat explicit project;
- whether custom element kinds are allowed in strict C4 mode;
- the complete constraint-solving strategy beyond the implemented intent,
  adjustment, and exact-pin slice;
- whether C4ML owns the full orthogonal router in the MVP or initially wraps a
  replaceable routing engine;
- the accessibility target for generated SVG.

The project license and initial distribution decision are accepted: C4thedral
and C4ML are open source under Apache License 2.0. Packaging formats and release
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
- Public requests concerning durable manual layout, automatic-layout
  readability, model transformations, visual Git diffs, and approachable
  onboarding:
  <https://github.com/likec4/likec4/discussions/343>,
  <https://github.com/structurizr/ui/discussions/98>,
  <https://github.com/likec4/likec4/discussions/1192>,
  <https://github.com/likec4/likec4/issues/1919>
- Structurizr perspective highlighting:
  <https://docs.structurizr.com/ui/diagrams/perspectives>
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
- IBM Plex v6.4.2 and its SIL Open Font License 1.1:
  <https://github.com/IBM/plex/tree/v6.4.2>,
  <https://github.com/IBM/plex/blob/v6.4.2/LICENSE.txt>
- Penrose separation of domain, substance, and style:
  <https://penrose.cs.cmu.edu/docs/ref>,
  <https://penrose.cs.cmu.edu/docs/ref/substance/overview>,
  <https://penrose.cs.cmu.edu/docs/ref/style/overview>
