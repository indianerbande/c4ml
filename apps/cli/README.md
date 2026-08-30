# C4ML experimental CLI

This private application is the first thin Node.js command-line frontend over
the runtime-portable language and compiler core. It does not contain a second
parser, semantic model, layout model, or renderer.

From the repository root:

```shell
pnpm run c4ml -- version
pnpm run c4ml -- check examples/draft/hello-static-zoom.c4ml
pnpm run c4ml -- analyze path/to/project --fail-on error
pnpm run c4ml -- diff path/to/before.c4ml path/to/after.c4ml \
  --diagnostics json
pnpm run c4ml -- render examples/draft/hello-static-zoom.c4ml \
  --view arrangement-engine-code \
  --format svg,png \
  --output build/diagrams
```

Implemented commands and options:

- `check <file-or-project>` validates without creating output;
- `analyze <file-or-project>` emits the shared architecture findings report;
- `analyze --fail-on never|error|warning` optionally turns findings into a CI
  failure while still emitting the full report;
- `query <file-or-project>` runs the portable explained architecture queries;
- `diff <before> <after>` compares two valid files or projects by stable
  architecture identity;
- `render <file> --view <id>` renders one declared view;
- `render <file> --all` renders every declared view;
- `--format svg`, `png`, or `svg,png` selects output formats;
- `--scale <number>` scales PNG output;
- `--output <directory>` selects the output directory;
- `--diagnostics human|json` selects human or machine output; and
- `version` reports the provisional CLI and language versions.

Exit classes are `0` success, `2` usage, `3` source or view selection, `4`
layout/render compilation, `5` filesystem/environment failure, and `6` an
architecture-finding threshold selected by `analyze --fail-on`.

An explicit `c4ml.project.json` may select one local
`.c4ml-policy.json` resource and one local `.c4ml-observations.json` resource.
`analyze` evaluates both resources and the built-in catalogue through the same
portable compiler-core evaluators used by the desktop worker. Confirmed
observation mismatches are warning-level drift; unreviewed or disputed input is
information-level uncertainty and never changes authored source. The default
`--fail-on never` keeps findings informational to the process; `error` fails on
error findings, while `warning` fails on warnings or errors. A project-selected
`.c4ml-glossary.json` is validated and retained as non-source project knowledge
without changing compilation. Listed `.c4ml-narrative.md` chapters are likewise
validated as passive local Markdown and never enter architecture compilation.
A project publication resource is also validated against compiled View
identities before CLI commands proceed.
A validated project `.c4ml-theme.json` selection drives normal CLI rendering
through the same semantic theme resolver as the compiler worker.
Validated project shape definitions and assignments likewise enter the shared
diagram-preparation contract before normal CLI rendering.
Licensed passive project assets are containment- and SHA-256-verified by the
shared Node loader before any CLI command proceeds.

The CLI currently accepts the bounded experimental language slices for all
seven view types, including Deployment. Its command names and output contract
remain provisional. SVG embeds the controlled IBM Plex Sans WOFF2 faces. PNG
uses the matching local TTF faces through the production resvg adapter with
system-font discovery disabled.
