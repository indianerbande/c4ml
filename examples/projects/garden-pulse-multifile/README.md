# Garden Pulse multifile project

This original C4ML fixture splits the executable Garden Pulse System Context
across model, relationship, and view documents. `c4ml.project.json` lists every
source explicitly; source order has no semantic or layout meaning.

The optional `evidence/local-inventory.c4ml-observations.json` resource is an
original offline fixture. It deliberately contains one confirmed name mismatch
and one unreviewed presence observation so `analyze` can demonstrate the
difference between drift and uncertainty without changing authored source.

The optional `knowledge/garden.c4ml-glossary.json` resource defines one domain
term and one acronym with deterministic aliases. It is project knowledge, not
architecture source, and therefore does not change the compiled diagram.

From the repository root:

```sh
pnpm run c4ml -- check examples/projects/garden-pulse-multifile
pnpm run c4ml -- analyze examples/projects/garden-pulse-multifile
pnpm run c4ml -- render examples/projects/garden-pulse-multifile \
  --view garden-pulse-context --format svg,png
```
