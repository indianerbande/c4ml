# C4thedral 0.1.0-beta.1

Status: Public source beta

Date: 2026-09-02

The source tree is prepared for a later public source release with a reproducible
build guide, contribution and security policies, issue templates, a
least-privilege commit-pinned Linux source gate, scheduled dependency-update
pull requests, and an automated public-source hygiene check. Monaco's transitive
DOMPurify dependency is constrained to reviewed version 3.4.13; the production
audit currently reports no known vulnerabilities. Retained branch commits use
GitHub's private `noreply` address, and obsolete merged work branches have been
removed. The public repository was created from that clean history without the
superseded repositories' read-only pull-request refs. Anonymous HTTPS cloning,
the locked source build, and the complete source gate have passed from the
public repository. The source tag is `v0.1.0-beta.1`; no unsigned native artifact
is presented as a public release download.

This is the first release identity for the C4thedral desktop architecture
workbench. C4ML remains the name of its language, compiler, CLI, file format,
diagnostics, and technical protocol boundaries.

## Included

- native Electron workbench with empty startup, local files and projects,
  multi-document editing, save protection, and explicit local Git operations;
- all seven C4 view types through the shared portable compiler;
- deterministic SVG and native PNG output with controlled IBM Plex fonts;
- automatic layout plus reviewable placement and route controls;
- detachable projection-only preview with synchronized selection and zoom;
- graphical element creation and connection authoring, scope-guided Component
  and Code creation, Deployment topology, and ordered Dynamic interactions
  through source change previews and one-step undo;
- guided System Context and Container creation as a new document or a bounded,
  source-preserving extension of an existing valid document;
- semantic comparison, impact analysis, migration stories, graph queries,
  architecture policies, and attributed observation drift; and
- German and English workbench, handbook, wizard, menus, and dialogs.

## Native evidence

- macOS arm64: the exact `0.1.0-beta.1` package, release metadata and icon,
  smoke, detached preview, native PNG, ad-hoc deep signature, DMG verification,
  and ZIP integrity passed under Node.js 24.15.0;
- Windows x64: the exact beta candidate passes the complete source gate, native
  Squirrel build, artifact verification, packaged smoke, Squirrel
  install/remove/reinstall, and installed offline smoke with no system Node.js
  visible. Native Open, edit, Save As, full restart/reopen, SVG export, PNG
  export, and dirty-close cancellation passed in the installed application,
  and the saved project survived uninstall. Release signing remains; and
- Linux arm64: the exact DEB builds on Ubuntu with Node.js 24.15.0, passes
  metadata and sandbox-mode inspection, installs/removes/reinstalls through APT,
  and passes the installed offline smoke as a normal user. Visible open, edit,
  Save As, full restart/reopen, native SVG/PNG export, and read-only Source
  Control also passed. That run exposed and fixed a packaged SVG `blob:` handoff
  to Nautilus by routing desktop SVG saving through the validated native bridge;
- Linux x64: rewritten commit `c578b3b` passed the complete source gate with 562 tests,
  DEB inspection, APT install/remove/reinstall, two installed network-isolated
  smokes without a system Node.js, and the visible file/export, Source Control,
  dirty-close, and minimum-window-height round trips on Ubuntu 26.04.1. The
  amd64 DEB SHA-256 is
  `ce5282e014f595f19ea7a672fadec4f11aebc294088122ca030ae59f96b238f1`.
  Restricted user namespaces exposed an unpacked-smoke prerequisite; the
  release command now prepares only that disposable helper as
  `root:root`/`4755`, without disabling Chromium's sandbox.

This beta candidate is not yet a public signed release. Apple Developer ID
signing/notarization and Windows code signing are still required, and no host's
evidence substitutes for another operating system.
