# C4ML desktop shell

This private Electron application packages the Angular/Monaco editor as a
local desktop workbench. It is an application adapter, not a second compiler:
all language processing, C4 semantics, layout, routing, and rendering continue
to run through the shared browser-compatible compiler worker.

The shell currently provides:

- a sandboxed Electron renderer with context isolation and Node integration
  disabled;
- a small typed preload bridge for Open, Save, Save As, menu commands, and
  document state;
- opaque document handles, so renderer code never receives filesystem paths;
- local-only editor assets served through the owned `c4ml://app` protocol;
- native menus, shortcuts, dialogs, title updates, and unsaved-close
  protection;
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
