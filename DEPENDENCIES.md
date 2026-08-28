# C4ML Dependency Record

Status: Accepted desktop editor stack with remaining compiler-adapter candidates

Date: 2026-08-28

This file records why each direct dependency exists, its license and runtime
impact, the boundary that makes it replaceable, and the evidence required to
keep it. Accepted dependencies and still-open candidates are labelled
separately; passing a Phase 0 spike alone is not permanent acceptance.

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
- **Phase 1 evidence:** parse the original `hello-context.c4ml`,
  `hello-container.c4ml`, `hello-static-zoom.c4ml`, `hello-dynamic.c4ml`, and
  `hello-deployment.c4ml` subsets, resolve typed ownership, all seven view
  scopes, Dynamic endpoints, Deployment Environments and runtime placement,
  and static Relationship references with source-located C4ML diagnostics,
  translate generated AST nodes into compiler-owned domain types, produce
  deterministic SVG through the shared compiler pipeline, return grammar- and
  scope-derived completion candidates with exact text edits, and bundle the
  language package for a browser without Node.js polyfills.

The completion spike activates Langium's LSP completion services inside the
existing compiler worker. This adds no new direct dependency, but it increases
the production worker bundle and produces Angular optimization warnings for
Langium's CommonJS `vscode-languageserver` and
`vscode-languageserver-protocol` transitive packages. Production language
integration must account for that bundle and module-format cost.

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

## Accepted desktop editor libraries

The editor pins `@angular/core`, `@angular/common`, and
`@angular/platform-browser` 22.1.4. AOT development uses `@angular/compiler`
and `@angular/compiler-cli` 22.1.4 plus `@angular/build` and `@angular/cli`
22.1.6. The patch difference avoids a resolved transitive peer mismatch while
remaining inside Angular Build's declared Angular 22 peer range.

- **Capability:** structured browser application composition, dependency
  injection, reactive UI state, routing, and testable editor-shell components.
- **Why external:** a production browser application framework is mature
  infrastructure outside C4ML's architecture-modeling and diagram-compilation
  core.
- **License:** Angular packages are MIT. RxJS 7.8.2 is Apache-2.0 and tslib
  2.8.1 is 0BSD.
- **Impact:** browser runtime and build-tool dependencies confined to the editor
  application; no Angular package enters the portable compiler core. Before
  Monaco was installed, the full workspace tree was approximately
  298 MB on the reference macOS arm64 checkout. The Angular shell, completion,
  wizard UI, and selectable views produced an approximately 192 KB initial
  bundle and a lazy 761 KB compiler-worker bundle before transfer compression.
  Angular CLI 22.1.6 raises the workspace build
  minimum to Node.js 24.15.0 when using the project's accepted Node 24 baseline.
- **Offline behavior:** the built editor and its compiler worker must operate
  without runtime network access; the editor does so today.
- **Boundary:** `apps/editor` depends on C4ML-owned worker messages and
  compiler contracts. Angular components and services MUST NOT become compiler
  APIs.
- **Implemented evidence:** the application builds with TypeScript 6.0.3, runs
  parsing and compilation in a module Web Worker, rejects stale responses,
  retains the last valid preview, reports source-located diagnostics, supplies
  scoped completions, generates wizard source, switches among views by stable
  identifier, and was interactively verified in a desktop browser without a
  compiler service.

The editor uses Angular's zoneless mode, so Zone.js is not installed.
Optional native build scripts for `@parcel/watcher`, `lmdb`, and
`msgpackr-extract` are explicitly disabled. Angular's persistent build cache is
disabled so the editor build does not depend on the unbuilt optional LMDB
native module.

Monaco is accepted for the first-release desktop editor. Its adapter remains a
deliberate architecture boundary, not an indication that source-editor
selection is still open.

### Monaco Editor 0.56.0

**Status: accepted, implemented, automatically validated, and visually
validated for the desktop editor.**

- **Capability:** desktop-grade source editing, completion presentation,
  diagnostics, navigation, keyboard commands, and undo around the existing
  C4ML worker contracts.
- **Why external:** text-editor rendering, input-method handling, selection,
  accessibility, and undo are mature browser UI infrastructure outside C4ML's
  architecture compiler.
- **License:** Monaco is MIT and carries `LICENSE` and
  `ThirdPartyNotices.txt`. Its installed runtime dependencies are Marked 14.0.0
  under MIT and DOMPurify 3.4.8 under `MPL-2.0 OR Apache-2.0`. Release
  packaging must preserve the applicable licenses and notices.
