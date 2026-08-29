# C4ML Testing Strategy

Status: Draft 0.27

Date: 2026-08-29

This document defines how C4ML behavior will be verified. It is normative for
testing once implementation begins. `SPEC.md` defines product behavior; this
document defines the evidence required to claim that behavior works.

Vitest is accepted for unit and adapter-contract tests. The verified
commands are:

- `pnpm run build` for generated-language and TypeScript build validation;
- `pnpm run check:browser` for in-memory browser bundle validation;
- `pnpm run typecheck` for source and test type checking;
- `pnpm run test` for the current semantic, view, adapter, language, and editor
  test suite;
- `pnpm run check:editor-production` for the accepted Monaco and ELK.js
  versions, version-sensitive integration points, the unmodified packaged ELK
  worker, reviewed IBM Plex assets, and packaged license notices;
- `pnpm run check:desktop-production` for pinned desktop dependencies, secure
  main/preload boundaries, CSP, and required packaged editor resources;
- `pnpm run check` for the complete current gate;
- `pnpm run editor:build` for the production-mode Angular editor build;
- `pnpm run desktop:smoke` for the built Electron shell and live compiler
  worker;
- `pnpm run desktop:package` for the unpacked current-platform application;
- `pnpm run desktop:make` for current-platform installer/archive artifacts;
- `pnpm run demo:render` for the ignored visual reference export; and
- `pnpm run c4ml -- version` for the built experimental CLI entry point.

All commands run locally after dependency installation and require no compiler
service or runtime network access.

The Phase 1 semantic evidence uses the original `signal-garden` fixture in
`packages/compiler-core/test`. The compiler-core suite currently verifies the
complete static element family, source-located semantic failures, deployment
reference failures, all seven view projections, cross-level selection errors,
stable object identity, default view guidance, Dynamic ordering and parallel
groups, collaboration/sequence equivalence, nested Deployment Nodes, relevant
Infrastructure Nodes, and declaration-order independence. Rendering and visual
evidence now also covers deterministic diagram preparation, semantic and Visual
Group parentage, automatic/guided/fixed route policies, fixed-route rejection,
hard and soft relative placement, anchored multi-element edge/axis alignment,
ordered equal-gap distribution, automatic-relative adjustment, exact pinning,
multi-location hard-conflict diagnostics, deterministic declaration-order
handling, inspectable relaxed soft constraints,
explicit source/target Ports, scene-owned Arrowheads, safe custom-shape
validation and assignment, renderer-neutral scene construction, semantic theme
roles and presets, stable SVG, ELK absolute compound geometry, SVG-to-PNG
rasterization, validated embedded WOFF2 faces, controlled TTF rendering with
system fonts disabled, and a visually inspected Signal Garden Container View.
This is not yet a golden suite or complete rendering evidence for all seven
views.

The experimental language package adds a narrow integration suite for the
original `hello-context.c4ml`, `hello-container.c4ml`, and
`hello-static-zoom.c4ml`, `hello-dynamic.c4ml`, and `hello-deployment.c4ml`
slices. It verifies parsing and explicit AST-to-domain lowering, typed ownership
and required properties from Software System through Code Element, relationship
technology and protocols, all four static view scopes, named Landscape scope,
ordered and parallel Dynamic Interactions, Deployment Environments, nested
Deployment Nodes, Infrastructure Nodes, static instances, deployment
relationships, all seven view types, static Relationship references,
environment-scoped completion references, exact source locations, stable
diagnostics for unresolved references and invalid property cardinality,
semantic stability across comments and whitespace, view-local route lowering,
view-local intent placement, multi-element alignment, ordered distribution,
automatic-relative adjustment, named/step/du measurement, and pin lowering,
absolute corridor and lane selection, guided cardinal Ports, fixed point lists,
relative Port/element/canvas anchors, ordered locked segments, hard and soft
avoidance declarations and selection, label placement, policy-combination
diagnostics, route-context completion,
browser bundling without Node.js polyfills, and deterministic SVG through the
shared compiler pipeline. This evidence does not claim coverage of the complete
preview grammar.

