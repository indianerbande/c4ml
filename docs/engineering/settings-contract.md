# C4thedral Workbench Settings

Status: Implemented, automatically and visually validated foundation

Date: 2026-08-29

This document defines settings for the local C4thedral workbench. It deliberately
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
| Appearance | Local workbench presentation | interface language, color scheme, color family, interface font size |
| Source editor | C4ML authoring readability | syntax colors, font family, ligatures, font size |

Likely later categories include Files, Diagram preview, Export, Accessibility,
Keyboard, and Updates. These names are planning placeholders, not implemented
features or accepted settings.

## Initial settings contract

| Stable field | Values | Default | Scope |
| --- | --- | --- | --- |
| `uiLanguage` | `en`, `de` | `en` | C4thedral workbench and native application copy |
| `colorScheme` | `system`, `light`, `dark` | `system` | Angular workbench and Monaco theme |
| `colorPalette` | `blue`, `gray`, `yellow`, `green`, `violet`, `red`, `orange`, `turquoise` | `blue` | Angular workbench and Monaco theme |
| `interfaceFontSize` | 9–16 px in 0.5 px steps | 13 px | C4thedral workbench interface text |
| `syntaxTheme` | `balanced`, `minimal`, `vivid`, `high-contrast`, `color-safe` | `balanced` | Monaco source syntax only |
| `editorFontFamily` | packaged IBM Plex Mono, Fira Code, Hack, Source Code Pro, Intel One Mono, Inconsolata, Cascadia Code; or `system-monospace` | `ibm-plex-mono` | Monaco source text only |
| `editorFontLigatures` | `true`, `false` | `true` | Monaco and the source-font sample only |
| `editorFontSize` | 11–24 px in 0.5 px steps | 15 px | Monaco source text only |

IBM Plex Sans remains the controlled interface and diagram family. The seven
packaged monospace families and the optional system monospace stack are confined
to the local source editor. Diagram labels, layout, text measurement, SVG
embedding, and PNG rendering continue to use the controlled IBM Plex Sans
faces. Packaged editor fonts load locally and trigger a Monaco font
remeasurement before their final metrics are used.

Programming ligatures are enabled by default and can be disabled independently
of the selected family. The effective OpenType features are family-aware:
standard `liga`/`calt` behavior is used normally, Intel One Mono additionally
uses `ss01`, and Inconsolata additionally uses `dlig`. Ligatures only alter
glyph composition; stored source characters, cursor positions, diagnostics,
compiler input, and exported diagrams remain unchanged.

The interface language changes the workbench, accessibility labels, command
catalogue, and C4thedral-owned native menu and dialog copy. It does not translate
names or descriptions written by an author, `.c4ml` source, compiler diagnostics,
diagram labels, SVG, or PNG. English is the initial and fallback language;
German can be selected without restarting the application.

Color scheme and color family are orthogonal. `light` and `dark` select
brightness; the eight families select the quiet accent and related surfaces.
This yields sixteen concrete visual combinations. `system` follows the current
operating-system brightness and uses the selected family for whichever variant
is active. Neither setting changes diagram colors, source, SVG, or PNG.

Syntax colors form a second, independent dimension. `balanced` is the quiet
default, `minimal` relies mainly on restrained tone plus weight and italics,
`vivid` separates semantic roles more strongly, `high-contrast` adds redundant
style cues, and `color-safe` avoids red-versus-green meaning. The workbench
family contributes the declaration accent, cursor, selection, and focus color;
property, value, identifier/reference, string, number, comment, operator, and
structural-keyword meanings remain stable within the selected syntax preset.
All five presets are defined by a C4ML-owned, testable contract. Monaco is only
the rendering adapter for that contract.

## Behavior

- Changes apply immediately and are stored locally for the installation.
- Language changes also update the document `lang` attribute and the native
  application controls through the validated desktop bridge.
- Interface font-size changes apply through one root typography token. They
  scale C4thedral-owned workbench text but not Monaco source text or diagram output.
- `system` follows operating-system color changes while the application runs.
- Color-family changes apply to the workbench and Monaco together without
  changing the active light/dark choice.
- Syntax-theme changes apply immediately without changing the workbench family,
  source content, diagnostics, or diagram output.
- Reset restores the complete version-one default record.
- Unsupported versions, malformed values, and unavailable renderer storage fall
  back safely without blocking the editor.
- The settings dialog is available from the toolbar and the native
  `Cmd/Ctrl+,` application menu shortcut.
- Escape and an explicit close action dismiss the dialog. Keyboard focus stays
  inside the modal while it is open and returns to the toolbar action after it
  closes.

## Persistence and evolution

The current record is JSON stored under `c4ml.workbench.preferences.v1`. It is
validated at the application boundary and contains `version: 2`. Version-one
records are migrated once: former untouched 10/12.5 px font defaults become
13/15 px, while other explicitly selected sizes are retained. Unknown fields
are discarded. A future incompatible schema MUST use an explicit migration or
a new versioned storage key; components must not parse storage directly.

Settings that need workspace, project, document, or view scope require a
separate design before implementation. They must not be smuggled into this
installation-local record. Secrets and credentials must never be stored in this
plain local preference record.

## Component pattern

The preferences service owns validation, persistence, system-theme observation,
and reactive values. The localization service owns the complete English/German
workbench catalogues and interpolation. The settings panel owns presentation
and category navigation. Consumers receive only the values they need: the
Angular root gets interface language, effective workbench scheme, and color
family, while the Monaco adapter gets the effective scheme, color family,
syntax theme, and source font options. The Electron
main process has a separate, small native-control catalogue selected through a
validated language-only IPC message. Compiler, language, layout, scene, and
renderer packages do not depend on this contract.
