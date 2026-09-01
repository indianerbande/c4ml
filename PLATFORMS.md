# C4thedral desktop platform builds

Status: Accepted build contract; current macOS arm64 package, smoke, DMG, and
ZIP validated under Node.js 24.15.0; current Windows and Linux native evidence
pending

Date: 2026-08-31

This document separates the contributor toolchain from the runtime delivered
to users and records the host-specific build and verification paths for the
C4thedral desktop application.

## Shared build contract

- Build on the target operating system. Electron Forge packaging is
  host-native; C4thedral does not claim cross-compilation between macOS, Windows,
  and Linux.
- Use pnpm 11.24.0 and Node.js 24.15.0 or a newer 24.x release. Node.js 24.15.0
  is the cross-platform reference because it is both the Angular 22 minimum in
  the accepted 24.x line and available as an enterprise-managed distribution.
  pnpm warns rather than downloading a different Node.js runtime. Source checks
  currently pass under Node.js 26, but Electron Forge 7.11.2 packaging is
  deliberately guarded to Node.js 24.x after native packaging under Node.js 26
  proved unreliable.
- `pnpm run desktop:start` is a development launch and does not create a
  distributable package, so it may use the currently tested Node.js 26 line.
  On macOS it prepares a cached, ad-hoc-signed `C4thedral.app` development wrapper
  around the pinned local Electron runtime so the operating system consistently
  presents the application as C4thedral. The Node.js 24.x guard applies to
  `desktop:package`, `desktop:smoke`, and `desktop:make`.
- Run `pnpm install` from the repository root. Dependency and Electron binary
  acquisition may require an organization-local registry, mirror, or populated
  cache. Electron archive validation uses the checksum catalogue shipped in the
  pinned Electron package and therefore does not require a second checksum
  request to GitHub. Packaging does not run a second production dependency
  installation because the desktop has no copied runtime dependencies and
  excludes `node_modules`. The installed C4thedral application itself requires no
  Node.js installation and no runtime network service.
- Run `pnpm run release:native` on every native release host. It executes the
  complete source gate, packaged smoke, configured makers, and host-specific
  artifact verification. The final step writes hashes and sizes to
  `build/desktop/release-evidence/<platform>-<architecture>.json`.
- Git is optional for editing and rendering. The Source Control area requires a
  locally installed `git` executable on every operating system.

The repository pins `webpack` 5.109.2, `minimizer-webpack-plugin` 5.7.0, and
`terser` 5.51.1 because these are the newest versions currently admitted by the
tested repository firewall. They are build-only transitive dependencies and do
not enter the installed application runtime.

The Windows MSI installers for different Node.js major versions replace the
same system installation. They are therefore not the right mechanism for a
side-by-side build runtime. Extract the official Node.js 24.15.0 ZIP into a
user-writable tools directory and invoke its `node.exe` explicitly. If pnpm is
already installed below `C:\Anwendungen\npm`, for example:

```powershell
$Node24 = "C:\Tools\node-v24.15.0-win-x64\node.exe"
& $Node24 "C:\Anwendungen\npm\node_modules\pnpm\bin\pnpm.cjs" install
& $Node24 "C:\Anwendungen\npm\node_modules\pnpm\bin\pnpm.cjs" run check
& $Node24 "C:\Anwendungen\npm\node_modules\pnpm\bin\pnpm.cjs" run desktop:make
```

The equivalent macOS/Linux approach is to put a Node.js 24 binary first on
`PATH` for the build shell. No global installation or removal of Node.js 26 is
required.

Native maker helpers MUST be installed or rebuilt with the same Node.js 24
runtime used for `desktop:make`. Reusing a `node_modules` tree whose optional
native helpers were compiled under Node.js 26 can produce an ABI mismatch even
though the application package itself builds. A clean release checkout MUST
therefore run `pnpm install --frozen-lockfile` under Node.js 24 before the
release gate.

## Platform matrix