The current constraint-solver foundation covers the executable intent hierarchy
in `SPEC.md`: left/right/above/below placement, anchored multi-element edge and
center alignment, explicitly ordered equal-gap distribution, directional and
axis adjustment relative to automatic candidate geometry, named gap presets,
`step` and exact `du` conversion, and individual pins. It verifies coexistence
with automatic candidate geometry, hard positions, soft relaxation warnings,
hard failures with all source locations, and deterministic results independent
of unordered constraint declaration order. General row/column membership,
grouped minimum gaps, preferred proximity, bounded movement, constrained size,
and group-spanning constraints still require the remaining Section 2.5 evidence.

The Angular editor foundation adds typed worker-runtime, editor-session, and
source-editor adapter evidence. It verifies deterministic source-to-SVG
compilation, invalid-source diagnostics, monotonic request identifiers,
rejection of deliberately out-of-order results, retention of the last valid
SVG, context-valid completion ranges, exact completion and marker translation,
lexer-owned syntax-span classification, semantic-token delta encoding, stale
asynchronous completion and highlight settlement, deterministic Context and
Container wizard source, normal compilation of that source, explicit Container
connections and protocols, cancel behavior, and explicit undo. The
worker and navigation-helper suites additionally verify deterministic
source/scene/SVG mappings, smallest-range source selection, smallest-bound
preview hit testing, object-fit coordinate conversion, last-valid navigation
retention, route-control source mapping, polyline-distance hit testing with
node/route/boundary precedence, effective corridor geometry, and preview-only
node, Route, Port, route-label, and corridor highlighting, preview-only relative
waypoint, locked-segment, and avoidance overlays, plus distinct detail
navigation targets. The production-mode Angular build
proves that compiler services and Monaco's
generic editor service are separate worker chunks, that Monaco's runtime is
lazy, and that the reviewed ELK worker and license are packaged locally.
Browser verification covers the two-pane layout, lexer-owned syntax
highlighting, ELK-produced live preview, an
in-place context-only completion popup, exact candidate application, inline
diagnostic markers, diagnostic-to-source focus, invalid edit diagnostics,
keyboard undo/redo, visible last-valid-preview state, wizard/Monaco source
synchronization, visually inspected Component, Code, System Landscape,
Dynamic, and Deployment previews, view selection, zoom, the guided wizard,
generated-source review, apply, and undo. The production bundled adapter
compiles executable slices for all seven view types in worker-runtime tests;
the current browser-specific ELK pass visually covers a System Context with two
guided routes, distinct target Ports, a named corridor and label shifts, plus a
nested Deployment View. Route-block completion was inspected with the active
policy and existing properties. Bidirectional navigation was visually inspected:
selecting the `garden-pulse` declaration highlighted only Garden Pulse, and
clicking Sensor Post in the preview selected and revealed its complete source
declaration. Relationship/Route navigation was also inspected in both
directions: clicking the corridor-guided observation path selected its semantic
Relationship and displayed its effective routing data; selecting the other
view-local `route` block highlighted only its effective path and inspector.
The Route Debug toggle removed helper points, Ports, label anchor, and corridor
lanes while retaining selection. The browser accessibility tree was inspected;
a real screen-reader pass is not yet complete. Typography verification confirms
that the interface resolves IBM Plex Sans and Monaco resolves IBM Plex Mono,
including regular and bold faces. The preview was visually inspected at 80,
100, and 120 percent; its rendered box changed size while computed CSS
`transform` remained `none`.

The editor architecture suite additionally protects the independent Compile,
Language, and Authoring worker-contract modules and their small composed
transport boundary. Production build validation covers the focused workbench
facades for document/export, preview, help, and command-palette state. Existing
runtime and session suites continue to exercise the unchanged public protocol
barrel and stale-response behavior.

The English workbench and the live German switch were visually inspected in the
packaged macOS application. The Settings panel, activity and output areas,
status and accessibility copy, command surface, and first wizard step changed
without layout damage; authored source and diagram labels remained unchanged.
The complete owned native menu tree, including File, Edit, View, Window, and
their standard actions, changed to German in the same session, and the German
preference survived an application relaunch. The local inspection state was
returned to English afterward.

The local workbench-preference suite verifies English language defaulting,
English/German round trips, backward-compatible version-one records,
field-level fallback, malformed JSON and unsupported-version fallback, bounded
half-pixel interface and editor font sizes, effective system/light/dark resolution, and controlled
font-stack mapping. Localization-contract tests verify both catalogues and
interpolation, while command tests verify search in each language. Browser and
desktop verification MUST also cover live language and scheme changes, the
document root language attribute, interface typography changes at minimum,
default, and maximum size without changing Monaco or canonical SVG, every
packaged Monaco font choice, font remeasurement after loading, persistence across
relaunch, reset, unavailable storage, modal focus containment and return,
Escape dismissal, native `Cmd/Ctrl+,` opening, and the invariant that preference
changes neither dirty source nor change canonical SVG output.

