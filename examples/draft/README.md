# Draft C4ML examples

These files are original C4ML design previews. They exist so the proposed
authoring language can be reviewed against realistic documents.

They are **not executable**. The `.c4ml` parser, CLI, and formatter have not
been implemented, although the parser-neutral model, layout, routing, shape,
scene, SVG, and PNG contracts already have an internal executable path. Nothing
in this directory defines a stable grammar or compatibility commitment.

- `hello-context.c4ml` is the smallest useful model and System Context View.
- `signal-garden.c4ml` exercises the complete semantic hierarchy and all seven
  C4 view types.
- `shape-marker.c4ml` isolates the proposed safe custom-shape and Port syntax.

The accepted product behavior is defined in `SPEC.md`; the proposal is explained
in `DOCUMENTATION.md`.