| Host | Packaged application | `desktop:make` output | Host-specific requirements |
| --- | --- | --- | --- |
| macOS | `.app` | DMG and ZIP | Electron 44 requires macOS 13 or newer. DMG creation may require Xcode Command Line Tools for its optional native helpers. Development artifacts are ad-hoc signed; releases require Developer ID signing and notarization. |
| Windows | application directory with `C4thedral.exe` | Squirrel Setup EXE | Build from native PowerShell or Command Prompt, not WSL. Releases require Windows code signing. C4thedral's first native validation target is Windows x64. |
| Linux | application directory with `C4thedral` | portable ZIP | The current resvg adapter targets GNU/glibc Linux on x64 or arm64. The machine needs the ordinary system libraries required by Electron/Chromium. A distro-specific DEB, RPM, Flatpak, or Snap is not yet part of the accepted distribution contract. |

## Current native evidence

| Host | Runtime | Result | Remaining release work |
| --- | --- | --- | --- |
| macOS 15 arm64 | Node.js 24.15.0, pnpm 11.24.0 | The `0.1.0-beta.1` `.app` packaged smoke passed; its name, version, original icon, ad-hoc deep signature, DMG checksum, and ZIP integrity passed on 2026-08-31. | Developer ID signing and notarization before public distribution. |
| Windows x64 | Node.js 24.x | An earlier development checkout installed, built, and ran on a standalone Windows machine. | Run the current branch's `release:native` gate, verify Squirrel install/uninstall and no-system-Node runtime, then repeat on the enterprise-managed machine. |
| Linux | Node.js 24.x | No native evidence yet. | Run the current branch's `release:native` gate and the manual file/export/offline round trip on a supported glibc host. |

The portable Linux ZIP is deliberate: the existing Forge ZIP maker has no
additional platform build dependency, while DEB, RPM, Flatpak, and Snap makers
would add format-specific packages and host tools. A distro-native installer
can be accepted later without changing the Electron application or compiler.

## Runtime differences owned by C4thedral

- Closing all windows quits the application on Windows and Linux. On macOS the
  application remains active and recreates a window when activated.
- Windows receives an application user-model identifier and Squirrel startup
  handling. Those paths are inactive on macOS and Linux.
- macOS uses Command-oriented menu shortcuts; Windows and Linux use Control.
  Monaco suggestions use `Cmd+I` on macOS and `Ctrl+Space` elsewhere.
- Project manifests always use normalized forward-slash relative URIs. Native
  filesystem paths remain inside the Node.js desktop adapter.
- PNG export selects exactly one native resvg binary for the current supported
  platform and architecture. Unsupported or obsolete 32-bit targets fail
  explicitly rather than falling back silently.

## Native verification

Run this sequence on each target host after a clean checkout:

```shell
node --version
pnpm --version
pnpm install
pnpm exec node --version
pnpm run check
pnpm run desktop:smoke
pnpm run desktop:make
pnpm run check:native-release
```

`pnpm run release:native` is the equivalent single release-host command after
the Node-24 `pnpm install --frozen-lockfile` step.

Then inspect the generated distributable on a machine without a system Node.js
installation:

1. install or unpack C4thedral;
2. launch the application;
3. open, edit, save, close, and reopen a `.c4ml` file;
4. export SVG and PNG;
5. exercise Source Control when Git is installed;
6. confirm that the application works without network access; and
7. uninstall or remove the application without leaving project data behind.

Artifact creation on one operating system is evidence only for that operating
system. macOS validation cannot substitute for a native Windows or Linux run.

## Upstream references

- [Electron installation, platforms, mirrors, and caches](https://www.electronjs.org/docs/latest/tutorial/installation)
- [Electron platform-specific window lifecycle](https://www.electronjs.org/docs/latest/tutorial/tutorial-first-app)
- [Electron Forge build lifecycle and native-host recommendation](https://www.electronforge.io/core-concepts/build-lifecycle)
- [Electron Forge makers](https://www.electronforge.io/config/makers)
- [Electron Forge ZIP maker](https://www.electronforge.io/config/makers/zip)