Editor-font tests MUST additionally verify the default-enabled ligature
preference, explicit disabling, backward-compatible loading of older version-one
records, family-specific `ss01` and `dlig` mappings, and unchanged source text
and canonical SVG while ligatures are toggled.

The Monaco-theme suite MUST verify explicit normal, highlighted, selected, icon,
and focus colors for both workbench schemes. Normal, highlighted, and selected
text/background pairs require a computed contrast ratio of at least 4.5:1.
Browser inspection MUST open the completion list in both light and dark schemes
and confirm the focused row remains legible.

The local-handbook suite MUST verify that every help-topic identifier has
English and German content, search is deterministic in both languages, only
the executable `draft-1` set is marked available, and examples contain no
external asset reference. Language-package tests MUST map representative model,
relationship, view, deployment, layout, and route cursor positions to stable
topic identifiers and reject offsets outside the source. Worker and editor-
session tests MUST validate the versioned request/response boundary and reject
stale cursor-context responses. Browser verification MUST cover Help activity
navigation, expandable chapters, localized search, the cursor topic, `F1`,
command-palette access, diagram/Handbook tab switching, keyboard focus, and
legibility in both light and dark schemes. Help navigation MUST leave source,
dirty state, and canonical SVG unchanged.

The Electron desktop foundation adds unit and boundary evidence for its
versioned bridge, runtime request validators, opaque document handles, filename
normalization, local protocol traversal rejection, and hardened web
preferences. It also validates the bounded English/German UI-language message,
bridge, menu, dialog, and close-warning contract. The production boundary check pins the reviewed Electron/Forge
stack and licenses, verifies that the preload has no filesystem access, checks
the local-only CSP, and requires the editor, worker, fonts, resvg native binary,
and notices before packaging. A smoke test from the packaged macOS `.app`
verifies the bridge, Monaco host, valid compiler state, preview, controlled
Sans/Mono typography, and in-memory native PNG rasterization.
The application was
visually inspected as a native two-pane workbench with its native menu. The
macOS application passes strict deep code-signature verification after ad-hoc
signing; its DMG passes `hdiutil verify`, and its ZIP passes archive integrity
testing. Native file-dialog interaction and the Windows installer remain
manual/platform-specific evidence.

The experimental CLI suite exercises successful validation, source-located JSON
diagnostics, one-view SVG output, all-view SVG and PNG output, PNG scaling,
stable view selection, paths containing spaces and non-ASCII characters,
invocation with a working directory outside the repository, and distinct usage,
source, and environment exit classes. The suite also renders selected Dynamic
and Deployment Views. A direct root-level smoke invocation produced Deployment
SVG and PNG through the built entry point; the PNG was visually inspected.

## 1. Testing principles

1. Test behavior at the lowest useful layer and again at critical integration
   boundaries.
2. Treat semantic correctness, geometry correctness, and visual appearance as
   separate concerns.
3. Prefer structural assertions over large opaque snapshots.
4. Use visual golden tests for appearance, not as a substitute for invariants.
5. Make all fixtures original to this project.
6. Make test output deterministic and independent of system fonts, locale,
   timezone, and network access.
7. A golden file may change only after the semantic and visual difference has
   been reviewed.

## 2. Test layers

### 2.1 Lexer, parser, and syntax tree

Tests MUST cover:

- every grammar production;
- comments and whitespace;
- Unicode identifiers or labels according to the final grammar decision;
- string escaping and multiline text;
- incomplete input and error recovery;
- precise source ranges;
- formatter idempotence; and
- round-trip behavior where the chosen syntax-tree design supports it.

Negative tests MUST assert stable diagnostic codes and relevant source ranges,
not only message text.

### 2.2 Reference resolution and semantic model

Tests MUST cover:

- stable identifier uniqueness;
- valid and invalid cross-references;
- C4 containment rules;
- Code Element kinds and Component ownership;
- Deployment Environment, nested Deployment Node, and Infrastructure Node
  validation;
