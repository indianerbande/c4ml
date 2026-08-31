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

The optional `docs/overview.c4ml-narrative.md` chapter adds passive project
context with a local glossary link. Its metadata and link safety are validated,
but it is not compiled as architecture source.

The optional `publication/review.c4ml-publication.json` resource selects the
Context View, supplies its review caption, and defines a deterministic SVG
profile without changing the View itself.

The optional `presentation/garden.c4ml-theme.json` resource applies the Garden
diagram preset and a pale project background consistently in CLI and desktop
worker rendering.

The optional `presentation/garden.c4ml-shapes.json` resource assigns an original
safe octagonal card to Sensor Post through the shared normalized shape contract.

The optional `assets/garden.c4ml-assets.json` manifest licenses and hashes the
original passive offline review note. Loaders verify its exact SHA-256 before
the project is accepted.

From the repository root:

```sh
pnpm run c4ml -- check examples/projects/garden-pulse-multifile
pnpm run c4ml -- analyze examples/projects/garden-pulse-multifile
pnpm run c4ml -- render examples/projects/garden-pulse-multifile \
  --view garden-pulse-context --format svg,png
```
