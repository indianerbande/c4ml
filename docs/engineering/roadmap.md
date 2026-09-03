# C4thedral Implementation Roadmap

Status: Active roadmap

Date: 2026-09-03

[`specification.md`](specification.md) defines product behavior and architecture.
[`testing.md`](testing.md) defines the
evidence required to claim that behavior works. This file orders implementation
work; it does not freeze public `.c4ml` syntax or replace either normative
document.

## Strategic direction

C4thedral is being developed as an explainable, versionable architecture
workbench powered by the C4ML compiler.
The next product direction consists of three connected pillars:

1. **Intent-based authoring:** graphical work produces explicit, reviewable,
   undoable source intent and never hidden layout or architecture state.
2. **Semantic architecture evolution:** validated architecture states are
   compared by stable identity, with architecture changes separated from text
   and layout noise.
3. **Architecture proof:** deterministic rules and graph queries explain
   compliance, impact, evidence, and source-located corrections.

The product direction is accepted. Its user-facing application is exclusively
the Electron desktop workbench; the Angular renderer harness is an internal
development and visual-testing tool, not a browser product. The detailed
contracts and public source syntax remain draft until their individual slices
are reviewed and accepted in [`specification.md`](specification.md).

## Gate 0 — finish the current foundation

Before starting a pillar implementation:

- [x] finish the current placement and routing foundation on its existing
      branch;
- [x] run the complete `pnpm run check` gate;
- [x] regenerate the original Signal Garden reference export and inspect the
      affected SVG and PNG visually;
- [x] inspect the complete diff for unrelated changes and whitespace errors;
- [x] commit and push the coherent foundation when explicitly requested; and
- [x] merge it through the normal review path before opening the first pillar
      branch.

This gate protects the candidate/final geometry, source mapping, stable route
identity, and layout-intent vocabulary on which graphical authoring depends.

## Gate 1 — implement the shared portable contracts

These contracts are prerequisites, not separate end-user features. They SHOULD
be delivered as small independently tested slices in this order.

### 1. Proposed source change set

- [x] define a frontend-neutral source revision identity;
- [x] define deterministic, non-overlapping text edits with reason, affected
      stable identities, and originating authoring command;
- [x] support preview compilation without mutating the active document;
- [x] reject stale change sets explicitly;
- [x] apply one change set as one Monaco undo unit through the existing editor
      adapter; and
- [x] prove preservation of comments, unrelated formatting, identifiers, and
      declarations with original fixtures.

The language/authoring layer owns syntax-aware edit generation. Angular,
Monaco, and Electron only present or apply the resulting contract.

### 2. Canonical architecture snapshot and graph index

- [x] normalize the validated model and resolved views independently of parser
      AST objects, declaration order, source formatting, frontend state, and SVG;
- [x] preserve stable semantic and view identities plus typed containment and
      relationship edges;
- [x] separate semantic, view, deployment, presentation, and layout fields;
- [x] provide deterministic upstream, downstream, containment, deployment, and
      view-membership traversal; and
- [x] prove Node.js and compiler-worker parity.

The first snapshot slice may remain single-document. Final multi-file namespace
and merge rules are not a prerequisite for proving the contract.

### 3. Analysis finding and evidence contract

- [x] define stable rule/query identity, severity or result kind, affected
      stable identities, source locations, and evidence paths;
- [x] allow an optional proposed source change set as a correction;
- [x] keep evaluation pure and independent of renderer output;
- [x] expose the same result through compiler-worker and CLI boundaries; and
- [x] attribute external observations without letting them overwrite authored
      source.

No new runtime dependency is currently required for these three contracts.
Dependency evaluation becomes necessary only if later constraint solving,
repository access, or external evidence adapters exceed a well-bounded C4ML
implementation.

## Gate 1.5 — project and multi-document foundation

- [x] preserve a direct `.c4ml` file as an implicit project;
- [x] define a versioned portable project input and explicit
      `c4ml.project.json` manifest;
- [x] require normalized project-relative source URIs and deterministic document
      ordering without textual includes or precedence;
- [x] extend source changes with deterministic project revisions and atomic
      document-addressed edits;
- [x] allow executable top-level language fragments and cross-document
      references in one flat project namespace;
- [x] add CLI file, manifest, and directory loading with explicit source lists;
- [x] prove semantic and normalized-SVG parity with an original split project;
- [x] expose project compilation and cross-document completion through the
      compiler worker;
- [x] add desktop Open Folder, a project explorer, multi-document dirty state,
      and several source tabs;
