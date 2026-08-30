# C4ML Projects

Status: Implemented architecture-source, local-policy, and local-observation foundation

Date: 2026-08-31

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
├── governance.c4ml-policy.json
├── evidence/
│   └── inventory.c4ml-observations.json
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

## Planned project resources

The project format is intentionally ready for separately typed resources.
Architecture source documents plus one local architecture-policy and one local
architecture-observation resource are executable today. Further planned
resources include:

- glossaries for terms and acronyms;
- Markdown-backed narrative sections;
- publication and print profiles;
- themes, safe custom shapes, and licensed local assets; and
- architecture baselines and external scanner adapters.

These resources will receive independent contracts. A publication profile must
not change architecture semantics, and local workbench preferences remain
outside the project.
