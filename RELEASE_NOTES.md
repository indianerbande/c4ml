# C4thedral 0.1.0-beta.1

Status: Internal beta candidate

Date: 2026-08-31

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
- Windows x64: an earlier development build ran successfully, but the exact
  beta candidate still requires the current native gate and Squirrel round
  trip; and
- Linux: native package, portable ZIP, and runtime round trip remain pending.

This beta candidate is not yet a public signed release. Apple Developer ID
signing/notarization and Windows code signing are still required, and no host's
evidence substitutes for another operating system.