- [x] add an explicit Save All command and preserve independent Monaco undo and
      cursor history per project document; and
- [x] add the separately reviewed typed local architecture-policy resource;
- [x] add a separately reviewed typed glossary resource;
- [x] add a separately reviewed typed narrative resource;
- [x] add a separately reviewed typed publication resource;
- [x] add a separately reviewed typed theme resource;
- [x] add a separately reviewed typed shape resource; and
- [x] add a separately reviewed typed licensed-asset resource.

The version-one glossary slice adds one optional local
`.c4ml-glossary.json` resource with deterministic term, acronym, expansion,
definition, and alias contracts. The portable project input, project revision,
filesystem and read-only Git loaders, desktop bridge, and compiler-worker
project transport retain it as non-source content. Case-insensitive term and
alias collisions fail explicitly. This slice does not infer terms from source,
change architecture semantics, or add a visible workbench editor.

The version-one narrative slice adds an explicit ordered set of local
`.c4ml-narrative.md` resources. A fixed five-line metadata header supplies
version, stable identity, and title; the remaining Markdown body permits only
passive text and local project links. Raw HTML, embedded images, remote links,
duplicate identities, traversal, and malformed metadata fail explicitly. The
resources participate in project revisions and cross the typed desktop/worker
boundary as non-source content without changing compilation or diagrams.

The version-one publication slice adds one local `.c4ml-publication.json`
resource with ordered View selection, optional captions, and named SVG/PNG
render profiles with explicit scale and background mode. CLI and compiler
worker validate every selected View against the compiled project. The resource
participates in project revisions but does not alter semantic architecture,
View definitions, layout, or source.

The version-one theme slice adds one local `.c4ml-theme.json` selection over the
existing semantic theme resolver. It supports a built-in preset plus deep token
overrides, participates in project revisions, and drives identical CLI and
desktop-worker scene rendering. Invalid presets, colors, paths, and unknown
top-level fields fail before rendering. It never changes architecture semantics
or installation-local workbench colors.

The version-one shape slice adds one local `.c4ml-shapes.json` resource over the
existing restricted 100×100 renderer-neutral primitive contract. Definitions
and element assignments are validated by the shared shape catalogue and applied
identically in CLI and desktop-worker rendering. No SVG, script, CSS, font,
filter, image, network reference, or new C4 element kind enters the resource.

The version-one asset slice adds one local `.c4ml-assets.json` manifest for
passive UTF-8 `text/plain`, `text/markdown`, and `application/json` files. Every
entry declares stable identity, normalized local path, purpose, media type,
SHA-256, one SPDX license identifier, and optional attribution. Filesystem and
read-only Git loaders verify containment, content, JSON validity, and integrity;
manifest plus exact contents participate in project revisions and bounded typed
desktop transport. Binary, active, image, font, executable, and remote assets
remain excluded from version one.

Gate 1.5 is now complete. Every project resource is independently typed,
offline, deterministic, revisioned, and kept separate from architecture source
and installation-local workbench preferences.

The first manifest intentionally has no globs, remote sources, transitive
project dependencies, or module aliases. Those features require their own
identity, trust, caching, and reproducibility decisions.

## Pillar 1 — intent-based authoring

This pillar comes first because C4ML already has source mapping, compiler-owned
placement and routing intent, preview hit testing, and Monaco undo support.

### Slice 1.1 — explain effective geometry

- [x] add a read-only inspector that explains automatic candidate geometry,
      applied placement intent, adjustments, pins, Ports, and route guidance;
- [x] navigate every explanation to its owning source range; and
- [x] distinguish guaranteed hard intent, relaxed soft intent, and automatic
      engine choices.

### Slice 1.2 — detachable preview workspace

- [x] add a full-size preview mode inside the main workbench as the immediate
      single-window workspace;
- [x] define a versioned, read-only preview-projection contract for the current
      SVG, view, compiler status, navigation targets, selection, zoom, and Route
      overlay state;
- [x] open that projection in a second Electron window without giving the
      preview window compiler, source, filesystem, or document authority;
- [x] synchronize selection and source navigation in both directions, support
      redocking, and restore only safe window bounds and presentation state;
      and
- [x] keep detached preview behavior exclusively in the native Electron window;
      no hosted or standalone browser pop-out belongs to the product scope.

Superseded evaluation note: an optional same-origin browser pop-out was
considered before the desktop-only product boundary was made explicit. The
accepted native preview window now covers that use case, while the internal
renderer harness keeps only the full-size single-window workspace.

