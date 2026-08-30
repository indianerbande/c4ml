# C4ML desktop shell

This private Electron application packages the Angular/Monaco editor as a
local desktop workbench. It is an application adapter, not a second compiler:
all language processing, C4 semantics, layout, routing, and rendering continue
to run through the shared runtime-portable compiler worker.

The shell currently provides:

- a sandboxed Electron renderer with context isolation and Node integration
  disabled;
- a small typed preload bridge for Open, Save, Save As, native PNG export,
  explicit local Git status/stage/unstage/commit/push operations, menu commands,
  document state, and validated English/German UI-language selection;
- an optional second preview window with its own projection-only preload and no
  document, source, compiler, save, export, filesystem, or Node authority;
- full-size, detach, synchronized selection/zoom/Route-overlay, safe window
  bounds, and redock behavior owned by the authoritative workbench;
- opaque document handles, so renderer code never receives filesystem paths;
- project loading of one optional bounded local `.c4ml-policy.json` resource,
  and one optional bounded local `.c4ml-observations.json` resource,
  transported through the typed bridge for worker-owned analysis without
  exposing native paths;
- project loading and typed transport of one validated local
  `.c4ml-glossary.json` resource as non-source content;
- bounded transport of validated local `.c4ml-narrative.md` chapters as passive
  non-source project context;
- one validated `.c4ml-publication.json` resource whose View references are
  checked by the compiler worker;
- one validated project `.c4ml-theme.json` selection applied by the worker's
  shared semantic scene resolver;
- one bounded safe `.c4ml-shapes.json` catalogue applied through shared diagram
  preparation without filesystem authority;
- bounded shell-free Git subprocesses in the main/project-node boundary, with
  repository-relative change paths and no checkout, discard, pull, fetch, or
  history-rewrite operation;
- local-only editor assets served through the owned `c4ml://app` protocol;
- native menus, shortcuts, dialogs, title updates, and unsaved-close
  protection, with C4ML-owned copy synchronized to the workbench language;
- local 1x/2x/3x rasterization of canonical SVG through the packaged resvg-js
  native adapter, controlled IBM Plex Sans TTF files, and no system fonts;
- packaged application resources in ASAR with integrity-oriented Electron
  fuses; and
- macOS app/DMG/ZIP makers plus a configured Windows Squirrel maker.

From the repository root:

```shell
pnpm run desktop:start
pnpm run desktop:smoke
pnpm run desktop:package
pnpm run desktop:make
```

Generated files are ignored under `build/desktop/`. A local macOS make produces
`C4ML.app`, `C4ML.dmg`, and a ZIP archive. The current build uses the default
Electron icon and version `0.0.0`; macOS artifacts are ad-hoc signed for local
testing, not Developer ID signed or notarized. Windows code signing and a real
Windows installer run remain release work.
