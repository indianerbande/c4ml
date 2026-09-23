# C4ML Projects

[English](projects.md) | [Deutsch](../de/projects.md)

Status: Implemented complete version-one typed project-resource foundation

Date: 2026-08-31

A C4ML project is one architecture compilation assembled from one or more
source documents. The project is the compilation unit, a source file is an
editing unit, and a View is an output unit.

## From project to finished output

Describe an architecture once and generate diagrams for different audiences.
A business overview and technical detail Views reuse the same definitions of
names, responsibilities, and relationships.

**Project sources → shared model → selected View → SVG or PNG**

A *View* describes a diagram's question, scope, and arrangement. It references
the shared model. An exported image is a result, not a replacement for editable
project sources.

### 1. What goes where?

**Files → New project…** asks for a name and parent directory, then creates:

| Item | Purpose | Effect on output |
| --- | --- | --- |
| `c4ml.project.json` | Project identity and explicit source inventory. | Selects the files evaluated together. |
| `model/architecture.c4ml` | People, systems, and their parts. | Supplies diagram elements. |
| `relations/relationships.c4ml` | Directed relationships. | Supplies connections for compatible Views. |
| `views/views.c4ml` | Diagram type, scope, title, and optional layout. | Defines individually renderable diagrams. |
| `docs/` | Your explanations and decisions. | Text is not automatically included in SVG/PNG exports. |

Folders are an organizational convention, not a language requirement. A source
can contain model, relationships, and several Views. A View can reference
elements from several sources. Folder names do not automatically direct
graphical edits into those files; inspect the proposed source changes.

The manifest does not scan folders: a new `.c4ml` file joins the project only
when listed in `sources`. Moving a file requires updating that path. Edit the
manifest and resources outside the app's source editor when needed. Resources
such as a glossary use separate manifest fields, not `sources`.

### 2. One model, several questions: garden planning

Imagine a caretaker using a garden planning system, an API processing
observations, and a data store holding work plans:

- A **System Context View** answers who uses the system.
- A **Container View** shows how API and data store work together inside it.
- A **Deployment View** shows where instances run. This requires an explicit
  deployment model; a Container View does not create one automatically.

Changing the API's responsibility updates relevant Views when rendered again.
Hiding it in one View retains it in the shared model and other Views. Layout
changes placement, not architecture. Ten sources may supply one View, and one
source may supply many. A new project has **no exportable diagram yet**.

### 3. From the app to your first image

1. Choose **New project…**, name it, and select its parent directory. Three
   empty sources open.
2. Use **Add element…** to create a person and software system; review and apply
   the proposed source changes.
3. Choose **Create diagram** for a compatible View, such as the system context.
   Use **Connect** to add a relationship. **Diagrams** creates and selects more Views.
4. Check the preview and problems. Invalid edits can leave the last valid
   preview visible; export only after the current source compiles.
5. **Save All** persists all changed sources; **Save** affects the active source.
6. In **Output**, export the active diagram as scalable SVG or raster PNG
   (1x, 2x, or 3x desktop resolution).

The app evaluates all project sources in memory, including unsaved edits. The
CLI reads saved files, so save everything before switching to it. Exported
images do not automatically update: export again after changes and retain your
project sources for further editing.

### 4. Render one or all Views from the command line

Run the executable [Garden Pulse example](../../examples/projects/garden-pulse-multifile/c4ml.project.json)
from the repository root:

```sh
pnpm run c4ml -- check examples/projects/garden-pulse-multifile
pnpm run c4ml -- render examples/projects/garden-pulse-multifile --view garden-pulse-context --format svg,png --output build/project-guide/selected
pnpm run c4ml -- render examples/projects/garden-pulse-multifile --all --format svg,png --output build/project-guide/all
```

`--view` takes the stable View identity, not a filename. `--all` exports the
chosen formats for every declared View, not a combined document. This example
has one View, so each render command produces one SVG and one PNG. Substitute
your own project path and View identity as needed. These commands require the
source checkout; desktop installation does not automatically install a CLI.

### 5. What optional resources do today

