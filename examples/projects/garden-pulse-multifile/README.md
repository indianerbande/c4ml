# Garden Pulse multifile project

This original C4ML fixture splits the executable Garden Pulse System Context
across model, relationship, and view documents. `c4ml.project.json` lists every
source explicitly; source order has no semantic or layout meaning.

From the repository root:

```sh
pnpm run c4ml -- check examples/projects/garden-pulse-multifile
pnpm run c4ml -- render examples/projects/garden-pulse-multifile \
  --view garden-pulse-context --format svg,png
```
