# Draft C4ML examples

These files are original C4ML design previews. They exist so the proposed
authoring language can be reviewed against realistic documents.

Only the minimal `hello-context.c4ml` subset is executable, through the private
experimental language package and its tests. There is no public `.c4ml` parser,
CLI, or formatter. The other documents and every construct outside that subset
remain non-executable review material. Nothing in this directory defines a
stable grammar or compatibility commitment.

- `hello-context.c4ml` is the smallest useful model and System Context View.
- `signal-garden.c4ml` exercises the complete semantic hierarchy and all seven
  C4 view types.
- `shape-marker.c4ml` isolates the proposed safe custom-shape and Port syntax.

The accepted product behavior is defined in `SPEC.md`; the proposal is explained
in `DOCUMENTATION.md`.
