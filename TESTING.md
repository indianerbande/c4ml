# C4thedral Testing Strategy

Status: Draft 0.48

Date: 2026-09-01

This document defines how C4thedral product behavior and C4ML language and
compiler behavior will be verified. It is normative for testing once
implementation begins. `SPEC.md` defines product behavior; this document
defines the evidence required to claim that behavior works.

Vitest is accepted for unit and adapter-contract tests. The verified
commands are:

- `pnpm run build` for generated-language and TypeScript build validation;
- `pnpm run check:worker-bundles` for in-memory renderer Web Worker bundle
  validation;
- `pnpm run typecheck` for source and test type checking;
- `pnpm run test` for the current semantic, view, adapter, language, and editor
  test suite;
- `pnpm run check:editor-production` for the accepted Monaco and ELK.js
  versions, version-sensitive integration points, the unmodified packaged ELK
  worker, reviewed IBM Plex assets, and packaged license notices;
- `pnpm run check:desktop-production` for pinned desktop dependencies, secure
  main/preload boundaries, CSP, and required packaged editor resources;
- `pnpm run check:architecture-proof` for the deterministic, non-mutating
  Pillar 3 policy-and-observation acceptance project;
- `pnpm run check` for the complete current gate;
- `pnpm run renderer:build` for the production-mode Angular renderer build;
- `pnpm run desktop:smoke` for the built Electron shell and live compiler
  worker;
- `pnpm run desktop:package` for the unpacked current-platform application;
- `pnpm run desktop:make` for current-platform installer/archive artifacts;
- `pnpm run demo:render` for the ignored visual reference export; and
- `pnpm run c4ml -- version` for the built experimental CLI entry point.

All commands run locally after dependency installation and require no compiler
service or runtime network access.

The source gate accepts the installed Node.js runtime when it satisfies the
root `engines` range. Node.js 24.15.0 or newer within 24.x is the native desktop
packaging baseline. A different installed runtime MUST produce a warning and
MUST NOT trigger a managed-runtime download; the Forge packaging commands MUST
fail early with a useful message outside the accepted 24.x line. The production
boundary check also protects the reviewed repository-firewall pins for webpack,
minimizer-webpack-plugin, and terser, requires Windows, macOS, and Linux maker
coverage, pins the Linux DEB maker and its user-facing metadata, and prevents
platform-native maker helpers from entering the installed application.

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
Web Worker bundling without Node.js polyfills, and deterministic SVG through the
shared compiler pipeline. This evidence does not claim coverage of the complete
preview grammar.

The larger `examples/draft/signal-garden.c4ml` is also parsed as one executable
all-seven-view demonstration. A negative language test preserves proposed tags,
Visual Group, and presentation snippets separately and verifies that each
receives source-located `C4ML-LANG-005` guidance rather than a misleading
missing-brace message.

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

The portable product-pillar foundation adds compiler-core contract evidence for
versioned source revisions, canonical non-overlapping text edits, stale and
overlap rejection, non-mutating candidate preview evaluation, canonical
architecture snapshots, source/declaration-order independence, typed semantic,
deployment, view, presentation, and layout separation, kind-qualified graph
identity, deterministic containment/deployment/view/impact traversal, analysis
findings, query results, ordered evidence paths, source-location ordering,
optional proposed corrections, and mandatory attribution of observed evidence.
Worker-bundle validation protects the absence of Node.js-only APIs. The first
authoring integration evidence proves syntax-aware value replacement without
rewriting comments, unrelated formatting, identifiers, or declarations;
non-mutating project preview through the normal compiler worker; stale preview
rejection; and application as one Monaco undo unit. Worker/direct-portable
snapshot parity and worker/CLI exposure of the same versioned analysis report are
also covered. The semantic differ now adds original before/after evidence for
stable-identity renames, additions, removals, property and Relationship changes,
separate deployment, View, presentation, and layout categories, layout-only
changes without architecture noise, deterministic serialization, and empty
results for equivalent snapshots. Compiler-worker/direct-core parity and CLI
tests cover the same rename result; a separate CLI pair proves that comments do
not create a semantic change. Project-selected policy and observation
evaluation now add the same worker and CLI report paths without duplicating
evaluator semantics.