- Software System Instance and Container Instance resolution;
- ordered and parallel Dynamic Interaction validation;
- relationship source and target validation;
- relationship direction, labels, and required Container protocols;
- view scope and inclusion rules;
- tag and metadata handling;
- separation of visual groups from semantic containment; and
- identical semantic models from formatting-only source changes.

### 2.3 View resolution

Tests MUST prove that:

- System Landscape, System Context, Container, Component, Code, Dynamic, and
  Deployment Views select only their permitted primary and supporting elements;
- excluded elements do not leave invalid visible relationships;
- the same element retains identity across multiple views;
- view-local styles and layout do not mutate the semantic model; and
- title, scope, type, and legend data are available to the renderer.

Every view type MUST also be tested for its default intended audience, purpose
metadata, and official C4 usage guidance. Author overrides MUST not change view
scope or semantic validity.

The suite MUST contain negative tests for every illegal cross-level inclusion,
including Containers in a System Context View, Components in a Container View,
Code Elements outside their Component, and deployment instances that do not
resolve to the static model.

The completeness profile MUST verify titles, legends, descriptions, explicit
element types, Container and Component technologies, acronym/glossary coverage,
unidirectional relationship labels, Container protocols, and explanations for
all non-default visual encodings.

Dynamic View tests MUST prove ordering, parallel groups, static-relationship
resolution, collaboration rendering, sequence rendering, and semantic
equivalence between both presentations.

Deployment View tests MUST cover multiple environments, nested Deployment
Nodes, Infrastructure Nodes, repeated instances, environment-specific details,
and preservation of static-model identity.

Visual Group tests MUST prove that:

- grouping does not change the view's elements, relationships, or C4 ownership;
- only items already visible in the resolved view can become members;
- static elements preserve object identity through resolved group membership;
- Deployment Nodes, Infrastructure Nodes, and deployment instances can be
  grouped in Deployment Views;
- nested groups resolve deterministically;
- empty IDs, duplicate IDs, empty titles, empty membership, invalid padding,
  unknown members, repeated direct membership, and cycles produce stable
  source-located diagnostics;
- groups and members remain deterministic after declaration reordering; and
- generated legends explain the Visual Group boundary.

The first-release suite MUST reject overlapping sibling groups. Future support
for explicitly overlapping visual regions requires a separate specification and
must not weaken semantic containment rules.

### 2.4 Layout adapter contract

Every automatic-layout adapter MUST pass the same contract suite. The suite MUST
verify:

- all requested nodes receive finite geometry;
- containment boundaries enclose their children;
- ports returned by the adapter are normalized;
- adapter-specific IDs and units do not leak into later stages;
- seeded or configured runs are deterministic; and
- unsupported capabilities fail explicitly rather than being ignored.

Tests MUST NOT assume ELK-specific output in the engine-neutral contract.

### 2.5 Constraint solver

Tests MUST cover each constraint independently and in combinations:

- left/right/above/below;
- row and column membership;
- horizontal and vertical alignment;
- explicit ordering;
- minimum gaps;
- anchored multi-element edge and center-axis alignment;
- equal-gap distribution in explicitly authored order;
- named gap, layout-step, and exact diagram-unit conversion;
- directional and signed-axis adjustment from automatic candidate geometry;
- soft proximity;
- pinning and bounded movement;
- fixed or constrained size;
- nested boundaries; and
- constraints spanning groups where permitted.

For hard conflicts, tests MUST assert:

- compilation fails;
- the diagnostic identifies the conflicting constraints;
- all relevant source locations are attached; and
- no misleading output artifact is reported as successful.

For soft conflicts, tests MUST assert the documented relaxation and diagnostic
behavior.

### 2.6 Ports and routing

Routing tests MUST cover:

- automatic, guided, and fixed authorship policies;
- direct and orthogonal route styles;
- all cardinal source and target ports;
- self-relationships if supported;
- parallel relationships;
- opposing relationships;
- routes across containment boundaries;
- automatic obstacle avoidance;
- complete and partial waypoint lists;
- relative and absolute waypoints;
- named horizontal and vertical corridors;
- deterministic lane assignment and explicit lane selection;
- rejection when two relationships select one exclusive lane;
- locked segments combined with automatically completed segments;
- hard and soft avoidance regions;
- intentional shared segments and junctions only when explicitly authored;
- label placement on every segment orientation and on an explicitly selected
  segment;
