# C4ML-Projekte

[English](../en/projects.md) | [Deutsch](projects.md)

Status: Vollständige typisierte Projektressourcen-Grundlage Version 1

Datum: 2026-08-31

Ein C4ML-Projekt ist eine Architektur-Kompilierung aus einem oder mehreren
Quelldokumenten. Das Projekt ist die Kompilationseinheit, eine Quelldatei die
Bearbeitungseinheit und eine View die Ausgabeeinheit.

## Vom Projekt zum fertigen Ergebnis

Du beschreibst eine Architektur einmal und erzeugst daraus verschiedene
Diagramme. Eine Übersicht für das Fachteam und eine technische Detailansicht
verwenden dieselben Architekturdefinitionen. Du musst Namen, Verantwortungen
und Beziehungen deshalb nicht für jedes Diagramm erneut pflegen.

**Projektdateien → gemeinsames Modell → ausgewählte View → SVG oder PNG**

Eine *View* ist die Beschreibung eines Diagramms: Welche Frage beantwortet es,
welchen Ausschnitt zeigt es und wie wird dieser angeordnet? Die View verweist
auf das gemeinsame Modell. Die exportierte Bilddatei ist ein Ergebnis daraus;
sie ersetzt die bearbeitbaren Projektdateien nicht.

### 1. Was gehört wohin?

**Dateien → Neues Projekt…** fragt nach einem Namen und dem übergeordneten
Ablageordner. C4thedral erstellt darin einen neuen Projektordner:

| Bestandteil | Inhalt und Zweck | Einfluss auf die Ausgabe |
| --- | --- | --- |
| `c4ml.project.json` | Inhaltsverzeichnis mit Projektkennung und ausdrücklich aufgeführten Quellen. | Bestimmt, welche Dateien gemeinsam ausgewertet werden. |
| `model/architecture.c4ml` | Personen, Systeme und deren Bestandteile mit Namen und Verantwortungen. | Liefert die Elemente für die Diagramme. |
| `relations/relationships.c4ml` | Gerichtete Beziehungen zwischen diesen Elementen. | Liefert die Verbindungen für passende Views. |
| `views/views.c4ml` | Diagrammdefinitionen mit Typ, Ausschnitt, Titel und gegebenenfalls Layout. | Bestimmt die einzeln ausgebbaren Diagramme. |
| `docs/` | Platz für eigene Erläuterungen und Entscheidungen. | Texte werden nicht automatisch Teil eines SVG-/PNG-Exports. |

Diese Aufteilung ist eine Ordnungshilfe, keine Pflicht der Sprache. Eine
Quelldatei darf Modell, Beziehungen und mehrere Views enthalten. Umgekehrt darf
eine View auf Elemente aus mehreren Dateien zugreifen. Die Ordnernamen sorgen
nicht dafür, dass grafische Bearbeitungen automatisch in genau diesen Dateien
landen; maßgeblich ist der angezeigte Quelltextvorschlag.

Das Manifest ist kein automatischer Ordnerscan: Eine zusätzlich abgelegte
`.c4ml`-Datei gehört erst zum Projekt, wenn sie in `sources` steht. Beim
Verschieben einer Quelle muss auch dieser Pfad angepasst werden. Die aktuellen
Projektressourcen und das Manifest bearbeitest du bei Bedarf außerhalb des
Quelltexteditors der App. Ressourcen wie ein Glossar gehören in ihre eigenen
Manifestfelder, nicht in `sources`.

### 2. Ein Modell, mehrere Fragen: Gartenplanung

Stell dir eine Gartenplanung vor: Die Gartenbetreuung nutzt das System, eine
API verarbeitet Beobachtungen und ein Datenspeicher hält die Arbeitspläne.

- **Wer verwendet die Gartenplanung?** Eine System-Context-View zeigt die
  Betreuung und das System sowie deren Beziehung.
- **Welche technischen Teile arbeiten zusammen?** Eine Container-View zeigt
  beispielsweise API und Datenspeicher innerhalb des Systems.
- **Wo läuft das Ganze?** Eine Deployment-View zeigt die Laufzeitumgebung und
  Instanzen der bereits definierten Teile. Dafür ergänzt du ausdrücklich das
  Deployment-Modell; es entsteht nicht automatisch aus einer Container-View.

Die drei Views zeigen unterschiedliche Ausschnitte desselben Projekts. Wird
die Verantwortung der API geändert, verwenden die betroffenen Views beim
nächsten Rendern die neue Definition. Wird die API nur in einer View
ausgeblendet, bleibt sie im Modell und in anderen Views erhalten. Ein
Layoutwechsel verändert die Anordnung, nicht die Architektur.

Eine Datei ist daher nicht gleich ein Diagramm: Zehn Quelldateien können eine
einzige View liefern; eine Quelldatei kann mehrere Views liefern. Das neue
Projekt enthält zunächst leere Quellen und **noch kein exportierbares Diagramm**.

### 3. In der App bis zum ersten Bild

1. Lege über **Neues Projekt…** Name und Ablage fest. Das Projekt öffnet sich
   mit drei Quelldateien.