The first project-source foundation adds contract evidence for canonical
project-relative document URIs, deterministic document ordering, explicit
manifest parsing, implicit one-document projects, order-independent project
revisions, atomic multi-document changes, stale and unknown-document rejection,
cross-document language references, and CLI file/project operation. The
original Garden Pulse source is also compiled as an explicit three-document
project; semantic data and normalized SVG remain equivalent except for the
intentionally preserved source-document metadata. The compiler worker compiles
the complete project and resolves cross-document completion references. The
desktop boundary exposes native project-directory selection through the shared
Node.js loader, while Angular provides project tabs, explorer selection,
per-document buffers and dirty markers, aggregate close protection,
cross-document source navigation, sequential Save All with partial-result and
cancel behavior, and independent Monaco models with restored cursor and scroll
state. The empty-workspace slice additionally requires startup without an
implied source, context-sensitive File/Project closing, disabled close when no
document is open, dirty-state confirmation, and clearing derived compiler and
preview state. The glossary-resource slice additionally proves versioned parsing,
deterministic ordering and lookup, acronym expansion, alias handling,
case-insensitive collision rejection, project-revision participation, local and
read-only Git loading, and non-source desktop/worker transport. The
narrative-resource slice adds metadata/version parsing, deterministic URI
ordering, unique identities, local-link extraction, rejection of raw HTML,
images, remote links, and traversal, revision participation, filesystem/Git
loading, and non-source desktop/worker transport. The publication-resource
slice proves ordered View selection, captions, deterministic profiles, formats,
scales, backgrounds, compiled-View reference validation in CLI and worker,
revision participation, and filesystem/Git loading. Reusable project libraries
and remote imports remain unimplemented.
The project-theme gate additionally proves preset resolution, deep token
inheritance, invalid preset/color/property rejection, project revision and
filesystem/Git loading, and identical CLI/worker scene selection. The original
Garden Pulse PNG was visually inspected with its Garden preset and custom pale
background; text, types, routes, labels, and geometry remained legible and
unchanged.
The project-shape gate additionally proves shared catalogue validation,
deterministic assignments, revision and filesystem/Git loading, and identical
CLI/worker preparation. The original Garden Pulse PNG was visually inspected:
only Sensor Post uses the new octagonal card; its C4 type, text, Route,
Arrowhead, Port connection, and surrounding geometry remain intact.
The licensed-asset gate proves passive media allowlisting, identity/path
uniqueness, SPDX and SHA-256 syntax, hash mismatch rejection, JSON syntax,
filesystem and read-only Git containment/loading, exact project-revision
participation, and bounded non-source desktop/worker transport. The original
Garden Pulse review note is verified against its recorded SHA-256.

The Angular editor foundation adds typed worker-runtime, editor-session, and
source-editor adapter evidence. It verifies deterministic source-to-SVG
compilation, invalid-source diagnostics, monotonic request identifiers,
rejection of deliberately out-of-order results, retention of the last valid
SVG, context-valid completion ranges, exact completion and marker translation,
document-level `model` recovery after an invalid header, localized empty
completion-state copy, and `person`/`system` recovery at declaration level in
an intact model block, plus View-property recovery inside an incomplete but
structurally intact View block,
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
Renderer-harness verification covers the two-pane layout, lexer-owned syntax
highlighting, ELK-produced live preview, an
in-place context-only completion popup, exact candidate application, inline
diagnostic markers, diagnostic-to-source focus, invalid edit diagnostics,
keyboard undo/redo, visible last-valid-preview state, wizard/Monaco source
synchronization, visually inspected Component, Code, System Landscape,
Dynamic, and Deployment previews, view selection, zoom, the guided wizard,
generated-source review, apply, and undo. The production bundled adapter
compiles executable slices for all seven view types in worker-runtime tests;
the platform-shortcut suite advertises `Cmd+I` for macOS user agents and
`Ctrl+Space` for Windows and Linux, while the visible action triggers the same
Monaco suggestion command. In the packaged macOS application, the workbench
displayed `⌘I` and that keystroke opened the four context-valid top-level
suggestions on 2026-08-30;
the current renderer ELK pass visually covers a System Context with two
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
lanes while retaining selection. The renderer accessibility tree was inspected;
a real screen-reader pass is not yet complete. Typography verification confirms
that the interface resolves IBM Plex Sans and Monaco resolves IBM Plex Mono,
including regular and bold faces. The preview was visually inspected at 80,
100, and 120 percent; its rendered box changed size while computed CSS
`transform` remained `none`.

The Problems panel was visually inspected in the live Angular workbench on
2026-08-30 with several simultaneous diagnostics. Every card occupied the same
single 963 px grid track and retained one x position while successive rows
advanced vertically. The first two cards showed source-located
`C4ML-LANG-005` messages for proposed element tags and a View presentation
block; neither reported a missing closing brace. The panel remained vertically
scrollable and the last valid diagram stayed visible. The panel content keeps
an explicit eight-pixel inset on every edge, including empty and populated
states.

Workbench interaction tests also require Source Control to appear between Files
and Diagrams, Help to appear immediately above Settings, the Problems count and
active panel tab to share one toggle behavior without a separate close glyph,
and Diagram navigation to remain solely in the left activity bar rather than
being duplicated in the status bar.

On 2026-08-30 the updated workbench was visually inspected in the live Angular
renderer and packaged macOS desktop shell in German and English, light and dark
schemes. Files, Source Control, Diagrams, and Output remained grouped above the
spacer; Help appeared immediately above Settings. Clicking the status Problems
count closed and reopened the panel with matching `aria-pressed` state, no
separate close glyph remained, and the adjacent action read `Diagramme` rather
than repeating `System Context — Garden Pulse`. A populated Source Control
state was rendered through an ignored build-only bridge fixture: long branch
and upstream names truncated safely, German commit copy wrapped without overlap,
staged and unstaged groups remained distinct, file actions stayed aligned, Push
showed the outgoing count, and entering a message enabled Commit. No real
repository mutation was invoked during visual inspection.

