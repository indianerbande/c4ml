# C4ML Dependency Record

Status: Accepted desktop application, editor, and automatic-layout stack with remaining candidates

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

**Status: Accepted for production automatic layout.**

- **Capability:** automatic layout with layered graphs, compound
  nodes, ports, and orthogonal edge routing.
- **Why external:** high-quality graph layout is a mature algorithmic domain;
  reimplementing the whole layered-layout engine would add risk without
  differentiating C4ML.
- **License:** `EPL-2.0 OR GPL-3.0-or-later`; C4ML uses the EPL-2.0 option and
  keeps the unmodified package separate.
- **Impact:** comparatively large JavaScript/GWT layout bundle. Node.js uses
  the bundled entry. The editor compiler worker loads the small API-only entry
  and delegates layout to the separately packaged 1.5 MB minified ELK worker.
- **Offline behavior:** layout runs locally after installation and requires no
  network access.
- **Boundary:** an engine-neutral `LayoutAdapter` contract owns C4ML input and
  output types. ELK identifiers, options, coordinates, and objects MUST NOT leak
  beyond the adapter.
- **Protecting evidence:** finite geometry, normalized output, deterministic
  repeated results, compound-node handling, and explicit failure for invalid
  adapter input. The Angular production build and browser session additionally
  verify the API-only entry, a real nested Web Worker, local offline loading,
  and unchanged worker/license packaging.

Redistribution of ELK.js must preserve its notices and satisfy EPL-2.0 source
availability requirements for the ELK.js program. C4ML MUST NOT modify or copy
ELK.js source into the repository.

