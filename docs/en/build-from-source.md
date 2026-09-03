# Build C4thedral from source

[English](build-from-source.md) | [Deutsch](../de/build-from-source.md)

Status: Public source beta released from a clean GitHub history

Version: 0.1.0-beta.4

Source release: `v0.1.0-beta.4`

C4thedral can be built entirely from its public source after the locked
dependencies and Electron runtime have been downloaded. The installed desktop
application compiles C4ML locally and does not require a cloud account, Python,
system Node.js, or a compiler service.

## 1. Install the build tools

Install:

- Git;
- Node.js 24.15.0 or a newer 24.x release; and
- the native tools listed for your operating system in [the platform
  matrix](platforms.md).

Then enable the repository's pinned pnpm version:

```shell
corepack enable
corepack prepare pnpm@11.24.0 --activate
node --version
pnpm --version
```

The expected major versions are Node.js 24 and pnpm 11. Native packaging fails
early on a different Node.js major version.

## 2. Clone and verify the source

```shell
git clone https://github.com/indianerbande/c4ml.git
cd c4ml
pnpm install --frozen-lockfile
pnpm run check
```

`--frozen-lockfile` is intentional: a source build must use the dependency graph
reviewed for that commit instead of silently selecting newer packages.

## 3. Start the workbench

```shell
pnpm run desktop:start
```

The application starts with an empty workspace. Use **File → Open File** for a
single `.c4ml` document or **File → Open Folder** for a project. Executable
examples are available under `examples/draft`; the syntax is still explicitly
provisional.

## 4. Build a native package

Run the complete native gate on the operating system for which the package is
intended:

```shell
pnpm run release:native
```

Outputs are written below `build/desktop/`. macOS produces an application, DMG,
and ZIP; Windows produces a Squirrel Setup EXE; Debian or Ubuntu produces a DEB.
Linux packaged smoke may request `sudo` only to prepare the disposable unpacked
Chromium sandbox helper before launch.

Self-built macOS and Windows artifacts do not carry C4thedral's future public
publisher signature. Operating-system warnings for locally built or downloaded
unsigned artifacts are therefore expected. Never work around the Linux warning
with `--no-sandbox`.

## 5. Try the experimental CLI

```shell
pnpm run c4ml -- check examples/draft/hello-context.c4ml
pnpm run c4ml -- render examples/draft/hello-context.c4ml --output build/example
```

The CLI is useful but remains experimental and is not yet a separately
published package. See the [project README](../../README.md), [user guide](user-guide.md),
[Linux installation guide](install-linux.md), and [Windows installation
guide](install-windows.md) for current capabilities and platform details.

## Maintainer publication checklist

Before changing repository visibility or creating the first public source tag:

1. run `pnpm audit --prod`, `pnpm run check`, and `git diff --check`;
2. review every reachable branch, tag, Actions log, and Git commit for material
   that must not become public;
3. verify that published maintainer commits use the GitHub `noreply` address;
4. verify that historical pull-request refs cannot expose superseded commit
   metadata; GitHub's read-only `refs/pull/*` namespace requires a clean public
   repository or an accepted GitHub Support purge;
5. confirm the documented acceptance of any obsolete local-host evidence in
   published history;
6. verify that no obsolete merged work branches remain on the remote;
7. enable GitHub private vulnerability reporting and restore branch/ruleset
   protection after the visibility change;
8. verify a clone over the public HTTPS URL on a clean machine; and
9. create the source tag only from the reviewed `main` commit.
