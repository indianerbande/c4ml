# `@c4ml/render-resvg`

This package is C4ML's production Node.js adapter for turning canonical SVG
into PNG through `@resvg/resvg-js` 2.6.2.

The portable compiler owns only the `PngRenderer` contract. This package owns
the native Node.js integration, rejects unresolved external images, keeps
system-font discovery disabled by default, and passes explicitly controlled
font files to resvg. CLI, reference-export, and Electron main-process code may
depend on this package; browser and compiler-core code must not.

resvg-js remains an unmodified MPL-2.0 dependency. Its capability, packaging
impact, offline behavior, replacement boundary, and license obligations are
recorded in [`docs/engineering/dependencies.md`](../../docs/engineering/dependencies.md).