| Resource | Available purpose | Limit |
| --- | --- | --- |
| Theme and Shapes | Choose diagram colors and supported shapes. | Do not change architecture or workbench preferences. |
| Policy and Observations | Check architecture and report confirmed differences. | Do not automatically correct the model. |
| Glossary | Record and validate terms and acronyms. | Does not generate a complete handbook. |
| Narratives | Register chapters in a validated format. | Arbitrary `docs/` files are not automatically included or exported. |
| Publication | Describe ordered Views, captions, and output profiles; validate View references. | Ordinary image export does not execute this as a publication job yet. |
| Assets | Inventory passive files with integrity and license information. | Does not automatically embed arbitrary files in diagrams. |

**There is no general project export producing a finished PDF, HTML, or Word
handbook from diagrams, glossary, and chapters today.** Use the exported images
and your text in a document tool. The separate offline HTML foundation for
migration reviews concerns architecture comparisons, not handbook export.

Start with model, relationships, and one View. Add optional resources when you
need their specific purpose. The reference below explains their file links.

## One-file projects

A normal `.c4ml` file remains the smallest complete project:

```text
garden-architecture/
└── architecture.c4ml
```

The CLI accepts either the source file or its directory when that directory
contains exactly one root-level `.c4ml` file:

```sh
c4ml check garden-architecture/architecture.c4ml
c4ml check garden-architecture
```

No manifest or namespace declaration is needed.

## Explicit multifile projects

Several source files require `c4ml.project.json`:

```text
garden-architecture/
├── c4ml.project.json
├── governance.c4ml-policy.json
├── evidence/
│   └── inventory.c4ml-observations.json
├── knowledge/
│   └── garden.c4ml-glossary.json
├── docs/
│   └── overview.c4ml-narrative.md
├── model/
│   └── systems.c4ml
├── relations/
│   └── relationships.c4ml
└── views/
    └── context.c4ml
```

The version-one manifest lists every architecture source explicitly:

```json
{
  "version": 1,
  "id": "garden-architecture",
  "name": "Garden Architecture",
  "description": "Architecture model and review views.",
  "policy": "governance.c4ml-policy.json",
  "observations": "evidence/inventory.c4ml-observations.json",
  "glossary": "knowledge/garden.c4ml-glossary.json",
  "narratives": ["docs/overview.c4ml-narrative.md"],
  "publication": "publication/review.c4ml-publication.json",
  "theme": "presentation/garden.c4ml-theme.json",
  "shapes": "presentation/garden.c4ml-shapes.json",
  "assets": "assets/garden.c4ml-assets.json",
  "sources": [
    "model/systems.c4ml",
    "relations/relationships.c4ml",
    "views/context.c4ml"
  ]
}
```

Source paths are relative to the project directory and use `/`. Version one
does not support globs, parent-directory traversal, absolute paths, URLs, or
remote includes.

The optional `policy` field selects exactly one local version-one JSON policy
resource. Its path follows the same containment rules as source paths and must
end in `.c4ml-policy.json`. It is a separate typed project resource, not a
`.c4ml` source document:

```json
{
  "version": 1,
  "id": "garden-policies",
  "policies": [
    {
      "id": "garden.owner",
      "title": "Garden Pulse has an owner",
      "severity": "error",
      "kind": "required-metadata",
      "subjectKeys": ["element:garden-pulse"],
      "requirements": [{ "kind": "metadata", "key": "owner" }]
    }
  ]
}
```

Policy identities refer to exact qualified architecture identities. The other
implemented rule families cover forbidden dependencies, required protocols,
ownership, allowed direction, and deployment consistency. Malformed, unknown,
or inapplicable rules fail explicitly rather than being ignored.

The optional `observations` field selects exactly one bounded local version-one
JSON observation set whose path ends in `.c4ml-observations.json`. Each entry
names a qualified architecture identity, adapter, timestamp with timezone,
confirmation state, and either a presence or selected-field claim:

```json
{
  "version": 1,
  "id": "garden-local-inventory",
  "observations": [{
    "id": "garden-runtime-name",
    "subjectKey": "element:garden-pulse",
    "adapterId": "local-inventory/v1",
    "observedAt": "2026-08-31T08:15:00Z",
    "confirmation": "confirmed",
    "claim": { "kind": "field", "field": "name", "value": "Garden Runtime" }
  }]
}
```

Only a confirmed mismatch becomes drift. `unreviewed` and `disputed`
observations remain uncertainty. C4ML never copies the observed value into the
authored model.

## Source fragments

Every source starts with the normal language marker:

```c4ml
c4ml draft-1
```