- **Impact:** the Monaco package-store entry is approximately 98 MB; Marked and
  DOMPurify entries are approximately 952 KB and 756 KB. Shared pnpm storage
  increased the complete workspace tree from approximately 298 MB to 372 MB on
  the reference macOS arm64 checkout. The production build keeps the app at a
  195.90 KB initial total and emits Monaco as a 3.05 MB lazy runtime with a
  304.37 KB generic editor worker. Its official 350,112-byte stylesheet is loaded
  lazily from a local build asset. Sizes are before transfer compression.
  Monaco's official README says mobile browsers are unsupported; C4ML's
  first-release editor is explicitly desktop-only.
- **Adapter risk:** Monaco 0.56.0's public tree-shakeable `suggest` feature
  entry registers inline completion support but not the popup controller used
  by the editor. The pinned adapter therefore imports that version's exported
  `editor/contrib/suggest` controller entry directly. This version-sensitive
  import is confined to the Monaco runtime adapter. The production dependency
  check pins the reviewed version, verifies that entry point, and forces an
  explicit revalidation on every upgrade.
- **Offline behavior:** the editor, stylesheet, generic worker, and
  C4ML compiler worker were exercised entirely from the local Angular server;
  no runtime CDN, compiler service, or other network service is used.
- **Boundary:** one C4ML-owned Angular source-editor adapter translates model
  changes, exact completion edits, and diagnostics. The existing C4ML worker
  remains authoritative; Monaco language workers and built-in language
  services are not part of the accepted integration.
- **Protecting evidence:** the source-editor translation suite checks exact
  completion edits and diagnostic ranges; editor-session tests check stale and
  failed asynchronous completion settlement. The production Angular build
  measures the separate chunks. Interactive browser checks cover the labelled
  textbox, listbox popup, context-only candidates, exact application, inline
  markers, diagnostic navigation, keyboard undo/redo, wizard synchronization,
  last-valid preview, and local runtime. Angular's build emits its dependency
  license inventory; Monaco's upstream `LICENSE` and `ThirdPartyNotices.txt`
  are copied into the editor artifact. A real screen-reader pass remains a
  release-level accessibility check.

Superseded evaluation note (2026-08-28): CodeMirror 6 was evaluated as a
possible smaller fallback. The user accepted Monaco after reviewing its broad
adoption, desktop scope, measured lazy-load cost, and working C4ML integration.
CodeMirror is no longer an active dependency candidate.

