# C4ML Workbench Settings

Status: Implemented, automatically and visually validated foundation

Date: 2026-08-28

This document defines settings for the local C4ML workbench. It deliberately
separates application preferences from architecture content and diagram
presentation. A workbench preference MUST NOT modify `.c4ml` source, make a
document dirty, or change deterministic SVG/PNG output.

## Information architecture

Settings use a category list and one focused content region. Each setting has a
stable identifier, one owner, a bounded value type, a default, and an explicit
scope. New settings extend the category registry instead of adding unrelated
controls to the application toolbar.

The first categories are:

| Category | Purpose | Implemented settings |
| --- | --- | --- |
| Appearance | Local workbench presentation | color scheme |
| Source editor | C4ML authoring readability | font family, font size |

Likely later categories include Files, Diagram preview, Export, Accessibility,
Keyboard, and Updates. These names are planning placeholders, not implemented
features or accepted settings.

## Initial settings contract

| Stable field | Values | Default | Scope |
| --- | --- | --- | --- |
| `colorScheme` | `system`, `light`, `dark` | `system` | Angular workbench and Monaco theme |
| `editorFontFamily` | `ibm-plex-mono`, `system-monospace` | `ibm-plex-mono` | Monaco source text only |
| `editorFontSize` | 11–24 px in 0.5 px steps | 12.5 px | Monaco source text only |

IBM Plex Sans remains the controlled interface and diagram family. The optional
system monospace stack is confined to the local source editor. Diagram labels,
layout, text measurement, SVG embedding, and PNG rendering continue to use the
controlled project fonts.

## Behavior

- Changes apply immediately and are stored locally for the installation.
- `system` follows operating-system color changes while the application runs.
- Reset restores the complete version-one default record.
- Unsupported versions, malformed values, and unavailable browser storage fall
  back safely without blocking the editor.
- The settings dialog is available from the toolbar and the native
  `Cmd/Ctrl+,` application menu shortcut.
- Escape and an explicit close action dismiss the dialog. Keyboard focus stays
  inside the modal while it is open and returns to the toolbar action after it
  closes.

## Persistence and evolution

The current record is JSON stored under `c4ml.workbench.preferences.v1`. It is
validated at the application boundary and contains `version: 1`. Unknown fields
are discarded. A future incompatible schema MUST use an explicit migration or a
new versioned storage key; components must not parse storage directly.

Settings that need workspace, project, document, or view scope require a
separate design before implementation. They must not be smuggled into this
installation-local record. Secrets and credentials must never be stored in this
plain local preference record.

## Component pattern

The preferences service owns validation, persistence, system-theme observation,
and reactive values. The settings panel owns presentation and category
navigation. Consumers receive only the values they need: the Angular root gets
the effective workbench scheme, while the Monaco adapter gets the effective
scheme and source font options. Compiler, language, layout, scene, and renderer
packages do not depend on this contract.