The main workbench and its compiler worker remain authoritative. Closing,
reopening, or moving the preview window MUST NOT change source, canonical
geometry, or exported SVG/PNG.

### Slice 1.3 — graphical placement edits

- [x] offer relative move, nudge, align, and distribute commands for selected
      elements;
- [x] show the proposed source and resulting preview before apply;
- [x] emit semantic placement intent first, relative adjustment second, and an
      exact `du` pin only through an explicit escape-hatch action; and
- [x] apply or undo the operation atomically.

### Slice 1.4 — graphical route edits

- [x] select source and target Ports graphically;
- [x] add, move, or remove route guidance through source change sets;
- [x] remove obsolete route controls when an operation no longer needs them;
      and
- [x] show hard conflicts and safe compiler-proposed repairs before apply.

### Slice 1.5 — semantic graphical authoring

- [x] create or connect architecture elements through explicit source edits;
- [x] keep semantic actions visually distinct from layout actions; and
- [x] offer only context-valid C4 operations from the language/authoring
      contract.

The implemented first slice covers creation and connection in the five static
C4 views. System Landscape and System Context offer People and Software
Systems; Container, Component, and Code views create only the element owned by
their active scope. Relationship endpoints are filtered through the same view
rules. Dynamic interactions and deployment topology deliberately remain
separate future semantic operations rather than being forced through a generic
"add box" action.

Pillar 1 is complete. The packaged desktop application applied and saved a
semantic architecture edit, was fully quit and restarted, reopened the saved
source without problems, and the standalone CLI validated that same file. The
source alone therefore reproduces the accepted edit without hidden workbench
state.

## Pillar 2 — semantic architecture evolution

### Slice 2.1 — semantic differ

- [x] compare two canonical snapshots by stable identity;
- [x] classify additions, removals, renames, property changes, relationship
      changes, deployment changes, view changes, and layout-only changes; and
- [x] ignore comments, formatting, declaration order, and source-location
      movement.

The implemented portable version-one result is exposed unchanged through the
compiler worker and the experimental CLI `diff` command. It also keeps the
stable View scope reference separate from its resolved display text so an
element rename does not appear as unrelated View churn.

### Slice 2.2 — impact and stable visual comparison

- [x] derive deterministic upstream and downstream impact paths;
- [x] preserve unchanged baseline geometry where compatible with hard layout
      and collision rules;
- [x] provide before, after, overlay, and change-only scene modes; and
- [x] ensure exported comparison artifacts explain their visual encoding.

The portable version-one impact report, conservative geometry-stability stage,
comparison-scene projection, compiler-worker pass-through, and CLI SVG/PNG export
are implemented. Geometry decisions explicitly distinguish retention, hard
layout ownership, additions/removals, incompatibility, containment, and
collision fallback. Comparison artifacts include visible and machine-readable
encoding for architecture change, affected paths, and layout-only movement.

### Slice 2.3 — local version-control adapter

- [x] keep Git and filesystem access in the desktop/CLI adapter boundary;
- [x] compare working source, selected commits, or branches without changing
      portable diff semantics; and
- [x] expose comparison results without persisting repository paths in the
      workbench session record.
- [x] expose local branch, upstream, divergence, index, and working-tree state
      in a left-side Source Control activity;
- [x] stage and unstage individual or all changes and commit staged changes
      after explicit user action; and
- [x] push the current branch through its configured upstream, or establish the
      upstream when exactly one remote is available.

The read-only local Git loader is implemented in the existing Node.js project
adapter already shared by desktop and CLI. It reads blobs and manifests from a
resolved commit without checkout, returns ordinary portable project documents,
and never enters compiler-core. The CLI accepts `working`, commit, tag, or
branch selections. Persisted workbench-session parsing continues to whitelist
only presentation state and demonstrably drops repository paths and refs.
The desktop extension uses a separate bounded working-tree adapter. It never
checks out, discards, pulls, fetches, or rewrites user work. Hosted-provider
authentication, branch creation/switching, pull/sync, and conflict resolution
remain later slices.

### Slice 2.4 — migration stories

- [x] compose reviewed architecture states into ordered migration steps;
- [x] retain identity and change provenance across steps; and
- [x] generate a navigable offline review presentation from compiler-owned
      states.

The portable version-one story contract accepts only explicitly reviewed
canonical states, derives deterministic transitions through the shared differ
and impact engine, and retains state provenance for every reported change. Its
offline HTML renderer embeds all four comparison SVG modes, provides ordered
step navigation, and rejects active or externally linked SVG content. The
original Garden Pulse review story has been exercised interactively in a local
offline HTML viewer.