It may then contain the top-level blocks relevant to that file. For example, a
model document may end after its model block, while a View document can refer
to elements and relationships declared elsewhere in the same project.

Files are merged semantically, not pasted together as text. Their order does
not control meaning or layout. Stable identifiers remain valid when a
declaration moves to another file. A duplicate declaration is an error; a later
file never silently replaces an earlier one.

## CLI use

The CLI accepts the directory or manifest path:

```sh
c4ml check garden-architecture
c4ml check garden-architecture/c4ml.project.json
c4ml analyze garden-architecture --fail-on error
c4ml render garden-architecture --view garden-context --format svg,png
```

The repository contains an executable original example at
`examples/projects/garden-pulse-multifile`.

## Desktop editor

Use **File → Open Project…**, `Cmd/Ctrl+Alt+O`, the Files sidebar, or the
command palette to select a project directory. The directory must either hold
one root-level `.c4ml` file or contain `c4ml.project.json`.

The Files area shows the exact source set selected by the manifest. Every
source has its own buffer, tab, native file handle, and dirty marker. The
compiler and completion worker see the entire in-memory project, so references
continue to work before every changed file has been saved. Selecting a problem
or diagram object declared in another file opens its source tab and reveals the
owning range.

**Save** and **Save As** affect the active source tab. **Save All** processes
every dirty source in manifest order through the same native file boundary.
Successful files remain saved if a later write fails or is canceled; every
remaining file stays visibly dirty. Closing a project with any dirty source
still triggers the native unsaved-change guard. Each source tab also keeps its
own Monaco undo history, cursor, and scroll position while the project remains
open.

The desktop loads the optional policy with the project and shows violations in
**Output → Architecture findings**. Selecting a finding navigates to the
affected architecture declaration. The policy resource is read-only to this
first editor slice: it is not opened as a Monaco tab and Save/Save All do not
rewrite it.

The optional observation set follows the same read-only desktop boundary.
Confirmed drift and uncertainty appear in **Output → Architecture findings**;
the source, model, diagrams, and project files are not reconciled automatically.

The optional `glossary` field selects one local version-one JSON resource whose
path ends in `.c4ml-glossary.json`. It defines deterministic term and acronym
entries with explanations, acronym expansions, and optional aliases. Terms and
aliases are unique without case distinctions and can be resolved through the
portable contract. The glossary participates in project revisions but is not
architecture source and does not change compilation or diagrams.

The optional `narratives` list selects one or more local
`.c4ml-narrative.md` chapters. Each begins with the fixed version, identity, and
title header and contains passive Markdown with local links only. C4ML rejects
raw HTML, embedded images, remote links, traversal, and duplicate identities.
Narratives are revisioned project context, not architecture source or diagram
content.

The optional `publication` field selects one local
`.c4ml-publication.json` resource. It preserves ordered View selection and
captions plus deterministic SVG/PNG profiles with explicit scale and background
mode. CLI and worker reject references to Views not present in the compiled
project. Publication settings do not change source, architecture, or layout.
Ordinary image export does not execute these settings as a publication job yet.

The optional `theme` field selects one local `.c4ml-theme.json` resource. It
chooses a built-in semantic diagram preset and may deeply override canvas,
element, boundary, and route colors. The same validated selection drives CLI
and desktop-worker rendering. It does not affect architecture semantics or the
workbench's installation-local appearance.

The optional `shapes` field selects one local `.c4ml-shapes.json` catalogue of
restricted normalized vector primitives and explicit element assignments. It
uses the same safe shape validator as the renderer and cannot contain SVG,
scripts, CSS, images, fonts, filters, or network references.

The optional `assets` field selects one `.c4ml-assets.json` manifest for passive
UTF-8 text, Markdown, and JSON files. Each entry records purpose, media type,
SHA-256, SPDX license, and optional attribution. Local and Git loaders verify
path containment, integrity, and JSON syntax before content enters the bounded
project transport. Active and binary formats are excluded from version one.

## Project-resource boundary

The project format is intentionally ready for separately typed resources.
Architecture source documents plus local architecture-policy,
architecture-observation, glossary, narrative, publication, theme, shape, and
licensed passive-asset resources have version-one contracts today. Architecture
baselines and external scanner adapters remain separate future concerns.

Any later resource requires an independent contract. A publication profile must
not change architecture semantics, and local workbench preferences remain
outside the project.
