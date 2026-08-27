# C4ML Dependency Record

Status: Phase 0 candidates used by the first Phase 1 render reference

Date: 2026-08-27

This file records why each direct dependency exists, its license and runtime
impact, the boundary that makes it replaceable, and the evidence required to
keep it. A Phase 0 candidate is not a permanent architecture decision.

## Runtime and candidate packages

### Langium 4.3.1

- **Capability:** parser generation, typed syntax trees, references,
  diagnostics, and later language-server support.
- **Why external:** mature error recovery, reference infrastructure, and LSP
  integration are specialized language-engineering capabilities.
- **License:** MIT.
- **Impact:** JavaScript runtime plus Chevrotain and LSP-oriented transitive
  packages. It supports Node.js, browsers, and browser workers.
- **Offline behavior:** parsing and language services run locally after package
  installation; no runtime network access is required.
- **Boundary:** the parser produces a syntax representation that is translated
  into C4ML-owned semantic domain types. Langium AST types MUST NOT become the
  public semantic model.
- **Phase 0 evidence:** generate and parse an original disposable probe grammar,
  resolve an original cross-reference, and report invalid input with a source
  range.

`langium-cli` 4.3.0 is a build-time MIT-licensed companion used only to generate
the disposable probe artifacts.

### ELK.js 0.12.0

- **Capability:** candidate automatic layout with layered graphs, compound
  nodes, ports, and orthogonal edge routing.
- **Why external:** high-quality graph layout is a mature algorithmic domain;
  reimplementing the whole layered-layout engine would add risk without
  differentiating C4ML.
- **License:** `EPL-2.0 OR GPL-3.0-or-later`; C4ML uses the EPL-2.0 option and
  keeps the unmodified package separate.
- **Impact:** comparatively large JavaScript/GWT layout bundle; usable in Node.js
  and browsers, with optional Web Worker execution.
- **Offline behavior:** layout runs locally after installation and requires no
  network access.
- **Boundary:** an engine-neutral `LayoutAdapter` contract owns C4ML input and
  output types. ELK identifiers, options, coordinates, and objects MUST NOT leak
  beyond the adapter.
- **Phase 0 evidence:** finite geometry, normalized output, deterministic
  repeated results, compound-node handling, and explicit failure for invalid
  adapter input.

Redistribution of ELK.js must preserve its notices and satisfy EPL-2.0 source
availability requirements for the ELK.js program. C4ML MUST NOT modify or copy
ELK.js source into the repository.

### resvg-js 2.6.2

- **Capability:** deterministic SVG-to-PNG rasterization without a browser.
- **Why external:** correct SVG rasterization, font processing, and native image
  encoding are mature specialist capabilities.
- **License:** MPL-2.0.
- **Impact:** Node.js native package with platform-specific optional binaries.
  A separate WebAssembly package exists for browser use, but it is not accepted
  by this spike.
- **Offline behavior:** rasterization runs locally after installation. External
  images and system-font discovery are disabled by the C4ML adapter.
- **Boundary:** a `PngRenderer` contract accepts canonical SVG and returns PNG
  bytes plus dimensions. The Node.js native implementation remains outside the
  portable compiler core.
- **Phase 0 evidence:** valid PNG signature and dimensions, repeated byte-stable
  output for controlled SVG, disabled system fonts, and no external resources.

Redistribution must preserve MPL-2.0 notices and the source availability rights
for covered resvg-js files. C4ML MUST NOT modify or copy resvg-js source into the
repository.

## Development tools

| Package | Phase 0 version | License | Purpose |
| --- | ---: | --- | --- |
| pnpm | 11.24.0 | MIT | pinned workspace package manager |
| TypeScript | 7.0.2 | Apache-2.0 | strict type checking and ESM build |
| Vitest | 4.1.11 | MIT | unit and adapter-contract tests |
| `@types/node` | 24.13.3 | MIT | Node.js 24 LTS type surface |
| esbuild | 0.28.2 | MIT | in-memory browser bundle compatibility check |

Development tools do not define C4ML runtime semantics. Their versions are
pinned by the root manifest and lockfile and may be upgraded only with a clean
build and test run.

Only esbuild 0.28.2 is permitted to execute a dependency build script. The
version-specific `allowBuilds` map in `pnpm-workspace.yaml` records that narrow
approval; all unreviewed dependency build scripts remain blocked by pnpm.

## Phase 0 results

The 2026-08-27 spike produced the following evidence:

- Langium generated the disposable original probe, parsed it, resolved a
  cross-reference, and returned a source-ranged unresolved-reference
  diagnostic.
- ELK.js returned finite, normalized, repeatable geometry for flat and compound
  graphs. Invalid engine-neutral input failed before ELK was invoked.
- resvg-js produced a visually inspected 640 by 360 PNG from an original local
  SVG. Controlled repeated input was byte-stable, scaling preserved dimensions,
  and external image resources were rejected.
- The compiler core, Langium services, and ELK adapter bundled successfully as
  browser-targeted ECMAScript modules without Node.js polyfills. Unminified
  in-memory probe bundle sizes were approximately 2.5 KB, 920 KB, and 3.3 MB
  respectively; production size and worker-loading strategy remain open.
- The complete suite contained 12 distinct passing tests. Build, source/test
  type checking, browser bundling, and tests passed through `pnpm run check`.
- The installed development tree occupied approximately 113 MB on macOS arm64;
  individual package-store entries were approximately 7.7 MB for ELK.js, 5.4 MB
  for Langium, 3.4 MB for the resvg native binary, and 10 MB for esbuild.
- The production license inventory contained Apache-2.0, MIT, MPL-2.0, and
  `EPL-2.0 OR GPL-3.0-or-later`; no unknown license was reported.

ELK.js 0.12.0's published declaration files are not fully compatible with
TypeScript 7.0.2: one generic declaration fails and its browser `Worker` type is
ambient. Phase 0 confines `skipLibCheck` and a local CommonJS-constructor cast
to the ELK adapter. Permanent adoption requires either compatible upstream
types or a reviewed adapter-local declaration boundary; this workaround MUST
NOT spread into the compiler core.

These results establish technical feasibility, not permanent dependency
acceptance. The product grammar, editor framework, production bundle strategy,
font policy, and final layout/routing architecture remain open.

The Phase 1 reference exporter now invokes the same candidate ELK.js and
resvg-js adapters through the C4ML-owned contracts. ELK output is normalized to
absolute geometry across nested compound nodes before later stages consume it.
The reference PNG explicitly uses locally available system fonts when no font
file is configured, so it is suitable for visual review but not a reproducible
golden. A future accepted font asset must be documented before deterministic
text-bearing PNG evidence can be claimed.

The local checks ran on macOS arm64 with Node.js 26.4.0. Node.js 24 is the
declared active-LTS minimum but still needs a clean CI or local Node.js 24 run
before Phase 0 can claim that baseline as automatically validated.

## Asset status

Phase 0 contains no third-party fonts, icons, themes, sample architectures, or
other visual assets. All probe data and test fixtures must be original C4ML
material.