Pillar 2 is complete at its version-one foundation: a rename remains a rename,
an unrelated reformatting produces an empty semantic diff, local Git states are
read without checkout, unchanged compatible geometry remains stable, and
reviewed states can be composed into a navigable offline migration story.

## Pillar 3 — architecture proof

### Slice 3.1 — built-in quality and completeness rules

- [x] expose existing C4 completeness and semantic validation through the
      shared finding contract;
- [x] add deterministic architecture-quality findings only where the evidence
      is explicit; and
- [x] explain each finding in familiar language with source navigation.

The portable version-one evaluator converts non-blocking shared validation
guidance and adds evidence-backed View-coverage and empty-View findings over a
validated snapshot. CLI and compiler worker return the same deterministic
report. The CLI prints source locations; the localized Output area lists the
plain-language findings and navigates directly to their Monaco declaration.
Blocking invalid source remains in the existing Problems path because it has
no canonical snapshot to analyze.

### Slice 3.2 — graph queries and impact lenses

- [x] provide upstream, downstream, path, containment, deployment, and
      view-coverage queries;
- [x] generate temporary focused views from query results without duplicating
      semantic model definitions; and
- [x] explain why every result item is included.

The portable version-one query engine works over canonical, kind-qualified
graph identities. It covers directional traversal, deterministic shortest
paths, containment in both directions, static-to-runtime deployment placement,
and resolved-View coverage. Every returned item and Relationship must carry an
inclusion explanation. Its temporary focus View stores only references and
evidence; the experimental CLI exposes the same result without creating or
changing authored Views.

### Slice 3.3 — project architecture policies

- [x] define a typed internal policy contract before proposing public syntax;
- [x] cover forbidden dependencies, required protocols, ownership, allowed
      direction, deployment consistency, and selected metadata requirements;
- [x] run the same policies in editor and CLI/CI; and
- [x] offer corrections only as reviewable source change sets.

The portable version-one contract uses exact kind-qualified stable identities,
normalizes policy sets deterministically, and evaluates all six rule families
over validated canonical snapshots. Violations become ordinary source-located
analysis findings with authored and derived evidence. Malformed, unknown, and
inapplicable policies fail with stable `C4ML-POLICY-*` codes. An optional
correction can only be a complete proposed single-document or atomic project
source change set with policy intent. An explicit project may now reference one
local version-one `.c4ml-policy.json` resource; desktop and CLI evaluate it
through the same portable core, and CLI CI thresholds use `--fail-on`. This
does not add public `.c4ml` policy syntax, hosted-provider configuration, or
policy-resource editing in Monaco.

### Slice 3.4 — claimed versus observed architecture

- [x] attach origin, confirmation state, observation time, and adapter identity
      to evidence without changing core C4 semantics;
- [x] compare authored claims with imported observations;
- [x] report drift and uncertainty instead of silently reconciling conflicts;
      and
- [x] keep repository, cloud, runtime, and monitoring integrations optional and
      replaceable.

The portable version-one observation contract compares explicit presence or
selected-field claims against the canonical snapshot. Every observation keeps
its adapter identity, normalized observation time, and `confirmed`,
`unreviewed`, or `disputed` state. Only a confirmed mismatch becomes drift;
unreviewed or disputed input remains uncertainty even when its value happens to
match authored source. An explicit project may select one bounded local
`.c4ml-observations.json` resource. Filesystem and Git-revision loading,
desktop transport, worker evaluation, CLI analysis, deterministic project
revision participation, and the original disagreeing Garden Pulse fixture are
implemented without network access. No scanner, hosted-provider format,
monitoring connection, source rewrite, or public `.c4ml` observation syntax is
accepted by this slice.

Pillar 3 is complete. The permanent `check:architecture-proof` gate evaluates
one original multifile project with a local policy and attributed observations
twice through the CLI. It requires byte-equivalent reports, source-located and
explained policy, drift, and uncertainty findings, the classified warning exit,
retained observation provenance, an unchanged canonical authored value, and an
unchanged project digest. Compiler-worker parity and source navigation remain
covered by the editor test suite and packaged-workbench evidence.

## Beta release gate

### Public source preparation

- [x] verify the current tree and all reachable revisions for high-confidence
      credential patterns and sensitive filenames;
- [x] add a source-build guide, contribution guide, and security policy;
- [x] add a least-privilege, commit-pinned Linux source gate for pushes and pull
      requests;
