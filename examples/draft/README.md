# Draft C4ML examples

These files are original C4ML design previews. They exist so the proposed
authoring language can be reviewed against realistic documents.

The bounded `hello-context.c4ml`, `hello-container.c4ml`, and
`hello-static-zoom.c4ml`, `hello-dynamic.c4ml`, and `hello-deployment.c4ml`
slices are executable through the private experimental language package and its
tests. There is no public `.c4ml` parser or formatter. The other documents and
every construct outside those subsets remain non-executable review material.
Nothing in this directory defines a stable grammar or compatibility commitment.

- `hello-context.c4ml` is the smallest useful model and System Context View.
- `hello-container.c4ml` adds Container ownership, technologies, protocols, and
  one Container View.
- `hello-static-zoom.c4ml` adds Components, Code Elements, their typed ownership,
  and all four static C4 view types.
- `hello-dynamic.c4ml` adds a named System Landscape and ordered, parallel
  Dynamic Interactions over declared static Relationships.
- `hello-deployment.c4ml` adds environments, nested Deployment Nodes,
  Infrastructure Nodes, static instances, runtime relationships, and a
  Deployment View.
- `signal-garden.c4ml` exercises the complete semantic hierarchy and all seven
  C4 view types.
- `shape-marker.c4ml` isolates the proposed safe custom-shape and Port syntax.

The accepted product behavior is defined in `SPEC.md`; the proposal is explained
in `DOCUMENTATION.md`.