- preservation of guided routes after an unrelated graph change;
- local rerouting after one related element or relationship changes;
- dense connection fans entering and leaving both sides of a central boundary;
- inspectable pre-SVG route controls and effective routes; and
- failure when a hard manual route is geometrically impossible.

Structural assertions MUST detect paths through element interiors, invalid port
attachment, duplicate zero-length segments, unintended diagonal segments in an
orthogonal route, corridor-capacity violations, two relationships accidentally
occupying the same exclusive lane, silently ignored hard guidance, and labels
outside the canvas.

Every effective route MUST expose exactly one source Port and one target Port.
Tests MUST prove that each Port retains its relationship, endpoint owner,
source/target role, compass side, and effective point, and that the Route refers
to those Ports without becoming a second semantic Relationship.

### 2.7 Scene graph and SVG

Scene-graph tests MUST verify stable ordering, IDs, bounds, text content,
arrowheads, metadata, and style precedence.

Scene tests MUST prove that Ports and Arrowheads are explicit objects before
SVG serialization, that every Route references two existing Ports, and that
every directed Route has exactly one Arrowhead whose tip overlaps its target
Port by the documented amount. The SVG renderer MUST consume that geometry
rather than calculate a second arrowhead independently.

Relationship-label tests MUST prove that label clearance interrupts its Route
without producing a visible banner, renders below elements and Arrowheads, and
never obscures a node surface even when label bounds approach a Port.

Shape tests MUST verify:

- the built-in Person shape is distinct from the default box shape;
- its type, head-and-shoulders pictogram, title, and description occupy distinct
  vertical regions without overlap;
- all definitions use a 100 x 100 normalized canvas;
- content boxes and primitive geometry remain finite and inside that canvas;
- all four cardinal Ports exist on their matching canvas sides;
- only rectangles, ellipses, polygons, and lines enter the renderer contract;
- shape paint uses semantic `surface`, `accent`, and `detail` roles;
- duplicate IDs, empty primitives, malformed geometry, and invalid Ports fail
  with stable diagnostics;
- assigning a shape changes presentation and effective Port geometry without
  changing C4 kind, ownership, identity, or view eligibility; and
- SVG output contains no script, external asset, CSS, font, filter, or image
  content sourced from a shape definition.

Theme tests MUST verify:

- every renderable semantic element role has internal and external tokens;
- bundled preset text contrast is at least 4.5:1;
- deep overrides change only the selected token and preserve their base preset;
- unknown presets and malformed colors produce stable diagnostics; and
- resolved theme, element-role, and element-state metadata reaches SVG.

SVG tests MUST include:

- XML parsing and schema-relevant structural checks;
- normalized snapshots with volatile metadata removed;
- no external network references;
- unique IDs and valid internal references;
- correct `viewBox` and bounds;
- selectable text where required;
- title and description metadata;
- validated embedded WOFF2 faces with no external font URL; and
- equivalent semantic content to the scene graph.

Raw SVG byte snapshots SHOULD be avoided until canonical serialization is
defined. Normalized SVG MUST be byte-stable for identical inputs.

### 2.8 PNG rendering

PNG tests MUST verify:

- requested dimensions and scale;
- transparent and configured backgrounds;
- no clipping;
- consistency with SVG bounds;
- explicit controlled TTF files with system-font discovery disabled; and
- visually equivalent content to the SVG source.

The production `@c4ml/render-resvg` adapter suite MUST also assert its stable
adapter identity, stable `C4ML-PNG-*` input diagnostics, and rejection of
unresolved external image resources.

On the reference platform, deterministic PNGs SHOULD be byte-stable. Across
supported platforms, image comparison MAY allow a small documented
anti-aliasing tolerance, but no geometry, text-wrapping, color, or missing-content
difference.

### 2.9 CLI end-to-end tests

CLI tests MUST cover:

- validation success and failure;
- rendering one view and all views;
- SVG-only, PNG-only, and combined output;
- output path behavior;
- machine-readable diagnostics;
- exit-code classes;
- missing input and unwritable output errors;
- invocation from a directory outside the project;
- paths containing spaces and non-ASCII characters; and
- fully offline operation.

### 2.10 Editor and compiler parity

Editor tests MUST cover:

- compilation in a browser Web Worker rather than on the UI thread;
- debounced or scheduled hot compilation after source changes;
- cancellation or rejection of results from superseded compilations;
- retention of the last valid preview while current source contains errors;
- current diagnostics replacing obsolete diagnostics;
- source-to-preview and preview-to-source navigation;
- stable mapping from source ranges through semantic and scene IDs to SVG;
- zoom, pan, and fit-to-view behavior without geometry mutation or CSS
  transform scaling;
- SVG and PNG export; and
- operation without a compiler service or network connection.

A shared contract suite MUST run the same effective source through the Node.js
CLI path and browser-worker path. It MUST compare diagnostics, semantic model,
resolved views, final geometry, scene graph, and canonical SVG. Frontend-specific
serialization MUST NOT change compiler behavior.

Race tests MUST deliberately deliver worker responses out of order and prove
that the editor never displays an obsolete result.

The current editor foundation covers worker execution, scheduled compilation,
out-of-order response rejection, current diagnostics, and last-valid-preview
retention for the experimental static zoom subsets. It also covers
context-completion requests, exact text edits, selection of a declared view by
stable identifier, Monaco marker translation, diagnostic-to-source navigation,
keyboard undo/redo, source synchronization, zoom, fit, scroll-pan at enlarged
scale, SVG download, and bidirectional source/preview node navigation through
stable source, scene, and SVG identities. Relationship and effective-Route
selection, semantic and route-control source mapping, route hit testing, and a
preview-only routing-debug overlay are covered too. Local Plex font loading,
standalone-SVG embedding, transform-free preview zoom, and native PNG export are
covered too. Ports, route labels, and corridors are individually selectable
detail targets that resolve to their owning route-control source. It does not
yet satisfy individually selectable Arrowheads, full CLI parity, real
assistive-technology coverage, or complete-source coverage requirements in
this section.

If the guided modeling wizard is implemented, tests MUST prove that identical
answers generate deterministic C4ML source, generated source passes through the
normal parser and semantic validator, only context-valid ownership and
relationship choices are offered, cancellation leaves source unchanged, and an
applied generation is undoable. Character-by-character edits in dynamic wizard
rows MUST keep the active control mounted and focused even when an answer also
changes its generated technical identifier. Tests that extend existing
documents MUST also verify that unrelated declarations, comments, stable
identifiers, and formatting are not silently rewritten.

The current new-document-only wizard foundation proves deterministic System
Context and Container generation, normal parser and semantic validation,
dynamic part and connection validation, explicit direction and protocol,
stale-result rejection, cancel without source changes, and one explicit undo.
Interaction review also checks that questions can be completed from familiar
architecture concepts without prior C4 vocabulary. Existing-document
preservation tests do not apply until that separate capability is designed and
implemented.

### 2.11 Desktop shell and packaging

Desktop tests MUST cover:

- runtime validation of every privileged renderer request;
- rejection of IPC from untrusted pages and denial of external navigation,
  windows, permissions, and webviews;
- context isolation, renderer sandboxing, disabled Node.js integration, and a
  preload surface limited to the versioned C4ML bridge;
- path-traversal rejection for the owned local application protocol;
- opaque document handles and the configured source-size limit;
- native Open, Save, Save As, cancellation, failure reporting, dirty titles,
  and unsaved-close protection;
- native PNG export cancellation, validation, 1x/2x/3x scaling, controlled
  fonts, failure reporting, and faithful canonical-SVG rasterization;
- safe local workbench-session persistence that excludes source, handles, and
  filesystem paths;
- native Settings opening through the application menu and `Cmd/Ctrl+,`;
- validated English/German synchronization of C4ML-owned native menu commands,
  dialog labels, failure copy, and unsaved-close protection;
- packaging without development sources or an application `node_modules`
  tree;
- required editor workers, fonts, licenses, and notices in the application;
- the configured production Electron fuses;
- launch and live compilation from the packaged application; and
- signature, installer/archive integrity, installation, launch, file round
  trip, and uninstall behavior on every supported release platform.

Automated tests may substitute adapters for native dialogs, but at least one
manual file round trip and close-protection check is required on each supported
desktop platform before release. Apple Developer ID signing/notarization and
Windows signing MUST be checked with release identities; ad-hoc signing is only
local development evidence.

### 2.12 Intent-based authoring

Before graphical source editing is claimed, contract and integration tests MUST
prove that:

- every graphical operation produces a deterministic proposed source change
  set against an explicit source revision;
- edits are syntax-aware, non-overlapping, previewable, and rejected when their
  source revision is stale;