- [x] schedule explicit dependency-update pull requests without automatic merge;
- [x] correct the currently reported production dependency vulnerabilities;
- [x] rewrite the personal maintainer email address out of `main` and every
      retained local branch;
- [x] configure the repository to use the maintainer's GitHub `noreply` address
      for future commits;
- [x] delete the 25 obsolete, already merged local and remote work branches;
- [x] retain the superseded repositories and their 26 historical pull-request
      refs privately while publishing only the clean rewritten repository;
- [x] enable GitHub private vulnerability reporting and restore the intended
      branch/ruleset protection after changing visibility;
- [x] verify a clean clone through the public HTTPS URL; and
- [x] create the first public source tag from the reviewed `main` commit.

Changing repository visibility is an explicit maintainer action and is not
performed by a source-preparation change.

- [x] close Pillar 3 with one permanent deterministic policy-and-observation
      acceptance command;
- [x] compose the native host gate as `release:native` and record
      product/version-specific artifact hashes through `check:native-release`;
- [x] validate the current macOS arm64 packaged application, detached preview,
      native PNG path, ad-hoc signature, DMG, and ZIP under Node.js 24.15.0;
- [x] run the current source gate, Squirrel maker, and native artifact check on
      Windows x64 under Node.js 24.15.0;
- [x] run packaged smoke, install/remove/reinstall, no-system-Node launch, and
      the visible open/edit/Save As/restart/reopen plus SVG/PNG export round
      trip on Windows x64;
- [x] exercise the native Windows dirty-close-protection warning;
- [x] build, inspect, install, remove, reinstall, and offline-smoke the current
      DEB on Ubuntu arm64;
- [x] complete the visible Linux native-dialog file/export and Source Control
      round trip;
- [x] repeat the native DEB gate and visible installation/dialog round trip on
      Ubuntu x64 before publishing the amd64 download;
- [x] set the first beta product version, original cross-platform application
      icon, package metadata, and release notes;
- [ ] configure the Apple and Windows release signing identities; and
- [ ] perform Developer ID notarization and Windows release signing before a
      public download is described as a release artifact.

The current branch now has fresh Windows x64 and Linux x64 native build,
installation, no-system-Node smoke, uninstall/reinstall, and visible
file/export evidence. Public release signing remains platform-specific: macOS
Developer ID signing/notarization and Windows signing are not closed by these
functional checks.

## Next authoring block

- [x] let the guided System Context/Container assistant explicitly choose
      between a new document and a source-preserving extension of the active
      valid document;
- [x] generate the extension as one revision-checked project change set,
      reject project-wide ID collisions, and retain unrelated source byte for
      byte;
- [x] derive guided Component and Code questions from the selected owner and
      active View context;
- [x] add the dedicated Deployment-topology authoring gesture; and
- [x] add the dedicated Dynamic-interaction authoring gesture.

The architecture action now specializes itself by active View. Component and
Code retain the scope-derived owner with explicit guidance. Deployment offers
environment-bounded nodes, infrastructure, and scoped instances. Dynamic adds
ordered occurrences only through an existing directed static Relationship.
All three remain deterministic source change sets with candidate compilation,
explicit source review, and one-step undo.

The bounded extension slice intentionally requires existing `model` and
`relations` blocks. Creating missing top-level sections and choosing a target
document in a multifile project remain later interactions rather than hidden
heuristics.

## Contextual interaction follow-up

- [ ] offer frequent object-specific actions directly through right-click
      context menus in the source editor, diagram, project explorer, and other
      suitable workbench surfaces;
- [ ] make the available actions depend on the clicked object and current
      compiler-owned context; and
- [ ] keep toolbar, command-palette, and keyboard access as equivalent paths,
      but do not require the uncommon sequence of selecting an object and then
      searching for a distant generic button.

Context menus are presentation affordances only. They MUST invoke the existing
validated commands and source-change contracts rather than implementing new
syntax, semantics, layout, or hidden model state.

## Decisions deliberately deferred

The following choices do not block Gate 1 or the first slices:

- final public syntax for source change commands, policies, queries, evidence,
  or migration stories;
- reusable-library, module-alias, and external-project namespace rules beyond
  the implemented flat project;
- graphical creation of every C4 element kind;
- the first external evidence or repository scanner;
- cloud collaboration and hosted review; and
- optional AI-assisted phrasing or query entry.

They require explicit specification review when a bounded implementation slice
reaches them. The portable contracts MUST be useful without any of these
decisions.