On 2026-08-31 a fresh-origin live renderer check confirmed the new 13 px
interface and status-bar defaults, the 15 px Monaco default, disabled
Architecture with no valid static View, available Assistant, and removal of the
duplicate Diagrams status action. The CLI-rendered `workshop-lens-components`
fixture was also inspected as SVG-derived PNG: the compound boundary retained
clear space below its title and the long relationship label wrapped into two
unchanged-size lines without entering either Component. The former
canvas-colored label rectangle was then replaced with a bounded gap in the
selected route segment, leaving no visible label background while preserving
the line on both sides.

On 2026-08-31 the German **Dein erstes Diagramm** handbook article was also
inspected in the live renderer. Its example retained literal `draft-1`
keywords and stable IDs while showing German names, responsibilities,
relationship intent, title, and purpose throughout the visible source block.
The same renderer session reproduced an invalid `c4ml testdatei` header and
confirmed that completion offered `model` at document level and exactly
`person` plus `system` at declaration level inside the intact model block.
A subsequent rebuilt-worker check confirmed all ten executable View-property
candidates inside an incomplete `view` block, including `type`, `scope`,
`title`, and `purpose`.

The first intent-authoring inspector evidence verifies that the worker returns
automatic candidate bounds, final scene bounds, movement delta, and stable
source-located placement explanations for a selected node. Protocol validation
distinguishes automatic, hard, soft, applied, and relaxed states and preserves
separate source locations for route controls, avoidance regions, and corridors.
The inspector was visually checked in the light and dark blue workbench themes;
its automatic and authored placement cards remained readable, selection did not
change canonical SVG, and clicking the automatic choice revealed the owning
view declaration in Monaco.

The editor architecture suite additionally protects the independent Compile,
Language, and Authoring worker-contract modules and their small composed
transport boundary. Production build validation covers the focused workbench
facades for document/export, preview, help, and command-palette state. Existing
runtime and session suites continue to exercise the unchanged public protocol
barrel and stale-response behavior.

The semantic graphical-authoring evidence verifies context-derived creation
kinds and relationship endpoint pairs for all five static C4 views,
scope-owned Container, Component, and Code Element insertion, top-level Person
and Software System insertion, missing-block creation, project-relative
multifile targeting, duplicate and invalid-input rejection, and preservation of
existing comments and unrelated formatting. Worker tests prove non-mutating
candidate compilation; session tests reject stale context and preview results;
the editor architecture suite keeps C4 operation discovery and source rewriting
outside Angular. CLI parity checks the ordinary source produced by the same
portable generator. The production Angular build validates the integrated
dialog and worker chunks. The live dark workbench was visually and
interactively inspected on 2026-08-30: the architecture warning and separate
action treatment were legible; a multi-word name, responsibility, and stable ID
remained in their fields without focus loss; element and directed-relationship
candidates compiled and exposed their exact proposed source; apply produced one
dirty Monaco edit; and Undo restored the clean starting document. The System
Context form also explains that an unconnected new neighbor enters the model
first and becomes visible after the next context-valid connection operation.
Template tests additionally protect zero-minimum grid tracks, bounded form
controls, and vertical-only responsibility resizing so switching operations or
resizing the text area cannot cover the candidate preview.
The separate connection-authoring template evidence protects the dedicated
**Connect** action and dialog, Source-to-Target diagram-picking state, explicit
direction reversal, element-only hit acceptance, worker-owned endpoint
validation, and the return to the same proposed-source and candidate-preview
boundary before apply. Source edits, document changes, view changes, cancel,
and Escape terminate the temporary picker instead of retaining stale endpoint
state.
Component and Code template evidence additionally protects the visible,
scope-derived Container or Component owner guidance. Deployment tests derive
the active environment, eligible nodes, and Software System/Container instance
choices from the View, reject cross-environment or out-of-scope selections,
and parse generated nested-node and instance source through the normal project
compiler. Dynamic tests expose only eligible directed static Relationships,
derive immutable endpoint direction and the next positive order, insert
interactions before an existing layout block, and reject duplicate IDs,
invalid orders, or unknown Relationships. Worker tests compile non-mutating
Deployment and Dynamic candidates through the same protocol guards used by
static authoring. Template tests protect the separate contextual forms,
explicit Dynamic order/parallel fields, and Deployment environment/placement
choices.
The local dark renderer harness was visually and interactively inspected on
2026-08-31 with the German online-shop example. The dedicated **Verbinden**
dialog remained contained beside its candidate preview; selecting Customer and
then Online Shop in the diagram returned the same directed pair to the dialog;
opening **Verbinden** with Online Shop already selected preselected it visibly
as the Source and offered Customer as the Target; and a described relationship
compiled to both candidate SVG and the exact proposed C4ML source without
changing the active document.
The packaged macOS application completed the Pillar 1 persistence acceptance on
2026-08-30. It applied the same semantic Person creation, saved the resulting
source through the native Save As dialog, fully quit, restarted, and reopened
the saved file with zero diagnostics and a current preview. An independent CLI
`check` then loaded that file from disk, found the new stable element identity,
and reported valid C4ML. No editor-only semantic state participated in the
restart or CLI result.

