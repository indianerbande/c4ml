# C4ML Implementation Roadmap

Status: Active roadmap

Date: 2026-08-30

`SPEC.md` defines product behavior and architecture. `TESTING.md` defines the
evidence required to claim that behavior works. This file orders implementation
work; it does not freeze public `.c4ml` syntax or replace either normative
document.

## Strategic direction

C4ML is being developed as an explainable, versionable architecture compiler.
The next product direction consists of three connected pillars:

1. **Intent-based authoring:** graphical work produces explicit, reviewable,
   undoable source intent and never hidden layout or architecture state.
2. **Semantic architecture evolution:** validated architecture states are
   compared by stable identity, with architecture changes separated from text
   and layout noise.
3. **Architecture proof:** deterministic rules and graph queries explain
   compliance, impact, evidence, and source-located corrections.

The product direction is accepted. The detailed contracts and public source
syntax remain draft until their individual slices are reviewed and accepted in
`SPEC.md`.

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
- [x] prove Node.js and browser-worker parity.

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
      browser worker;
- [x] add desktop Open Folder, a project explorer, multi-document dirty state,
      and several source tabs;
- [x] add an explicit Save All command and preserve independent Monaco undo and
      cursor history per project document; and
- [ ] add typed glossary, narrative, policy, publication, theme, shape, and
      asset resources only through separately reviewed slices.

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
- [x] evaluate an optional same-origin browser pop-out using a browser messaging
      channel after the desktop workflow is proven; separate development ports
      are not part of the intended design.

The browser evaluation deliberately keeps pop-out deferred. Browser development
uses the implemented full-size single-window workspace until a same-origin
messaging, popup lifecycle, and recovery contract offers clear value beyond the
accepted desktop workflow.

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
browser worker and the experimental CLI `diff` command. It also keeps the
stable View scope reference separate from its resolved display text so an
element rename does not appear as unrelated View churn.

### Slice 2.2 — impact and stable visual comparison

- [ ] derive deterministic upstream and downstream impact paths;
- [ ] preserve unchanged baseline geometry where compatible with hard layout
      and collision rules;
- [ ] provide before, after, overlay, and change-only scene modes; and
- [ ] ensure exported comparison artifacts explain their visual encoding.

### Slice 2.3 — local version-control adapter

- [ ] keep Git and filesystem access in the desktop/CLI adapter boundary;
- [ ] compare working source, selected commits, or branches without changing
      portable diff semantics; and
- [ ] expose comparison results without persisting repository paths in the
      workbench session record.

### Slice 2.4 — migration stories

- [ ] compose reviewed architecture states into ordered migration steps;
- [ ] retain identity and change provenance across steps; and
- [ ] generate a navigable offline review presentation from compiler-owned
      states.

Pillar 2 is not complete until a rename remains a rename, an unrelated
reformatting produces an empty semantic diff, and a local architecture change
can be reviewed without whole-diagram layout churn.

## Pillar 3 — architecture proof

### Slice 3.1 — built-in quality and completeness rules

- [ ] expose existing C4 completeness and semantic validation through the
      shared finding contract;
- [ ] add deterministic architecture-quality findings only where the evidence
      is explicit; and
- [ ] explain each finding in familiar language with source navigation.

### Slice 3.2 — graph queries and impact lenses

- [ ] provide upstream, downstream, path, containment, deployment, and
      view-coverage queries;
- [ ] generate temporary focused views from query results without duplicating
      semantic model definitions; and
- [ ] explain why every result item is included.

### Slice 3.3 — project architecture policies

- [ ] define a typed internal policy contract before proposing public syntax;
- [ ] cover forbidden dependencies, required protocols, ownership, allowed
      direction, deployment consistency, and selected metadata requirements;
- [ ] run the same policies in editor and CLI/CI; and
- [ ] offer corrections only as reviewable source change sets.

### Slice 3.4 — claimed versus observed architecture

- [ ] attach origin, confirmation state, observation time, and adapter identity
      to evidence without changing core C4 semantics;
- [ ] compare authored claims with imported observations;
- [ ] report drift and uncertainty instead of silently reconciling conflicts;
      and
- [ ] keep repository, cloud, runtime, and monitoring integrations optional and
      replaceable.

Pillar 3 is not complete until findings are deterministic, source-located,
explainable, equivalent in editor and CLI, and independent of network access.

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