Sources: [Monaco README](https://github.com/microsoft/monaco-editor/blob/main/README.md),
[Monaco package metadata](https://github.com/microsoft/monaco-editor/blob/main/package.json),
[Monaco 0.56 changelog](https://github.com/microsoft/monaco-editor/blob/main/CHANGELOG.md),
[CodeMirror completion guide](https://codemirror.net/examples/autocompletion/),
and [CodeMirror license](https://github.com/codemirror/dev/blob/main/LICENSE).

## Experimental CLI application

`apps/cli` adds no external dependency. It depends only on the C4ML compiler and
language workspaces plus the already recorded ELK.js and resvg-js candidate
adapters. The app owns filesystem, process, argument, and exit-code behavior;
none of those Node.js concerns enter the portable compiler core. Its tests
protect that boundary through real local files, invocation from an unrelated
working directory, source validation, view selection, and SVG/PNG output.

The current PNG path loads local system fonts to make the contributor command
usable. This is explicitly non-reproducible and cannot become the release
default; a licensed bundled font and corresponding render evidence remain an
open dependency decision.

## Development tools

| Package | Current pinned version | License | Purpose |
| --- | ---: | --- | --- |
| pnpm | 11.24.0 | MIT | pinned workspace package manager |
| TypeScript | 6.0.3 | Apache-2.0 | strict type checking and ESM build; compatible with the Angular 22 editor baseline |
| Vitest | 4.1.11 | MIT | unit and adapter-contract tests |
| `@types/node` | 24.13.3 | MIT | Node.js 24 LTS type surface |
| esbuild | 0.28.2 | MIT | in-memory browser bundle compatibility check |

Development tools do not define C4ML runtime semantics. Their versions are
pinned by the root manifest and lockfile and may be upgraded only with a clean
Only esbuild 0.28.2 is permitted to execute a dependency build script. The
version-specific `allowBuilds` map in `pnpm-workspace.yaml` records that narrow
approval; all unreviewed dependency build scripts remain blocked by pnpm.

## Phase 0 results

The 2026-08-27 spike and the 2026-08-28 experimental language slice produced
the following evidence:

- Langium generated the disposable original probe, parsed it, resolved a
  cross-reference, and returned a source-ranged unresolved-reference
  diagnostic.
- The private language package parsed and lowered the original
  `hello-context.c4ml`, `hello-container.c4ml`, and
  `hello-static-zoom.c4ml`, `hello-dynamic.c4ml`, and
  `hello-deployment.c4ml` into compiler-owned model and view contracts. Its
  tests cover source ranges, unresolved references, missing and duplicate
  properties, the complete static ownership hierarchy, relationship protocols,
  type-specific view scopes, Dynamic ordering, Deployment placement and
  runtime relationships, Relationship references, formatting stability, and
  deterministic SVG through the shared compiler pipeline.
- The current browser check bundled the compiler core and experimental language
  package at 136,109 and 1,520,436 unminified bytes respectively, without
  Node.js polyfills. The increase reflects activated LSP completion services;
  this is feasibility evidence, not a production size budget.
- ELK.js returned finite, normalized, repeatable geometry for flat and compound
  graphs. Invalid engine-neutral input failed before ELK was invoked.
- resvg-js produced a visually inspected 640 by 360 PNG from an original local
  SVG. Controlled repeated input was byte-stable, scaling preserved dimensions,
  and external image resources were rejected.
- The compiler core, Langium services, and ELK adapter bundled successfully as
  browser-targeted ECMAScript modules without Node.js polyfills. Unminified
  in-memory probe bundle sizes were approximately 2.5 KB, 920 KB, and 3.3 MB
  respectively; production size and worker-loading strategy remain open.
- The complete current suite contained 112 distinct passing tests. Build, source/test
  type checking, browser bundling, and tests passed through `pnpm run check`.
- The installed development tree occupied approximately 113 MB on macOS arm64;
  individual package-store entries were approximately 7.7 MB for ELK.js, 5.4 MB
  for Langium, 3.4 MB for the resvg native binary, and 10 MB for esbuild.
- The production license inventory contained Apache-2.0, MIT, MPL-2.0, and
  `EPL-2.0 OR GPL-3.0-or-later`; no unknown license was reported.

ELK.js 0.12.0's published declaration files are not fully compatible with the
pinned TypeScript 6.0.3 toolchain: one generic declaration fails and its browser
`Worker` type is ambient. Phase 0 confines `skipLibCheck` and a local
CommonJS-constructor cast to the ELK adapter. Permanent adoption requires either
compatible upstream types or a reviewed adapter-local declaration boundary;
this workaround MUST NOT spread into the compiler core.

The complete build, browser-bundle check, source and test type checking, test
suite, and reference export were repeated successfully with TypeScript 6.0.3
before it became the pinned workspace compiler. The compiler and configuration
do not rely on TypeScript 7-only language or configuration features.

These results establish technical feasibility for the remaining candidates,
not their permanent acceptance. The complete product grammar, production
bundle strategy beyond the accepted desktop editor baseline, font policy, and
final layout/routing architecture remain open. Angular 22 and Monaco 0.56.0 are
accepted production dependencies behind the boundaries recorded above.

The candidate ELK.js adapter still passes its Node.js behavior tests and
browser-bundle check. Direct use of its current bundled CommonJS entry from
inside the Angular compiler worker failed at runtime while constructing the
bundle's internal worker (`_Worker is not a constructor`). The editor therefore
uses a deliberately limited local linear adapter. This does not reject
ELK.js, but permanent browser adoption now requires a tested browser entry or
worker factory that does not depend on that bundled constructor path.

The Phase 1 reference exporter now invokes the same candidate ELK.js and
resvg-js adapters through the C4ML-owned contracts. ELK output is normalized to
absolute geometry across nested compound nodes before later stages consume it.
The reference PNG explicitly uses locally available system fonts when no font
file is configured, so it is suitable for visual review but not a reproducible
golden. A future accepted font asset must be documented before deterministic
text-bearing PNG evidence can be claimed.

The complete local gate ran on macOS arm64 with Node.js 26.4.0. Node.js 24.15.0
is the declared minimum but still needs a clean CI or local run before that
baseline can be claimed as automatically validated.

## Asset status

Phase 0 contains no third-party fonts, icons, themes, sample architectures, or
other visual assets. All probe data and test fixtures must be original C4ML
material.