The English workbench and the live German switch were visually inspected in the
packaged macOS application. The Settings panel, activity and output areas,
status and accessibility copy, command surface, and first wizard step changed
without layout damage; authored source and diagram labels remained unchanged.
The complete owned native menu tree, including File, Edit, View, Window, and
their standard actions, changed to German in the same session, and the German
preference survived an application relaunch. The local inspection state was
returned to English afterward.

All eight workbench color families were visually inspected in their light and
dark realizations in the live Angular workbench on 2026-08-29. The settings
cards, focus and selection borders, primary actions, navigation surfaces,
editor background, and surrounding workbench remained legible and visually
balanced in all sixteen combinations. The expanded declaration, property,
predefined-value, identifier, string, operator, number, and comment palette was
also inspected in representative light and dark turquoise editor views. The
test preference was reset to the default blue/system combination afterward.

All five syntax profiles were visually inspected in both light and dark mode
in the live Monaco editor on 2026-08-29. The settings control applied each
profile immediately; comments, declarations, properties, predefined values,
identifiers, strings, numbers, and operators remained legible. The minimal
profile stayed restrained, vivid separated roles more strongly, high contrast
showed its redundant underline and weight cues, and color-safe avoided a
red-versus-green distinction. Source and diagram output remained unchanged.
The inspection state was returned to `balanced`, `system`, and `blue` afterward.

The local workbench-preference suite verifies English language defaulting,
English/German round trips, backward-compatible version-one records,
field-level fallback, malformed JSON and unsupported-version fallback, bounded
half-pixel interface and editor font sizes, effective system/light/dark resolution,
all eight accepted color families, and controlled
font-stack mapping. Localization-contract tests verify both catalogues and
interpolation, while command tests verify search in each language. Renderer-harness
and desktop verification MUST also cover live language, scheme, and color-family changes, the
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

The Monaco-theme suite MUST verify all eighty combinations of five syntax
presets, eight color families, and light/dark presentation, explicit normal,
highlighted, selected, icon, and focus colors, and the complete C4ML token
palette. Normal, highlighted, selected, and syntax text/background pairs
require a computed contrast ratio of at least 4.5:1. Contract tests MUST verify
that every preset covers every role, color-family changes affect only the
declaration accent within one preset, minimal remains restrained, high contrast
uses redundant style cues, and color-safe does not rely on red-versus-green
encoding. Language tests MUST
distinguish representative declaration words, properties, predefined values,
identifiers or references, strings, numbers, operators, and comments using
lexer-owned spans. Renderer-harness inspection MUST sample every family in both light
and dark modes, open the completion list in both schemes, and confirm the
focused row and syntax categories remain legible. Renderer-harness inspection MUST also
sample every syntax preset in both light and dark mode and verify that the
settings control changes Monaco immediately without changing authored source.

The local-handbook suite MUST verify that every help-topic identifier has
English and German content, search is deterministic in both languages, only
the executable `draft-1` set is marked available, and examples contain no
external asset reference. It MUST also verify that German examples localize
author-facing descriptive values without translating C4ML keywords or stable
identifiers. Language-package tests MUST map representative model,
relationship, view, deployment, layout, and route cursor positions to stable
topic identifiers and reject offsets outside the source. Worker and editor-
session tests MUST validate the versioned request/response boundary and reject
stale cursor-context responses. Renderer-harness verification MUST cover Help activity
navigation, expandable chapters, localized search, the cursor topic, `F1`,
command-palette access, diagram/Handbook tab switching, keyboard focus, and
legibility in both light and dark schemes. Help navigation MUST leave source,
dirty state, and canonical SVG unchanged.

The Electron desktop foundation adds unit and boundary evidence for its
versioned bridge, runtime request validators, opaque document handles, filename
normalization, local protocol traversal rejection, hardened web preferences,
and visible-bound normalization for the optional preview window. It also
validates the bounded English/German UI-language message, bridge, menu, dialog,
and close-warning contract. The preview tests require a source-neutral,
versioned projection, a separate restricted preload, rejection of privileged
main-window methods, deterministic selection hit testing, full-size and
detached workspace controls, and safe session persistence. The production
boundary check pins the reviewed Electron/Forge stack and licenses, verifies
that neither preload has filesystem access and that the preview preload exposes
no document, save, or export channels, checks the local-only CSP, and requires
the editor, worker, fonts, resvg native binary, and notices before packaging. A
smoke test from the packaged macOS `.app` verifies the main bridge, Monaco host,
valid compiler state, detached projection-only bridge and window, absence of a
source editor in that window, controlled Sans/Mono typography, and in-memory
native PNG rasterization. Normal startup remains empty; only the explicit
`--c4ml-smoke` path focuses Monaco and enters a transient original model so the
packaged compiler and preview are exercised without restoring the retired
automatic example document.
The application was visually inspected as a native two-pane workbench, a
full-size single-window preview, and a separate preview window with its native
menu. Selection, zoom, Route-overlay changes, and redocking were exercised; the
detached window showed no source or file controls. The
current `0.1.0-beta.1` macOS arm64 application was built and smoked with Node.js
24.15.0. Its native bundle name and version match the release identity, its
packaged ICNS content matches the reviewed original icon, and it passes strict
deep code-signature verification after ad-hoc signing. Its DMG passes
`hdiutil verify`, and its version-specific ZIP passes archive integrity testing. The
host-specific `check:native-release` command records the executable and
distributable sizes and SHA-256 hashes below the ignored build tree. Native
file-dialog interaction and installers remain platform-specific evidence. The
Ubuntu arm64 DEB has passed metadata, desktop-entry, sandbox-mode, APT
install/remove/reinstall, installed offline smoke, visible open/edit/Save As,
full restart and reopen, native SVG/PNG export, and read-only Source Control
checks. The SVG test specifically proves that the packaged desktop opens its
validated native save path instead of delegating a `blob:` URL to the operating
system. The exact Windows x64 beta candidate has passed the complete source
gate, Squirrel build, artifact verification, packaged smoke, Squirrel
install/remove/reinstall, installed offline smoke with no system Node.js
visible, and visible native open/edit/Save As/full restart/reopen, SVG/PNG
export, and dirty-close cancellation on `brainbird`. The saved project survived
uninstall. Linux x64 still requires its own native run.