Source: [ELK.js 0.12.0 README](https://github.com/kieler/elkjs/blob/0.12.0/README.md).

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

### IBM Plex 6.4.2 assets

**Status: accepted, implemented, automatically validated, and visually
validated as C4ML's controlled typography family.**

- **Capability:** a coherent Sans/Mono family for the desktop UI, source editor,
  standalone SVG, and deterministic PNG text.
- **Why external:** designing and maintaining a high-quality typeface with broad
  glyph coverage is specialist work outside C4ML's compiler and renderer.
- **License:** SIL Open Font License 1.1. The upstream `LICENSE.txt` is included
  unchanged. IBM's Reserved Font Name "Plex" is preserved because C4ML ships
  unmodified binaries.
- **Provenance:** exact files from official tag `v6.4.2`, commit
  `242c4cccd37e87985a5337815c99b960ef13c65c`, with SHA-256 values recorded in
  `packages/font-ibm-plex/README.md`.
- **Impact:** eleven selected files occupy 1,078,892 bytes in the source tree.
  The browser artifact contains only eight WOFF2 files totaling 469,600 bytes.
  Each standalone SVG embeds the three Sans faces it may use; Node PNG
  rendering loads three Sans TTF files. No IBM npm telemetry package or font
  CDN is included.
- **Offline behavior:** every font is local after checkout/install. SVG uses
  embedded WOFF2 data URLs; resvg receives TTF paths explicitly and keeps
  system-font discovery disabled.
- **Boundary:** `@c4ml/font-ibm-plex` owns binary assets and Node/browser asset
  loading. The renderer accepts validated generic embedded-font descriptors and
  PNG font paths. Fonts do not enter semantic model types or source grammar.
- **Protecting evidence:** asset headers, local browser URLs, hashes, packaged
  byte identity, unchanged OFL license, embedded SVG faces, rejection of
  external font URLs, disabled PNG system fonts, production build, and visual
  checks at multiple editor zoom levels.

Source: [IBM Plex v6.4.2](https://github.com/IBM/plex/tree/v6.4.2) and its
[OFL-1.1 license](https://github.com/IBM/plex/blob/v6.4.2/LICENSE.txt).

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
  214.91 KB initial total and emits Monaco as a 3.06 MB lazy runtime with a
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
  explicit revalidation on every upgrade. The same check protects the direct
  semantic-token feature import required by Monaco's selective runtime build.
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

## Accepted desktop application and packaging libraries

Electron is accepted as the desktop container for the Angular/Monaco editor.
It is an application adapter only: the portable compiler and browser worker do
not depend on Electron.

### Electron 44.0.0

- **Capability:** native macOS/Windows application lifecycle, Chromium renderer,
  isolated preload, native windows, menus, keyboard shortcuts, file dialogs,
  and IPC.
- **Why external:** maintaining a cross-platform native web-runtime container,
  OS integration, Chromium, and security updates is mature platform work far
  outside C4ML's architecture compiler.
- **License:** the npm package is MIT. Electron also bundles Chromium and other
  third-party software whose notices remain in the distributed framework.
- **Impact:** installation downloads a platform-specific Electron runtime and
  desktop artifacts contain that runtime, so packages are substantially larger
  than the Angular web assets alone. End users do not need a separate Node.js,
  browser, Python, or compiler service. On the validated macOS arm64 checkout,
  the installed workspace occupies approximately 839 MB, the unpacked app
  approximately 294 MB, the DMG 128 MB, and the ZIP 129 MB.
- **Offline behavior:** dependency installation needs registry/download access;
  the built application loads only packaged resources and works offline.
- **Boundary:** `apps/desktop` owns Electron main/preload behavior. The renderer
  sees only `@c4ml/desktop-contract`; C4ML language/compiler packages know
  nothing about Electron.
- **Protecting evidence:** web-preference and protocol tests, IPC request
  validators, a production boundary check, packaged-application smoke tests,
  local-only CSP inspection, denied navigation/permissions, and visual
  inspection of the packaged application.

Source: [Electron application distribution](https://www.electronjs.org/docs/latest/tutorial/application-distribution)
and [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security).

### Electron Forge 7.11.2 and Electron Fuses 2.1.3

- **Capability:** replaceable application packaging and platform makers;
  production Electron fuse configuration; DMG and ZIP creation on macOS; and a
  Squirrel Setup EXE maker on Windows.
- **Why external:** platform application assembly, installer formats, Electron
  binary mutation, and maker integration are established release engineering
  concerns rather than C4ML product semantics.
- **License:** Forge CLI, DMG/Squirrel/ZIP makers, the Forge fuses plugin, and
  `@electron/fuses` are MIT. `electron-squirrel-startup` 1.0.1 is Apache-2.0
  and its license is retained in the packaged notices.
- **Impact:** these are build-time dependencies. The Windows startup helper is
  bundled into the small main-process artifact; Forge and makers are not copied
  into application ASAR. The configured outputs are macOS `.app`, DMG, ZIP,
  and Windows Squirrel installer files.
- **Offline behavior:** packaging may need Electron release/checksum access
  until its build cache is complete. Resulting applications and installers
  require no runtime network service.
- **Boundary:** `forge.config.cjs` owns packager, maker, signing-hook, and fuse
  settings. A different packaging system can replace Forge without changing
  the desktop bridge, Angular renderer, or compiler.
- **Protecting evidence:** exact version/license checks, ASAR content review,
  all nine Electron 44 fuse values, strict packaged-app signature verification,
  packaged launch smoke, DMG verification, and ZIP integrity testing. A native
  Windows build/install test and release signatures remain required.

The Forge fuses plugin currently declares a peer range that excludes the newer
`@electron/fuses` 2.x metadata even though Electron 44 exposes a ninth V1 fuse.
The workspace records a narrow peer allowance for exactly 2.1.3; the production
check and packaged smoke protect the integration.

Sources: [Electron Forge Squirrel maker](https://www.electronforge.io/config/makers/squirrel.windows),
[Electron Forge DMG maker](https://www.electronforge.io/config/makers/dmg), and
[Electron code signing](https://www.electronjs.org/docs/latest/tutorial/code-signing).

### Native maker helpers and build runtime

- **Packages:** `@electron/node-gyp` 10.2.0-electron.2, `node-gyp` 12.3.0,
  `fs-xattr` 0.3.1, and `macos-alias` 0.2.12, all MIT.
- **Capability:** compile the native extended-attribute and alias helpers used
  by the macOS DMG maker against the pinned build runtime.
- **Why external:** native ABI builds, extended attributes, and Finder aliases
  are operating-system packaging mechanics.
- **Impact:** build-only dependencies; a macOS compiler toolchain is required
  when the native helpers are not already available for the active ABI. They
  are rebuilt before `desktop:make` and are excluded from the packaged app.
- **Offline behavior:** after dependency installation and header/toolchain
  availability, the rebuild and maker operate locally.
- **Boundary:** `apps/desktop/scripts/rebuild-maker-native.cjs` is used only by
  the maker lifecycle. No native helper enters runtime or compiler packages.
- **Protecting evidence:** the macOS make, DMG verification, packaged ASAR
  inventory, and dependency-license check.

Forge 7.11.2 transitively identifies Electron's `node-gyp` fork through a Git
reference. The workspace replaces only that exact transitive edge with the
published npm version `10.2.0-electron.2`, avoiding an unpinned Git install
while retaining the reviewed MIT Electron fork. Repository scripts run with
the pnpm-managed Node.js 24.19.0 runtime recorded in `package.json` and the
lockfile. This exact runtime avoids host-version-dependent packaging behavior;
it is build tooling, not a runtime requirement for installed C4ML.

Source: [pnpm managed runtime (`devEngines.runtime`)](https://pnpm.io/package_json#devenginesruntime).

## Experimental CLI application

`apps/cli` adds no external dependency. It depends only on the C4ML compiler and
language workspaces plus the accepted ELK.js adapter and resvg-js candidate
adapter. The app owns filesystem, process, argument, and exit-code behavior;
none of those Node.js concerns enter the portable compiler core. Its tests
protect that boundary through real local files, invocation from an unrelated
working directory, source validation, view selection, and SVG/PNG output.

SVG output embeds the accepted IBM Plex Sans WOFF2 faces. PNG rendering uses
the matching local TTF faces with system-font discovery disabled. Font loading
remains a Node frontend responsibility and does not enter the compiler core.

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
validation gate. Only the reviewed esbuild 0.28.2, electron-winstaller 5.4.4,
fs-xattr 0.3.1, and macos-alias 0.2.12 packages are permitted to execute
dependency build scripts. The version-specific `allowBuilds` map in
`pnpm-workspace.yaml` records those narrow approvals; all unreviewed dependency
build scripts remain blocked by pnpm.

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
  package at 139,434 and 1,563,719 unminified bytes respectively, without
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
- The complete current suite, including desktop contract and shell tests,
  passes through the build, type, browser, dependency, and test gates.
- The installed development tree occupied approximately 113 MB on macOS arm64;
  individual package-store entries were approximately 7.7 MB for ELK.js, 5.4 MB
  for Langium, 3.4 MB for the resvg native binary, and 10 MB for esbuild.
- The production license inventory contained Apache-2.0, MIT, MPL-2.0, and
  `EPL-2.0 OR GPL-3.0-or-later`; the separately packaged IBM assets carry their
  verified OFL-1.1 license. No unknown license was reported.

ELK.js 0.12.0's published declaration files are not fully compatible with the
pinned TypeScript 6.0.3 toolchain: one generic declaration fails and its browser
`Worker` type is ambient. Phase 0 confines `skipLibCheck` and a local
CommonJS-constructor cast and `skipLibCheck` are confined to the production ELK
adapter package as a reviewed declaration boundary. This workaround MUST NOT
spread into the compiler core.

The complete build, browser-bundle check, source and test type checking, test
suite, and reference export were repeated successfully with TypeScript 6.0.3
before it became the pinned workspace compiler. The compiler and configuration
do not rely on TypeScript 7-only language or configuration features.

These results establish technical feasibility for the remaining candidates,
not their permanent acceptance. The complete product grammar and final routing
architecture remain open. Angular 22, Monaco 0.56.0, Electron 44.0.0, Electron
Forge 7.11.2, ELK.js 0.12.0, and the controlled IBM Plex assets are accepted
production dependencies behind the boundaries recorded above.

Superseded evaluation note (2026-08-28): Direct use of ELK.js's bundled
CommonJS entry inside the Angular compiler worker failed while constructing the
bundle's internal worker (`_Worker is not a constructor`). The accepted
integration instead uses ELK's API-only entry with the published minified ELK
worker as a real nested browser Worker. The local linear adapter is no longer
the production preview path.

The Phase 1 reference exporter now invokes the accepted ELK.js and candidate
resvg-js adapters through the C4ML-owned contracts. ELK output is normalized to
absolute geometry across nested compound nodes before later stages consume it.
The reference SVG embeds IBM Plex Sans WOFF2 faces, and its PNG path explicitly
loads the matching TTF faces with system fonts disabled. The current artifact
has been visually inspected; promotion to a committed golden still requires
the golden-update procedure in `TESTING.md`.

The complete local gate and desktop packaging run on macOS arm64 use the exact
pnpm-managed Node.js 24.19.0 runtime. Node.js 24.15.0 remains the declared
minimum compatible workspace line, but 24.19.0 is the reproducible repository
script and packaging runtime.

## Asset status

C4ML includes only the documented IBM Plex font binaries as third-party visual
assets. It contains no third-party icons, themes, or sample architectures. All
probe data and test fixtures remain original C4ML material.