- previewing an edit does not mutate source, dirty state, compiler state, or
  canonical output;
- applying one operation creates one editor undo unit and undo restores the
  exact preceding source;
- comments, unrelated formatting, stable identifiers, and unrelated
  declarations remain unchanged;
- nudge, alignment, distribution, exact positioning, Port selection, and route
  guidance produce their corresponding source intent rather than hidden editor
  geometry;
- the proposed source passes through the normal parser, semantic validator,
  compiler, and diagnostic pipeline before it can be accepted; and
- CLI and browser-worker compilation remain equivalent after an applied edit.

Tests MUST distinguish semantic architecture operations from view-local layout
operations. UI event coordinates and Monaco edit objects MUST NOT enter the
portable authoring contract.

### 2.13 Semantic architecture evolution

Semantic comparison tests MUST use original before/after fixture pairs and
prove that:

- matching uses stable identities, so a rename is not reported as removal plus
  addition;
- formatting, comments, declaration order, and source ranges do not create
  architecture changes;
- additions, removals, and modifications are classified separately for model,
  relationship, view, deployment, presentation, and layout data;
- impact paths contain only validated semantic references and remain
  deterministic;
- unchanged regions retain their baseline geometry within the declared
  stability policy when a comparison is rendered;
- the normalized comparison is byte-stable for identical input snapshots; and
- repository or Git adapters cannot alter comparison semantics.

Visual review MUST inspect before, after, overlay, and change-only presentation
for at least one local semantic change and one layout-only change. The review
must demonstrate that layout noise cannot masquerade as architecture change.

### 2.14 Architecture proof

Rule and query tests MUST prove that:

- rule identities, severities, affected stable identities, evidence paths, and
  source locations are deterministic;
- evaluation consumes validated compiler contracts and never derives
  architecture facts solely from rendered geometry;
- the same rule set returns equivalent findings through CLI and browser-worker
  paths without network access;
- changing presentation alone cannot change a semantic rule result;
- a suggested correction is an optional proposed source change set and never a
  direct semantic-model mutation;
- malformed, unknown, or inapplicable rules fail with stable diagnostics; and
- imported or observed evidence is attributed to its adapter and cannot
  silently replace authored facts.

Original fixtures MUST cover at least a forbidden dependency, a missing
required protocol, a deployment/static-model inconsistency, a multi-hop impact
query, and an external observation that disagrees with authored architecture.

## 3. Original fixture catalog

All fixtures below must be designed specifically for C4ML. They must not be
adapted from another tool's banking, shopping, or sample architecture.

The initial catalog SHOULD include:

1. `signal-garden-context`: one person, one focal system, and two external
   systems with labeled relationships;
2. `signal-garden-containers`: nested application, worker, queue, and data store;
3. `workshop-components`: components with mixed relationship directions inside
   one container;
4. `four-port-compass`: relationships using every cardinal port combination;
5. `crossing-pressure`: a small graph whose naive layout produces crossings;
6. `constraint-grid`: rows, columns, ordering, alignment, and gaps;
7. `pinned-island`: one fixed element surrounded by automatically placed
   elements;
8. `guided-routes`: automatic orthogonal routes with partial and complete
   waypoints;
9. `nested-boundaries`: relationships within and across multiple boundaries;
10. `conflicting-constraints`: minimal hard conflicts with exact diagnostics;
11. `long-labels-unicode`: wrapping, punctuation, German text, and non-ASCII
    labels; and
12. `incremental-stability`: a before/after pair with one local model change;
13. `code-workbench`: one Component containing several original code-element
    kinds and relationships;
14. `signal-garden-dynamic`: one ordered scenario with sequential and parallel
    interactions rendered in collaboration and sequence styles;
15. `signal-garden-deployment`: development and production environments with
    nested Deployment Nodes, infrastructure, and repeated instances; and
16. `complete-notation-profile`: title, legend, descriptions, technologies,
    protocol labels, glossary entries, and explained visual encodings; and
17. `shape-gallery`: the original built-in Person and box shapes plus original
    custom rectangle, ellipse, polygon, and line compositions with every
    cardinal Port.

Fixture names, domain stories, labels, and visual designs are original project
assets and fall under the project's eventual license.

## 4. Determinism and stability tests

Every golden fixture MUST be compiled repeatedly in fresh processes. The tests
MUST compare:

- normalized semantic model;
- resolved view graph;
- final geometry;
- normalized scene graph;
- canonical SVG; and
- PNG result according to the platform policy.

Metamorphic tests MUST confirm that these source changes do not affect geometry:

- whitespace changes;
- comment changes;
- line-ending changes;
- declaration movement that is semantically unordered; and
- unrelated additions outside the rendered view.

The incremental-stability fixture MUST measure movement of unaffected elements.
The acceptance threshold must be fixed after the first layout spike provides
evidence; it must not be chosen retroactively to make a failing implementation
pass.

## 5. Property-based and fuzz testing

After a stable semantic model exists, generated tests SHOULD create bounded,
valid C4 graphs and assert:

- no non-finite coordinates;
- no element has negative dimensions;
- all children are within their boundaries;
- all route endpoints attach to their declared elements or ports;
- orthogonal routes contain only axis-aligned segments;
- rendering terminates; and
- parsing rendered or serialized internal forms does not corrupt identity.

Invalid-input fuzzing SHOULD target lexer/parser recovery and diagnostic
robustness. It MUST enforce time and memory limits.

## 6. Performance tests

Performance targets will be set after the first spike. Benchmarks MUST separate:

- parsing and validation;
- view resolution;
- automatic layout;
- constraint solving;
- routing;
- SVG serialization; and
- PNG rasterization.

The benchmark set must include small interactive diagrams and a deliberately
dense upper-bound fixture. Performance work MUST NOT trade away determinism or
diagnostics without an explicit specification change.

## 7. Dependency and license checks

Continuous validation MUST eventually include:

- lockfile integrity;
- dependency license inventory;
- prohibited or unknown license detection;
- dependency vulnerability reporting;
- verification that render tests make no network request; and
- a check that bundled fonts and visual assets have documented redistribution
  rights.

The accepted editor dependency check currently pins Monaco's reviewed version,
verifies the version-sensitive Suggest controller boundary, requires Angular's
generated production license inventory, and requires Monaco's upstream license
and third-party notices in the built editor artifact. It also verifies every
reviewed IBM Plex WOFF2 hash, packaged byte identity, and the unchanged OFL-1.1
license.

The desktop dependency check pins Electron, Forge, makers, fuses, Windows
startup handling, and macOS maker helpers to the reviewed versions and licenses.
It also protects the local CSP, preload/main separation, and packaged resource
inventory. A release pipeline MUST additionally inventory the complete
installer payload and verify platform signatures and notarization where
applicable.

No copied third-party example may be introduced as a test fixture.

## 8. Golden-update procedure

A contributor updating an SVG or PNG golden MUST:

1. state the specification or bug that requires the change;
2. inspect the semantic and geometry diff;
3. render and visually inspect every affected image;
4. confirm that unrelated fixtures did not move;
5. include old/new evidence in the review when practical; and
6. update the golden only after the change is understood.

Bulk acceptance of new goldens without inspection is prohibited.

## 9. Definition of done for implementation changes

An implementation change is complete only when:

- behavior matches `SPEC.md`;
- relevant unit and integration tests exist;
- negative behavior has diagnostics tests;
- deterministic output has been checked;
- affected goldens have been inspected;
- required commands pass;
- no undocumented dependency or asset was added; and
- the final report distinguishes implementation, automated validation, visual
  validation, commit, and push status.

## 10. MVP test gate

Before the MVP may be called complete:

- every acceptance criterion in `SPEC.md` has a named test or reviewed manual
  verification;
- all original catalog fixtures render as SVG and PNG;
- all seven official C4 view types pass their scope and element-contract tests;
- the complete C4 notation profile passes without downgraded diagnostics;
- Code, Dynamic, and Deployment fixtures pass semantic and visual review;
- recommendation and intended-audience metadata is present for every view type;
- all hard-conflict fixtures fail with expected diagnostics;
- canonical SVG is deterministic across repeated clean runs;
- CLI and browser-worker compiler contract results are equivalent;
- editor hot compilation, stale-result rejection, last-valid preview, and
  source/preview navigation pass their integration tests;
- desktop open/save, dirty-state protection, secure bridge behavior, packaged
  launch, and native installers pass on every supported platform;
- the supported-platform PNG policy passes;
- no network access is required;
- dependency and asset licenses are documented; and
- a human has visually reviewed the complete fixture gallery at its intended
  display sizes.