The experimental CLI suite exercises successful validation, semantic comparison
of two valid sources, deterministic semantic impact exposure, empty comparison
after a comment-only change, stable visual comparison export with explained
encoding and geometry decisions,
source-located JSON diagnostics, one-view SVG output, all-view SVG and PNG output, PNG scaling,
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
- the built-in box text gutter remains visibly separated from its accent rail;
- the default box bar has deliberate equal end clearance, and project options
  can hide it or apply validated hexadecimal color and percentage transparency;
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

- compilation in a local Web Worker rather than on the renderer UI thread;
- debounced or scheduled hot compilation after source changes;
- cancellation or rejection of results from superseded compilations;
- retention of the last valid preview while current source contains errors;
- current diagnostics replacing obsolete diagnostics;
- diagnostics displayed as one vertically ordered Problems list rather than a
  width-dependent multi-column card grid;
- source-to-preview and preview-to-source navigation;
- stable mapping from source ranges through semantic and scene IDs to SVG;
- zoom, pan, and fit-to-view behavior without geometry mutation or CSS
  transform scaling;
- SVG and PNG export; and
- operation without a compiler service or network connection.

Multi-document editor tests MUST additionally prove that switching documents
reuses each document's Monaco model and therefore its independent undo stack,
restores cursor and scroll state, and disposes every stale model when a new
project is loaded. Save All MUST skip clean documents, process dirty documents
in deterministic source order, retain successful writes after a later failure
or cancellation, and leave every unsaved source visibly dirty.

A shared contract suite MUST run the same effective source through the Node.js
CLI path and compiler-worker path. It MUST compare diagnostics, semantic model,
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
scale, browser-harness SVG download, native desktop SVG save, and bidirectional
source/preview node navigation through
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

The current wizard foundation proves deterministic System Context and Container
generation, normal parser and semantic validation,
dynamic part and connection validation, explicit direction and protocol,
stale-result rejection, cancel without source changes, and one explicit undo.
Template and interaction tests MUST keep that undo out of the title actions,
present it as contextual status feedback, require an explicit confirmation,
contain keyboard focus in the confirmation dialog, and invalidate it on the
next source or document change. The existing-document path additionally requires
three bounded project edits for model, Relationships, and View insertion; exact
retention of unrelated comments, declarations, stable identifiers, and
formatting; normal parsing of the candidate; rejection of project-wide ID
collisions and unknown targets; worker-protocol validation; and an explicit
new-document/extend-document choice. Apply retains the active project and marks
its active document dirty, while the captured document state supplies the same
confirmed one-step undo.
Interaction review also checks that questions can be completed from familiar
architecture concepts without prior C4 vocabulary. Template and localization
tests MUST additionally verify that every rendered form control has adjacent
expandable help, that help controls expose expanded state and controlled
content accessibly, that IDs are described as source tokens rather than vague
technical names, and that German interface selection starts with German-owned
example answers. Those answers MUST retain one coherent original online-shop
story across role, application, separately running parts, technologies, and
connections in both interface languages.

On 2026-08-31 the German renderer harness was visually and interactively
checked after generating the online-shop System Context. The contextual undo
notice remained compact above the status bar and no undo action appeared in the
title bar. Its confirmation dialog initially focused Cancel, trapped forward
and reverse Tab movement, returned focus to the notice after Escape, and removed
both the generated document and notice only after explicit confirmation.

On 2026-08-31 the renamed macOS development application was launched through
the ad-hoc-signed `C4thedral.app` wrapper. The empty workbench showed
`C4thedral` without clipping in the native window title and upper-left brand,
while the status bar retained the technical `C4ML` language label. The macOS
application menu was named `C4thedral` and exposed `Über C4thedral`,
`C4thedral ausblenden`, and `C4thedral beenden`. The German empty workspace also
showed `C4thedral-Arbeitsbereich`; `.c4ml` source terminology remained C4ML.

### 2.11 Desktop shell and packaging

Desktop tests MUST cover:

- the visible product name `C4thedral` in workbench chrome, document and preview
  titles, native menus, development wrappers, executables, installers, and
  archives, while `.c4ml`, C4ML compiler and CLI names, diagnostics, bridge
  channels, bundle identifiers, and storage keys remain stable;
