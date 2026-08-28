# C4ML experimental CLI

This private application is the first thin Node.js command-line frontend over
the browser-compatible language and compiler core. It does not contain a second
parser, semantic model, layout model, or renderer.

From the repository root:

```shell
pnpm run c4ml -- version
pnpm run c4ml -- check examples/draft/hello-static-zoom.c4ml
pnpm run c4ml -- render examples/draft/hello-static-zoom.c4ml \
  --view arrangement-engine-code \
  --format svg,png \
  --output build/diagrams
```

Implemented commands and options:

- `check <file>` validates without creating output;
- `render <file> --view <id>` renders one declared view;
- `render <file> --all` renders every declared view;
- `--format svg`, `png`, or `svg,png` selects output formats;
- `--scale <number>` scales PNG output;
- `--output <directory>` selects the output directory;
- `--diagnostics human|json` selects human or machine output; and
- `version` reports the provisional CLI and language versions.

Exit classes are `0` success, `2` usage, `3` source or view selection, `4`
layout/render compilation, and `5` filesystem/environment failure.

The CLI currently accepts the bounded experimental language slices for all
seven view types, including Deployment. Its command names and output contract
remain provisional. PNG output uses the isolated resvg candidate and currently
loads local system fonts; a bundled reproducible font remains required before
production acceptance.
