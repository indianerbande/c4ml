# C4ML-Projekte

[English](../en/projects.md) | [Deutsch](projects.md)

Status: Vollständige typisierte Projektressourcen-Grundlage Version 1

Datum: 2026-08-31

Ein C4ML-Projekt ist eine Architektur-Kompilierung aus einem oder mehreren
Quelldokumenten. Das Projekt ist die Kompilationseinheit, eine Quelldatei die
Bearbeitungseinheit und eine View die Ausgabeeinheit.

## Ein-Datei-Projekte

Eine normale `.c4ml`-Datei bleibt das kleinste vollständige Projekt:

```text
garden-architecture/
└── architecture.c4ml
```

Die CLI akzeptiert die Datei oder ihr Verzeichnis, sofern darin genau eine
`.c4ml`-Datei auf oberster Ebene liegt:

```sh
c4ml check garden-architecture/architecture.c4ml
c4ml check garden-architecture
```

Manifest und Namensraumdeklaration sind nicht nötig.

## Ausdrückliche Mehrdatei-Projekte

Mehrere Quelldateien benötigen `c4ml.project.json`:

```text
garden-architecture/
├── c4ml.project.json
├── governance.c4ml-policy.json
├── evidence/inventory.c4ml-observations.json
├── knowledge/garden.c4ml-glossary.json
├── docs/overview.c4ml-narrative.md
├── model/systems.c4ml
├── relations/relationships.c4ml
└── views/context.c4ml
```

Das Manifest Version 1 listet jede Architekturquelle ausdrücklich auf:

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

Quellpfade sind relativ zum Projektverzeichnis und verwenden `/`. Version 1
unterstützt keine Globs, übergeordneten Verzeichnisse, absoluten Pfade, URLs
oder entfernten Includes.

Optionale typisierte Ressourcen:

- `policy` wählt genau eine lokale `.c4ml-policy.json` mit Regeln für verbotene
  Abhängigkeiten, Protokolle, Besitz, Richtung, Deployment-Konsistenz und
  Metadaten. Ungültige oder nicht anwendbare Regeln scheitern sichtbar.
- `observations` wählt genau eine `.c4ml-observations.json`. Nur bestätigte
  Abweichungen werden zu Drift; `unreviewed` und `disputed` bleiben Unsicherheit.
  Beobachtungen überschreiben niemals den verfassten Quelltext.
- `glossary` wählt ein `.c4ml-glossary.json` mit eindeutigen Begriffen,
  Abkürzungen, Erklärungen, Auflösungen und Aliasen.
- `narratives` bindet sichere lokale `.c4ml-narrative.md`-Kapitel ohne HTML,
  Bilder, externe Links oder Pfadüberschreitungen ein.
- `publication` bestimmt View-Reihenfolge, Bildunterschriften und
  deterministische SVG-/PNG-Profile.
- `theme` wählt ein `.c4ml-theme.json` mit semantischem Preset und sicheren
  Farbwerten; es verändert weder Architektur noch Workbench-Erscheinung.
- `shapes` wählt eingeschränkte normalisierte Vektorprimitive ohne SVG,
  Skripte, CSS, Bilder, Schriften, Filter oder Netzwerkverweise.
- `assets` bindet passive UTF-8-Text-, Markdown- und JSON-Dateien mit Zweck,
  Medientyp, SHA-256, SPDX-Lizenz und optionaler Attribution ein. Pfad,
  Integrität und JSON-Syntax werden geprüft; aktive und binäre Formate sind
  ausgeschlossen.

Ressourcenpfade folgen denselben Begrenzungsregeln wie Quellpfade. Ressourcen
sind keine `.c4ml`-Quelldokumente und dürfen die Architekturbedeutung nicht
heimlich verändern.

Ein Richtlinienbeispiel:

```json
{
  "version": 1,
  "id": "garden-policies",
  "policies": [{
    "id": "garden.owner",
    "title": "Garden Pulse has an owner",
    "severity": "error",
    "kind": "required-metadata",
    "subjectKeys": ["element:garden-pulse"],
    "requirements": [{ "kind": "metadata", "key": "owner" }]
  }]
}
```

Eine Beobachtung benennt qualifizierte Identität, Adapter, Zeitpunkt mit
Zeitzone, Bestätigungszustand und Aussage:

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

## Quellfragmente

Jede Quelle beginnt mit der normalen Sprachmarkierung:

```c4ml
c4ml draft-1
```

Danach darf sie die für diese Datei passenden Blöcke enthalten. Ein
Modelldokument kann nach seinem Modellblock enden; eine View-Datei kann auf
Elemente und Beziehungen anderer Projektdateien verweisen.

Dateien werden semantisch zusammengeführt und nicht als Text aneinandergefügt.
Ihre Reihenfolge steuert weder Bedeutung noch Layout. Stabile Identitäten
bleiben beim Verschieben von Deklarationen erhalten. Doppelte Deklarationen sind
Fehler; eine spätere Datei ersetzt niemals stillschweigend eine frühere.

## Verwendung mit der CLI

Die CLI akzeptiert Projektverzeichnis oder Manifest:

```sh
c4ml check garden-architecture
c4ml check garden-architecture/c4ml.project.json
c4ml analyze garden-architecture --fail-on error
c4ml render garden-architecture --view garden-context --format svg,png
```

Ein ausführbares Originalbeispiel liegt unter
`examples/projects/garden-pulse-multifile`.

## Desktop-Editor

Öffne über **File → Open Project…**, `Cmd/Ctrl+Alt+O`, Files oder die
Befehlspalette ein Projektverzeichnis. Es muss genau eine `.c4ml`-Datei auf
oberster Ebene oder `c4ml.project.json` enthalten.

Files zeigt exakt die im Manifest ausgewählten Quellen. Jede Quelle hat Puffer,
Tab, nativen Dateihandle und Dirty-Markierung. Compiler und Completion-Worker
sehen das gesamte Projekt im Speicher. Probleme oder Diagrammobjekte öffnen die
besitzende Quelldatei und markieren den Bereich.

**Save** und **Save As** betreffen den aktiven Tab. **Save All** schreibt alle
geänderten Quellen in Manifestreihenfolge durch dieselbe native Grenze. Bereits
erfolgreich gespeicherte Dateien bleiben gespeichert, wenn ein späterer
Schreibvorgang scheitert oder abgebrochen wird; der Rest bleibt sichtbar
geändert. Beim Schließen schützt der native Dialog alle ungespeicherten Quellen.
Jeder Tab bewahrt eigenen Monaco-Undo-Verlauf, Cursor und Scrollposition.

Richtlinien, Beobachtungen und andere Ressourcen sind im ersten Editor-Schnitt
schreibgeschützt. Befunde erscheinen in **Output → Architecture findings** und
navigieren zur betroffenen Deklaration. Source, Modell und Ressourcen werden
nicht automatisch abgeglichen oder umgeschrieben.

## Grenze der Projektressourcen

Architekturquellen sowie lokale Richtlinien-, Beobachtungs-, Glossar-,
Erzählungs-, Publikations-, Theme-, Shape- und lizenzierte passive
Asset-Ressourcen besitzen heute Verträge der Version 1. Architektur-Baselines
und externe Scanner-Adapter bleiben getrennte spätere Themen.

Jede künftige Ressource benötigt einen eigenen Vertrag. Ein
Publikationsprofil darf die Architekturbedeutung nicht ändern; lokale
Workbench-Einstellungen bleiben außerhalb des Projekts.