- reuse of the established `C4ML` application-data directory after the product
  rename so existing local preferences and safe presentation state remain
  available;
- a direct unpackaged development launch that does not invoke the Node.js-24
  packaging guard, while package, smoke, and make retain that guard;
- runtime validation of every privileged renderer request;
- rejection of IPC from untrusted pages and denial of external navigation,
  windows, permissions, and webviews;
- context isolation, renderer sandboxing, disabled Node.js integration, and a
  preload surface limited to the versioned C4ML bridge;
- path-traversal rejection for the owned local application protocol;
- opaque document handles and the configured source-size limit;
- native Open, Save, Save As, cancellation, failure reporting, dirty titles,
  and unsaved-close protection;
- empty startup plus context-sensitive Close File/Close Project behavior that
  returns to an empty workspace and clears derived state;
- native project-directory opening through the shared manifest loader, opaque
  handles for every selected source, per-document size enforcement, and
  aggregate project dirty state;
- native PNG export cancellation, validation, 1x/2x/3x scaling, controlled
  fonts, failure reporting, and faithful canonical-SVG rasterization;
- safe local workbench-session persistence that excludes source, handles, and
  filesystem paths;
- full-size preview entry and return without changing source or canonical SVG;
- a separate preview window with a projection-only preload, no compiler,
  source-editor, document, save, export, filesystem, or Node authority;
- one compact upper-right detach/redock control that retains its position,
  reverses its arrow direction, and does not add a detached-state title action;
- a seamless, unpatterned preview canvas matching the canonical diagram canvas
  in both main and detached workspaces across light and dark workbench schemes,
  without changing SVG;
- validated projection synchronization for current view, status, SVG,
  navigation, selection, zoom, Route overlay, language, scheme, palette, and
  interface font size;
- source-neutral selection round trips, redocking, close/reopen behavior, and
  visible bounded window restoration, including monotonic projection revisions
  across a main-renderer reload;
- native Settings opening through the application menu and `Cmd/Ctrl+,`;
- 13 px interface and status-bar defaults, a 15 px source-editor default,
  context-sensitive Architecture/Assistant actions, and one unambiguous
  Diagrams activity control;
- validated English/German synchronization of C4thedral-owned native menu commands,
  dialog labels, failure copy, and unsaved-close protection;
- packaging without development sources or an application `node_modules`
  tree;
- required editor workers, fonts, licenses, and notices in the application;
- exact locally packaged activity-icon SVGs, their source notice and license,
  localized accessible button names, and visible light/dark theme states;
- the configured production Electron fuses;
- launch and live compilation from the packaged application;
- a minimum-height packaged-window smoke proving that the document itself does
  not scroll, the status bar remains fully inside the renderer viewport, and
  only bounded workbench content owns overflow; and
- signature, installer/archive integrity, installation, launch, file round
  trip, and uninstall behavior on every supported release platform.

The native platform matrix is defined in `PLATFORMS.md`. Every target host MUST
run install, the complete check, packaged smoke, and its configured makers.
macOS evidence covers `.app`, DMG, and ZIP; Windows evidence covers the Squirrel
Setup EXE; Debian-family Linux evidence covers the unpacked application and
installed DEB. The Linux artifact check MUST verify package identity, version,
architecture, desktop-menu integration, and a root-owned `chrome-sandbox` with
mode `4755`; the installed application MUST start without `--no-sandbox`.
No host may satisfy another host's launch or filesystem evidence.
`pnpm run release:native` composes those automated steps and
`check:native-release` additionally requires the current product/version
artifacts, verifies macOS signature/DMG/ZIP integrity or Linux DEB metadata and
sandbox permissions, and writes a host-local hash manifest. On Windows it
requires the packaged EXE,
Squirrel Setup EXE, full NuGet package, and RELEASES index. A release install
MUST be performed under Node.js 24 so optional native maker helpers do not
retain an ABI from another Node.js line.

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
- CLI and compiler-worker compilation remain equivalent after an applied edit.

Tests MUST distinguish semantic architecture operations from view-local layout
operations. UI event coordinates and Monaco edit objects MUST NOT enter the
portable authoring contract.

The first graphical placement slice is automatically validated with original
Signal Garden fixtures. Language tests cover deterministic, syntax-aware
generation for relative placement, automatic-relative nudge, anchored
alignment, ordered distribution, and exact pins, including declaration-order
preservation when replacing a later pin with an earlier placement form. Worker
tests compile the proposed candidate through the normal worker pipeline without
mutating the active project; CLI tests check the applied source through the
shared Node.js pipeline. Editor adapter tests prove project-to-document
narrowing and one Monaco undo unit. A local renderer-harness interaction additionally
verified selected-element synchronization, candidate SVG and source review,
zero diagnostics after apply, restoration of the preceding pin in one undo, and
restoration of the original clean dirty-state marker.

