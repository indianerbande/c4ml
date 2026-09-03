# C4thedral project status

[English](project-status.md) | [Deutsch](../de/project-status.md)

Status: Public source beta

Current release: `v0.1.0-beta.4`

Updated: 2026-09-03

This document states the current product maturity and the boundaries of the
beta. It is not a development diary. Detailed product requirements live in
the [engineering specification](../engineering/specification.md), validation
evidence in [testing](../engineering/testing.md), completed changes in the
[release notes](releases/0.1.0-beta.4.md), and engineering work items in the
[roadmap](../engineering/roadmap.md).

## What beta means here

C4thedral is usable software with a working desktop application, a compiler,
and a command-line interface. It is not merely a parser experiment or an empty
application shell. The current executable C4ML language can model and render all
seven C4 view types, and the same compiler runs in the desktop worker and CLI.

The beta label makes two promises deliberately weaker than a stable release:

1. **Source compatibility is not frozen.** Existing beta files work with the
   beta compiler, but author-facing syntax and CLI commands may still change
   before a stable release. A later version may require a documented migration.
2. **Official signed downloads are not published yet.** The source can produce
   native packages, but Apple Developer ID signing and notarization and Windows
   publisher signing are still outstanding.

The beta is suitable for evaluation, local architecture work, source builds,
and contributions. It should not yet be treated as a long-term compatibility
contract or an officially signed binary distribution.

## Available in the current beta

### Modeling and diagrams

- One semantic architecture model with stable identities and directed
  relationships.
- People, Software Systems, Containers, Components, and Code Elements.
- Deployment environments, nested deployment nodes, infrastructure, and
  Software System or Container instances.
- System Landscape, System Context, Container, Component, Code, Dynamic, and
  Deployment views.
- Single-file models and explicit multi-file projects with cross-document
  references, diagnostics, navigation, and save behavior.
- Deterministic standalone SVG and derived PNG output with controlled IBM Plex
  fonts.

### Layout and routing

- Automatic compound layout through the replaceable ELK.js adapter.
- Relative placement, alignment, equal spacing, movement from the automatic
  result, and exact pinning for selected elements.
- Automatic, guided, and fixed routes with cardinal ports, relative or absolute
  waypoints, locked segments, avoidance areas, named corridors and lanes, and
  explicit label placement.
- Inspectable automatic and final geometry plus route debugging in the desktop
  preview.

This is already enough for the intended hybrid workflow: accept a useful
automatic result, then add only the source-backed controls needed for a specific
diagram. More specialized constraint forms, such as named row/column groups,
proximity preferences, bounded movement, and constrained element sizing, remain
future extensions. Their absence does not disable automatic layout or the
implemented placement and route controls.

### Desktop workbench

- Native Electron workbench with Angular, Monaco, and a local compiler worker.
- Files, Source Control, Diagrams, Output, Help, Problems, Route inspection,
  settings, command search, and a local English/German handbook.
- Native file/project open, Save, Save All, Save As, close protection, SVG/PNG
  export, and an empty startup workspace.
- Bidirectional source/diagram navigation and source-backed graphical creation,
  connection, placement, routing, Deployment topology, and Dynamic interaction
  operations with candidate review and one-step undo.
- Full-workbench and detached projection-only preview modes.
- Explicit local Git status, stage, unstage, commit, and push actions. There is
  intentionally no hidden pull, checkout, discard, or history rewrite.
- Local interface language, light/dark appearance, color families, source
  themes, and editor typography settings.

### Architecture evolution and checks

- Semantic comparison by stable identity, including renames, impact paths,
  stable visual comparison, and offline migration-story reviews.
- Built-in quality findings and graph queries with source-located evidence.
- Optional local policy and observation resources evaluated identically by the
  desktop worker and CLI without changing authored source.
- Typed glossary, narrative, publication, theme, shape, and licensed passive-
  asset project resources.

## Language status

There is a real `.c4ml` parser. It parses and compiles the syntax used by the
executable examples, including all seven view families and the implemented
placement and routing controls. Calling the parser "not complete" in older
project notes meant that the project had not frozen every planned public syntax
construct; it did not mean that `.c4ml` files could not be parsed.

The following language boundaries remain provisional:

- no backward-compatibility promise before the first stable language version;
- no general source formatter yet;
- some guide sections remain explicitly marked design previews rather than
  executable syntax;
- Visual Group syntax and source declarations for custom shapes are not in the
  executable parser yet; and
- themes work through built-in presets and `.c4ml-theme.json` project resources,
  while a possible inline `.c4ml` theme grammar is not frozen.

The [user guide](user-guide.md) distinguishes executable syntax from design previews, and
`examples/draft` contains the runnable beta examples.

## CLI status

The CLI validates, renders, compares, analyzes, and queries files or projects
through the shared compiler. It supports SVG and PNG, one or all views, JSON or
human diagnostics, Git-revision comparison without checkout, and classified
exit codes for automation.

Its command names and options may still change, and it is invoked through the
repository rather than installed as an independent published package. This is
why it is described as experimental even though its implemented commands are
tested and useful.

## Native platform status

Native builds must be created and verified on their target operating system.
The current beta has passed source, package, installation, offline launch, and
native file/export workflows on:

- macOS arm64;
- Windows x64;
- Ubuntu arm64; and
- Ubuntu x64.

macOS development artifacts are ad-hoc signed only. Public Apple distribution
still requires Developer ID signing and notarization. Windows native behavior
and Squirrel installation have passed, but a public installer still requires a
publisher signature. Ubuntu uses a native DEB so the Chromium sandbox helper is
installed with the required ownership and permissions.

Exact evidence and host-specific commands are recorded in the [platform
matrix](platforms.md) and [testing requirements](../engineering/testing.md).

## Remaining work before a signed public binary release

- Configure and validate Apple Developer ID signing and notarization.
- Configure and validate Windows publisher signing.
- Publish only native artifacts produced by the complete host-specific release
  gate.
- Decide the compatibility and migration policy for the first stable C4ML
  language and CLI.

The following are product improvements rather than blockers for using the
source beta:

- a general C4ML formatter;
- more specialized placement and routing constraints;
- independently selectable Arrowheads in the preview;
- complete assistive-technology validation before making a broad accessibility
  claim;
- broader wizard flows, including Visual Groups and explicit target-document
  choice in multi-file projects; and
- a separately packaged CLI.

## Status sources

- [Release notes](releases/0.1.0-beta.4.md) record what is included in the
  current tagged release.
- The [platform matrix](platforms.md) records current native platform evidence.
- [Testing](../engineering/testing.md) defines the evidence required for
  product claims.
- The [engineering roadmap](../engineering/roadmap.md) tracks implementation
  work and deliberately deferred decisions.
- The [specification](../engineering/specification.md) remains authoritative
  for product behavior and architecture.
