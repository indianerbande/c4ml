# C4ML desktop editor

This private application is the production-bound C4ML desktop editor. Its
Angular and Monaco library boundaries are accepted; the product interface and
the `.c4ml` language are not yet stable or feature-complete.

Implemented:

- Angular 22 standalone application with Signals and zoneless change detection;
- two-pane source and SVG preview layout;
- compilation and language processing in a browser Web Worker;
- versioned, request-identified worker messages;
- rejection of stale worker results;
- preservation of the last valid SVG while current source is invalid;
- source-located diagnostics for the executable System Landscape, System
  Context, Container, Component, Code, Dynamic, and Deployment subsets;
- the accepted lazy Monaco 0.56.0 runtime behind a C4ML-owned adapter;
- an in-place context-valid completion popup with exact worker-owned source
  replacement ranges;
- inline compiler markers, diagnostic-to-source navigation, and keyboard
  undo/redo;
- bidirectional navigation between source declarations and source-mapped
  preview nodes, using compiler-owned stable scene/SVG identities;
- selection among the executable views declared in the current document;
- zoom, fit, scroll-pan, and local SVG download; and
- a three-step new-document System Context wizard with generated-source review,
  cancel, apply, and one explicit undo.

Monaco owns browser text editing and presentation only. The C4ML worker remains
the sole source of completions, highlighting, diagnostics, and navigation
mappings, and no Monaco language service defines C4ML syntax or semantics. The
preview uses the accepted browser ELK.js adapter; the linear preview layout
remains test-only compatibility code.

The current wizard is intentionally narrower than the future guided-modeling
scope recorded in `SPEC.md`. It creates one complete `draft-1` System Context
document and does not edit existing source. Future Container, Component, Code,
Deployment, Visual Group, and merge behavior must continue to produce ordinary
C4ML source rather than hidden editor state.

From the repository root:

```shell
pnpm run editor:start
pnpm run editor:build
```

The built application is written to the ignored `build/editor/` directory and
requires no runtime network connection. The production build keeps the Angular
shell small, loads the Monaco runtime, stylesheet, and generic editor worker
locally when the source pane initializes, and includes generated dependency
licenses plus Monaco's upstream license and third-party notices.