The first graphical Route slice is automatically validated with original
Signal Garden fixtures. Language tests cover cardinal and automatic Port
selection; addition, symbolic-shift movement, and removal of waypoint guidance;
locked-segment preservation; automatic-reset cleanup; obsolete block removal;
and source-comment preservation. They also require explicit repair codes when
fixed points, an old waypoint list, a corridor lane, or a guided policy becomes
incompatible with the requested operation. Worker tests prove non-mutating
candidate compilation, project-addressed changes, and route-navigation parity;
session tests reject stale Route previews; CLI tests compile the applied source
through the shared Node.js path. Template and architecture tests keep Route
syntax generation outside Angular and ensure that safe repairs, blocking
diagnostics, source preview, apply, and undo remain explicit UI states. A local
renderer-harness interaction additionally verified relationship selection, dark and
light dialog layouts, candidate SVG and source review, corridor-release repair
copy, a valid Port change, zero diagnostics after apply, one-step undo, and
restoration of the original clean dirty-state marker.

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

The first implemented comparison gate uses original Signal Garden data. Core
tests cover deterministic element and Relationship impact paths, layout-only
isolation, baseline retention, hard-position exclusion, collision fallback,
dimension fallback, all four scene modes, unique overlay identities, and
semantic-change versus movement encoding. Worker tests require parity with the
portable difference and impact reports. CLI tests export a standalone overlay
and assert its visible comparison legend and machine-readable marks. Local SVG
and PNG smoke exports exercise all four modes with controlled IBM Plex assets;
the rendered results are visually inspected before the slice is reported as
visually validated.

The local Git-revision-adapter gate creates isolated original repositories and proves
commit and branch loading, explicit multifile manifest loading, invalid-ref
classification, bounded read-only Git invocation, and unchanged `HEAD` and
working-tree state. A CLI integration test compares a selected commit with
working source and receives the same portable rename classification. Session
tests inject repository paths and refs into stored JSON and require all such
fields to be discarded.

The desktop working-tree gate additionally creates isolated repositories and
proves deterministic status parsing, individual and all-file staging, unstage,
commit-message transport through standard input, commit of staged content only,
and first push with automatic upstream setup when exactly one remote exists.
Contract tests reject unknown handles, traversal paths, oversized selections,
empty commit messages, and unsupported actions. Desktop integration tests MUST
keep all Git subprocess authority in the main/project-node boundary and MUST
prove that the sandboxed renderer receives only the versioned Source Control
contract. Visual validation MUST inspect the localized Source Control activity,
staged and unstaged groups, disabled commit state for unsaved editor documents,
operation feedback, the lower Help placement, the Problems toggle, and the
destination-labelled Diagrams status action.

Migration-story tests require at least two explicitly reviewed canonical
states, deterministic transition and change provenance, reuse of the portable
difference and impact reports, and byte-stable serialization. Presentation
tests require all four comparison modes for every included View and reject
missing, incompatible, scripted, event-bearing, or externally linked SVG.
The generated self-contained HTML must expose ordered step navigation,
review-state provenance, semantic change summaries, and independently
expandable before, after, overlay, and change-only views. A local offline HTML review
of the original Garden Pulse example verified those interactions, absence of
horizontal page overflow and console errors, and legible embedded comparison
output without network resources.

### 2.14 Architecture proof

Rule and query tests MUST prove that:

- rule identities, severities, affected stable identities, evidence paths, and
  source locations are deterministic;
- evaluation consumes validated compiler contracts and never derives
  architecture facts solely from rendered geometry;
- the same rule set returns equivalent findings through CLI and compiler-worker
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

The first built-in quality gate proves deterministic conversion of shared
non-blocking validation guidance, source-located model/View coverage findings,
empty-View evidence, CLI/worker report parity, stale worker-response rejection,
and human CLI locations. Renderer-harness review verifies that the Output area presents
the same finding in light and dark schemes and that selecting it focuses and
selects the owning Monaco source declaration. Blocking invalid input continues
through diagnostics and does not fabricate an analysis snapshot.

The first query gate covers upstream and downstream traversal, a deterministic
multi-hop shortest path, ancestor and descendant containment, static-to-runtime
deployment placement, and resolved-View coverage. Each result asserts evidence
for every included item and Relationship. Temporary focus Views are tested as
reference-only projections with no copied model definitions. Unknown subjects
and absent paths fail with stable query errors; CLI JSON parity and source-exit
classification are covered without filesystem mutation or network access.

The first internal policy-contract gate covers all six version-one rule
families with original Signal Garden identities: a forbidden dependency, a
missing or disallowed protocol, disallowed ownership, reversed direction,
missing deployment placement, and missing selected metadata. Reordering the
same policies must produce byte-equivalent findings. Every violation requires
authored and derived evidence plus an architecture source location. Separate
negative tests require stable errors for malformed rule kinds, unknown stable
identities, and rules that are inapplicable to the selected architecture kind.
Correction evidence accepts only complete versioned policy-intent source change
sets, including atomic project changes. The project-policy gate additionally
proves versioned JSON parsing, local path containment, Git-revision loading,
policy participation in deterministic project revisions, worker/CLI finding
parity, source-located architecture navigation, and stable failure for malformed
or inapplicable resources. CLI tests prove that the default emits findings
without failing, `--fail-on error` fails only for errors, and `--fail-on
warning` fails for warnings or errors using classified exit code `6`.

