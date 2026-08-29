# C4ML Projects

Status: Implemented architecture-source foundation

Date: 2026-08-29

A C4ML project is one architecture compilation assembled from one or more
source documents. The project is the compilation unit, a source file is an
editing unit, and a View is an output unit.

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

**Save** and **Save As** currently affect the active source tab. Closing a
project with any dirty source still triggers the native unsaved-change guard.
An explicit Save All command and independent Monaco undo/cursor history per
source are planned editor refinements.

## Planned project resources

The project format is intentionally ready for separately typed resources, but
only architecture source documents are executable today. Planned resources
include:

- glossaries for terms and acronyms;
- Markdown-backed narrative sections;
- deterministic architecture policies;
- publication and print profiles;
- themes, safe custom shapes, and licensed local assets; and
- architecture baselines and attributed external evidence.

These resources will receive independent contracts. A publication profile must
not change architecture semantics, and local workbench preferences remain
outside the project.