2. Ergänze über **Element hinzufügen…** zunächst eine Person und ein
   Softwaresystem. Prüfe die vorgeschlagenen Quelltextänderungen und übernimm sie.
3. Erstelle über **Diagramm erstellen** eine passende erste Ansicht, zum
   Beispiel den Systemkontext des Systems. Ergänze über **Verbinden** eine
   Beziehung. Unter **Diagramme** kannst du weitere Views erstellen und auswählen.
4. Prüfe die ausgewählte Vorschau und die Problemmeldungen. Bei ungültigen
   Änderungen kann noch die letzte gültige Vorschau zu sehen sein; exportiere
   erst, wenn die aktuelle Quelle erfolgreich verarbeitet wurde.
5. Wähle **Alles speichern**, damit sämtliche Änderungen auf der Festplatte
   stehen. **Speichern** betrifft nur die aktive Quelldatei.
6. Öffne **Ausgabe** und exportiere das aktive Diagramm als SVG oder PNG.
   SVG bleibt als Vektorgrafik skalierbar; PNG ist ein Rasterbild, im Desktop
   wahlweise mit 1-, 2- oder 3-facher Auflösung.

Die App wertet alle geöffneten Projektquellen einschließlich ungespeicherter
Änderungen aus. Die CLI liest dagegen die gespeicherten Dateien. Speichere vor
dem Wechsel zur CLI deshalb immer alle Änderungen. Exportierte Bilder werden
nach späteren Modelländerungen nicht automatisch aktualisiert: Exportiere sie
erneut. Bewahre das Projekt auf, wenn du weiter daran arbeiten möchtest.

### 4. Eine oder alle Views über die Kommandozeile

Im Repository lässt sich das mitgelieferte, ausführbare Beispiel
[Garden Pulse](../../examples/projects/garden-pulse-multifile/c4ml.project.json)
direkt prüfen und ausgeben. Führe diese Befehle im Repository-Hauptordner aus:

```sh
pnpm run c4ml -- check examples/projects/garden-pulse-multifile
pnpm run c4ml -- render examples/projects/garden-pulse-multifile --view garden-pulse-context --format svg,png --output build/project-guide/selected
pnpm run c4ml -- render examples/projects/garden-pulse-multifile --all --format svg,png --output build/project-guide/all
```

`--view` verwendet die stabile View-Kennung aus der Quelle, keinen Dateinamen.
`--all` erzeugt für jede deklarierte View die gewählten Bildformate, kein
zusammengefügtes Dokument. Dieses Beispiel enthält eine View; deshalb liefern
beide Renderbefehle jeweils ein SVG und ein PNG. Für dein eigenes Projekt
ersetzt du Projektpfad und View-Kennung. Diese CLI gehört zum Quellcode-Checkout;
eine Desktop-Installation stellt nicht automatisch einen Terminalbefehl bereit.

### 5. Was zusätzliche Projektressourcen heute bewirken

| Ressource | Heute nutzbarer Zweck | Grenze |
| --- | --- | --- |
| Theme und Shapes | Farben und unterstützte Formen der Diagrammausgabe festlegen. | Verändern keine Architektur und keine Workbench-Einstellungen. |
| Policy und Observations | Architektur prüfen und bestätigte Abweichungen melden. | Befunde sind keine automatische Modellkorrektur. |
| Glossar | Begriffe und Abkürzungen strukturiert erfassen und prüfen. | Erzeugt kein vollständiges Handbuch. |
| Narratives | Ausdrücklich angemeldete Textkapitel mit geprüftem Format einbinden. | Eine beliebige Datei in `docs/` wird nicht automatisch eingebunden oder exportiert. |
| Publication | View-Reihenfolge, Bildunterschriften und Ausgabeprofile beschreiben und auf gültige View-Verweise prüfen. | Der normale Bildexport führt daraus noch keinen Publikationsauftrag aus. |
| Assets | Passive Begleitdateien samt Integrität und Lizenz erfassen. | Kein automatisches Einbetten beliebiger Dateien in Diagramme. |

**Heute gibt es keinen allgemeinen Projekt-Export als fertiges PDF-, HTML-
oder Word-Handbuch aus Diagrammen, Glossar und Textkapiteln.** Dafür verwendest
du die erzeugten SVG-/PNG-Dateien und deine Texte in einem Dokumentwerkzeug.
Die separat vorhandene Offline-HTML-Grundlage für Migrationsreviews betrifft
Architekturvergleiche; sie ist kein solcher Handbuch-Export.

Für den Einstieg reichen Modell, Beziehungen und eine View. Die zusätzlichen
Ressourcen brauchst du erst, wenn du ihren jeweiligen Zweck nutzen möchtest.
Die folgende Referenz beschreibt deren Dateiverknüpfungen im Detail.

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
- `publication` beschreibt View-Reihenfolge, Bildunterschriften und
  deterministische SVG-/PNG-Profile. Die Ressource wird validiert; der normale
  Bildexport führt daraus noch keinen Publikationsauftrag aus.
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