The first observation-contract gate proves versioned JSON parsing, normalized
timestamps, deterministic observation ordering, unique identities, applicable
field selection, presence claims, and distinct `consistent`, `drift`, and
`uncertain` comparisons. Original Signal Garden evidence includes a confirmed
field mismatch, a confirmed match, an unreviewed match, a disputed mismatch,
and an observed-only identity. Tests assert that only confirmed mismatches emit
warning drift, while unreviewed and disputed input emit information-level
uncertainty. Every observed evidence item retains adapter identity, timestamp,
confirmation state, and resource source; authored state and canonical snapshots
remain byte-equivalent before and after evaluation. Negative tests require
stable errors for malformed resources, duplicate observation identities,
invalid timestamps or confirmation state, and fields inapplicable to their
selected architecture kind. The project-observation gate additionally covers
local path containment, filesystem and read-only Git-revision loading,
deterministic project-revision participation, source-located malformed-resource
diagnostics, worker/CLI findings, and CLI warning thresholds without network
access or source reconciliation. The packaged macOS workbench was also opened
with the original multifile Garden Pulse example: the Output activity visibly
showed two separate cards for `c4ml.observation.drift` and
`c4ml.observation.uncertain`, while the three authored source tabs and unchanged
diagram remained present.

The formal Pillar 3 gate additionally runs that original project with its local
governance policy and observation resource twice through the built CLI. It
requires deterministic JSON, classified exit code `6`, source locations and
evidence for every finding, retained observation adapter/time/confirmation,
the authored `Garden Pulse` name in the canonical snapshot, and an identical
SHA-256 digest for every project file before and after evaluation. The complete
test suite retains the equivalent compiler-worker reports and Output-to-source
navigation evidence. Pillar 3 is therefore accepted as deterministic,
source-located, explained, frontend-equivalent, offline, and non-mutating.

### 2.15 Project and multi-document source

Project-source tests MUST prove that:

- a direct `.c4ml` source and a directory with exactly one root source create
  equivalent implicit projects;
- an explicit manifest loads only its listed local sources in normalized URI
  order;
- an optional `.c4ml-policy.json` manifest resource is loaded locally through
  the same filesystem and Git-revision adapters, participates in the project
  revision, and never becomes an architecture source document;
- an optional `.c4ml-observations.json` manifest resource follows the same
  filesystem and Git containment rules, participates in the project revision,
  and never becomes an architecture source document;
- an optional `.c4ml-glossary.json` manifest resource follows the same
  containment rules, validates its typed entries before use, participates in
  the project revision, and never becomes an architecture source document;
- optional `.c4ml-narrative.md` resources validate safe passive Markdown,
  unique stable identities, containment, and deterministic ordering, participate
  in the project revision, and never become architecture source documents;
- an optional `.c4ml-publication.json` resource validates ordered declared View
  references and deterministic render profiles, participates in the project
  revision, and never mutates source or architecture semantics;
- an optional `.c4ml-theme.json` resource validates through the shared semantic
  theme resolver, participates in the project revision, and changes only scene
  presentation;
- an optional `.c4ml-shapes.json` resource validates only restricted normalized
  primitives and assignments, participates in the project revision, and cannot
  add executable or external content;
- an optional `.c4ml-assets.json` manifest permits only licensed passive UTF-8
  files, verifies containment and SHA-256 in filesystem and Git loaders,
  participates with exact contents in the project revision, and never becomes
  architecture source;
- malformed manifests, duplicate sources, absolute paths, traversal segments,
  platform-specific separators, and symbolic-link escape are rejected with
  stable codes;
- missing or unreadable listed sources retain the environment failure class;
- model, relationship, deployment, View, placement, and Route references can
  resolve across project documents without weakening their target-type scope;
- declaration and file order do not alter the validated architecture, resolved
  Views, geometry, or visible SVG;
- duplicate stable identities across documents fail with all relevant source
  locations and never use last-file-wins behavior;
- diagnostics and navigation retain the owning project-relative document URI;
- a project source change validates all documents against one revision and
  applies several document edits atomically as one transaction; and
- the Node.js CLI and compiler worker consume the same effective portable project
  input;
- project completion offers type-correct references declared in other source
  documents; and
- editor diagnostics and preview navigation select the owning source tab before
  revealing its range.

An original parity fixture MUST exist in both single-document and explicit
multi-document form. Comparisons may normalize source-location metadata, but
must not normalize semantic, geometry, label, theme, or route differences.

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
startup handling, and platform maker helpers to the reviewed versions and
licenses. It also verifies that macOS-only native helpers are reached only
through the optional DMG-maker graph, that Linux uses the pinned DEB maker with
stable metadata, and that the current host receives exactly one reviewed resvg
binary.
It also protects the local CSP, main/preview preload separation, the restricted
preview channel inventory, and packaged resource inventory. A release pipeline
MUST additionally inventory the complete installer payload and verify platform
signatures and notarization where applicable.

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
- CLI and compiler-worker contract results are equivalent;
- editor hot compilation, stale-result rejection, last-valid preview, and
  source/preview navigation pass their integration tests;
- desktop open/save, dirty-state protection, secure bridge behavior, packaged
  launch, and native installers pass on every supported platform;
- the supported-platform PNG policy passes;
- no network access is required;
- dependency and asset licenses are documented; and
- a human has visually reviewed the complete fixture gallery at its intended
  display sizes.
