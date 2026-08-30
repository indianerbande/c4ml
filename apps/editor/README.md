# C4ML desktop renderer

This private Angular application is the renderer UI of the production-bound
C4ML desktop workbench. Electron owns native application and filesystem
integration in `apps/desktop`; Angular and Monaco remain confined to the
sandboxed renderer. The product interface and the `.c4ml` language are not yet
stable or feature-complete.

Implemented:

- Angular 22 standalone application with Signals and zoneless change detection;
- an original IDE-like shell with simultaneous source and SVG preview tabs,
  C4ML-specific Files, Source Control, Diagrams, Output, and Help activity
  areas, a Problems/Route
  panel, status bar, and command palette;
- compilation and language processing in a local Web Worker;
- versioned, request-identified worker messages;
- rejection of stale worker results;
- preservation of the last valid SVG while current source is invalid;
- source-located diagnostics for the executable System Landscape, System
  Context, Container, Component, Code, Dynamic, and Deployment subsets;
- project-selected architecture-policy findings evaluated in the same worker
  analysis report as the CLI and navigable from Output to architecture source;
- the accepted lazy Monaco 0.56.0 runtime behind a C4ML-owned adapter;
- an in-place context-valid completion popup with exact worker-owned source
  replacement ranges;
- inline compiler markers, diagnostic-to-source navigation, and keyboard
  undo/redo;
- bidirectional navigation between source declarations and source-mapped
  preview nodes, using compiler-owned stable scene/SVG identities;
- Relationship and effective-Route selection from either semantic or
  view-local route-control source, with a toggleable routing-debug overlay and
  effective-route inspector;
- separate preview targets for Ports, route labels, and corridors that reveal
  their owning route-control source;
- a source-backed placement editor opened from selected element geometry, with
  relative placement, automatic-relative nudge, alignment, ordered
  distribution, an explicit exact-pin escape hatch, non-mutating candidate
  source/SVG review, and one-step Monaco apply/undo;
- a source-backed Route editor opened from a selected effective Route, with
  graphical cardinal Port selection, add/move/remove guidance operations,
  removal of incompatible controls, non-mutating candidate source/SVG review,
  safe-repair and hard-conflict reporting, and one-step Monaco apply/undo;
- selection among the executable views declared in the current document;
- locally packaged IBM Plex Sans for the interface and diagrams, IBM Plex Mono
  for source, and standalone SVG font embedding;
- vector-preserving zoom without CSS transform scaling, fit, scroll-pan, local
  SVG download, and native desktop PNG export at 1x, 2x, or 3x;
- a full-size single-window preview and a detachable projection-only preview
  that synchronizes selection, zoom, Route overlay, and redocking through the
  authoritative main workbench;
- an optional typed desktop bridge for native Open, Save, and Save As without
  exposing filesystem paths or Node.js APIs to the renderer;
- a local Source Control area for repository status, staging, unstaging,
  committing, and pushing through that opaque, validated desktop bridge;
- a versioned local-preferences service and category-based settings panel for
  English/German workbench copy, workbench color scheme, and source-editor
  typography;
- a versioned local workbench session that stores only safe UI presentation
  state, never source, handles, or filesystem paths; and
- a plain-language new-document wizard for bounded System Context and Container
  starters, with generated-source review, cancel, apply, and one explicit undo.

Monaco owns source-text editing and presentation only. The C4ML worker remains
the sole source of completions, highlighting, diagnostics, and navigation
mappings, and no Monaco language service defines C4ML syntax or semantics. The
preview uses the accepted renderer Web Worker ELK.js adapter; the linear preview layout
remains test-only compatibility code. The detached bootstrap does not create
the workbench root, Monaco, or compiler worker. It consumes only the restricted
desktop preview bridge and never receives source or filesystem authority.

The current wizard is intentionally narrower than the future guided-modeling
scope recorded in `SPEC.md`. It creates one complete `draft-1` System Context
or Container document and does not edit existing source. Questions lead with
familiar architecture concepts; C4 vocabulary is optional explanatory text.
Future Component, Code, Deployment, Visual Group, and merge behavior must
continue to produce ordinary C4ML source rather than hidden editor state.

From the repository root:

```shell
pnpm run desktop:start
pnpm run renderer:start
pnpm run renderer:build
```

`desktop:start` is the only supported application path. `renderer:start` opens
an internal development harness for isolated UI work; native file controls are
hidden there, and it is not a browser product or deployment target. The built
renderer is written to the ignored `build/editor/` directory and requires no
runtime network connection. The production build keeps the Angular
shell small, loads the Monaco runtime, stylesheet, and generic editor worker
locally when the source pane initializes, and includes generated dependency
licenses plus Monaco's upstream license and third-party notices. The reviewed
IBM Plex WOFF2 assets and unchanged OFL-1.1 license are packaged locally; the
application performs no font-CDN request.

Workbench settings are installation-local presentation state. They are opened
from the toolbar or the desktop `Cmd/Ctrl+,` command, apply live, and are stored
under a versioned key. They never enter compiler requests or canonical diagram
exports. Interface language also synchronizes C4ML-owned native controls while
leaving authored source, model text, diagnostics, and diagrams unchanged. See
`SETTINGS.md` for the setting catalogue and extension contract.
