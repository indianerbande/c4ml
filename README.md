# C4ML

C4ML is an original model-and-diagram compiler for the complete C4 model. It is
currently in Phase 0: architecture contracts and replaceable dependency spikes
are being validated before the product grammar or editor framework is frozen.

The intended runtime is one browser-compatible TypeScript compiler core, a thin
Node.js CLI, and a TypeScript editor that runs compilation in a Web Worker.
Canonical SVG and derived PNG output are MVP requirements.

See `SPEC.md` for behavior, `TESTING.md` for required evidence,
`DEPENDENCIES.md` for dependency boundaries, and `AGENTS.md` for repository
workflow.

## Phase 0 commands

Use Node.js 24 LTS and the pnpm version pinned in `package.json`.

```shell
pnpm install
pnpm run check
```

The check builds all packages, verifies browser bundles in memory, type-checks
the tests, and runs the Phase 0 suite. It does not yet build a production CLI or
editor.
