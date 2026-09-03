# C4thedral

[English](README.md) | **Deutsch**

C4thedral ist eine lokale Desktop-Arbeitsumgebung, mit der du
Softwarearchitektur nach dem C4-Modell beschreiben, prüfen und weiterentwickeln
kannst. Die zugehörige Sprache und der Compiler heißen C4ML.

Du beschreibst eine Architektur einmal, wählst die passenden Ansichten für
unterschiedliche Zielgruppen und siehst den Quelltext direkt neben dem aktuellen
Diagramm. C4thedral validiert das Modell, ordnet das Diagramm an und exportiert
deterministische SVG- und PNG-Dateien. Wenn die automatische Anordnung nicht
ausreicht, kannst du Positionen und Verbindungswege gezielt beeinflussen, ohne
das Diagramm in eine losgelöste Zeichnung zu verwandeln.

**Aktuelle Version: `v0.1.0-beta.3` — öffentliche Source-Beta.** Das ist eine
funktionsfähige Anwendung und kein frühes Grundgerüst: Desktop-Anwendung und CLI
übersetzen alle sieben C4-Ansichtstypen, und die nativen Abläufe wurden unter
macOS, Windows und Ubuntu geprüft. Beta bedeutet, dass sich die
benutzerorientierte C4ML-Syntax und die CLI-Schnittstelle noch ändern können und
noch keine signierten öffentlichen Installationspakete bereitstehen. Den
genauen Reifegrad und die verbleibenden Auslieferungsgrenzen beschreibt der
[Projektstatus](docs/de/project-status.md).

## Was C4thedral kann

- Personen, Softwaresysteme, Container, Komponenten, Codeelemente,
  Bereitstellungsumgebungen, Infrastruktur, Instanzen und gerichtete
  Beziehungen in Textform modellieren.
- Systemlandschafts-, Systemkontext-, Container-, Komponenten-, Code-, Dynamik-
  und Bereitstellungsansichten aus demselben Architekturmodell erzeugen.
- C4ML-Quelltext, Diagnosen und eine laufend aktualisierte grafische Vorschau in
  einer Desktop-Arbeitsumgebung anzeigen.
- Den Quelltext maßgeblich halten: Grafische Bearbeitungen schlagen prüfbare
  C4ML-Änderungen vor und übernehmen sie als einen rückgängig machbaren Schritt.
- Automatische Anordnung mit relativer Platzierung, Ausrichtung, gleichmäßigen
  Abständen, Verschiebungen, exakten Fixpunkten, wählbaren Anschlusspunkten,
  Wegpunkten, Vermeidungsbereichen, Routenkorridoren und festgelegten Routen
  kombinieren.
- In beide Richtungen zwischen Quelldeklarationen und Diagrammobjekten
  navigieren, einschließlich Beziehungen und ihrer tatsächlich verwendeten
  Routen.
- Eigenständige SVG- und PNG-Dateien mit kontrollierten lokalen Schriften und
  reproduzierbarer Geometrie exportieren.
- Eine einzelne `.c4ml`-Datei oder ein ausdrücklich definiertes Projekt aus
  mehreren Dateien mit projektweiten Referenzen und Diagnosen öffnen.
- Architekturstände anhand stabiler Identitäten vergleichen, Auswirkungspfade
  darstellen und Offline-Migrationsübersichten erzeugen, statt Änderungen auf
  Text- oder Pixelunterschiede zu reduzieren.
- Architekturqualität, Projektregeln und nachvollziehbar zugeordnete
  Beobachtungen prüfen, ohne das verfasste Modell zu verändern.
- Eine englische und deutsche Oberfläche mit nativen Menüs, Dialogen,
  Einstellungen und einem Offline-Handbuch bereitstellen.
- Nach der Installation vollständig lokal arbeiten. Für die normale Nutzung
  sind weder Konto noch Cloud-Dienst, Python-Prozess oder Compiler-Server nötig.

## Die Desktop-Arbeitsumgebung

Die Electron-Anwendung ordnet die Bereiche Dateien, Versionsverwaltung,
Diagramme, Ausgabe und Hilfe um einen Angular- und Monaco-Editor an. Sie
unterstützt native Öffnen- und Speichern-Abläufe, mehrere Quelldateien pro
Projekt, Schutz vor dem Verlust ungespeicherter Änderungen, SVG-/PNG-Export und
ausdrückliche lokale Git-Aktionen für Stage, Unstage, Commit und Push.

Die Vorschau kann die gesamte Hauptarbeitsfläche einnehmen oder in ein zweites
natives Fenster ausgelagert werden. Dieses Vorschaufenster erhält nur die
gerenderte Projektion und den Interaktionszustand; es hat keinen Zugriff auf
Quelltext, Dateisystem, Compiler, Speichern oder Export.

Bearbeitung, Übersetzung, Anordnung, Rendering und Git-Zugriff bleiben durch
kleine Verträge voneinander getrennt. Die Desktop-Anwendung verwendet denselben
portablen Compiler wie die Kommandozeile. Ein Modell erhält dadurch in der
Oberfläche keine andere Bedeutung.

## Der Quelltext ist die Architektur

C4ML trennt Architekturmodell, Ansichten, Darstellung, Anordnung und Routing.
Ein Diagramm kann mit einer automatischen Anordnung beginnen und anschließend
nur die tatsächlich benötigten Steuerungen erhalten. Diese Steuerungen bleiben
in der Versionsverwaltung prüfbar und werden weder zu vorgetäuschten
Architekturbeziehungen noch zu einem versteckten Editorzustand.

SVG ist das maßgebliche Renderformat. PNG wird aus derselben SVG-Geometrie und
Textanordnung abgeleitet und nicht aus einem Browser-Bildschirmfoto erzeugt.

```text
C4ML-Quelltext
  -> validiertes C4-Modell
  -> ausgewählte Ansicht
  -> automatische Anordnung plus verfasste Vorgaben
  -> geroutete, rendererneutrale Szene
  -> SVG
  -> PNG
```

## Vibe Coding mit fachlicher Verantwortung

**C4thedral wurde gevibed – bewusst, transparent und unter erfahrener
menschlicher Engineering-Führung.** Dialogische KI beschleunigte Umsetzung,
Erkundung, Refactoring, Tests und Dokumentation. Sie übernahm weder die
Architekturhoheit noch senkte sie die Anforderungen an Nachweise.

Das funktioniert nur, wenn die ausführende Person das System entwerfen,
generierten Code verstehen und verwerfen, Folgen für Sicherheit und Wartung
beurteilen und die Grenzen automatischer Prüfungen erkennen kann. Maßgeblich
bleiben Spezifikationen, Quelltext, Reviews, Test-Gates und native Nachweise.
[Vibe Coding mit fachlicher Verantwortung](docs/de/ki-gestuetzte-entwicklung.md)
beschreibt Vorteile, Grenzen und Arbeitsregeln ausführlich.

## Beta bauen und starten

Verwende Node.js 24.15.0 oder eine neuere Version der 24er-Reihe sowie die in
`package.json` festgelegte pnpm-Version:

```shell
git clone https://github.com/indianerbande/c4ml.git
cd c4ml
corepack enable
corepack prepare pnpm@11.24.0 --activate
pnpm install --frozen-lockfile
pnpm run check
pnpm run desktop:start
```

Die Anwendung startet mit einer leeren Arbeitsfläche. Öffne über das Dateimenü
ein `.c4ml`-Dokument oder ein ausdrücklich definiertes Projekt. Ausführbare
Beispiele liegen unter [`examples/draft`](examples/draft), darunter die
Demonstration `signal-garden.c4ml` mit allen sieben Ansichten.

Die Betriebssystemvoraussetzungen, den Umgang mit der Linux-Sandbox und den
vollständigen reproduzierbaren Ablauf für native Pakete beschreibt
[C4thedral aus dem Quellcode bauen](docs/de/build-from-source.md). Selbst erstellte macOS- und
Windows-Pakete tragen noch nicht die künftigen Herausgebersignaturen von
C4thedral.

## CLI verwenden

Das Repository enthält eine experimentelle lokale CLI, die dieselben Sprach-
und Compilerpakete wie die Desktop-Anwendung verwendet:

```shell
# Ein Modell validieren.
pnpm run c4ml -- check examples/draft/hello-context.c4ml

# Eine Ansicht als SVG und PNG rendern.
pnpm run c4ml -- render examples/draft/hello-static-zoom.c4ml \
  --view arrangement-engine-code \
  --format svg,png \
  --output build/diagrams

# Ein Projekt aus mehreren Dateien validieren.
pnpm run c4ml -- check examples/projects/garden-pulse-multifile

# Eine Git-Revision mit dem Arbeitsstand vergleichen, ohne sie auszuchecken.
pnpm run c4ml -- diff path/to/project \
  --before-ref main \
  --after-ref working \
  --diagnostics json
```

Die CLI unterstützt außerdem Analysen, Graphabfragen, semantische und visuelle
Vergleiche, das Rendern einer oder aller Ansichten, mehrere PNG-Auflösungen und
menschenlesbare oder JSON-Diagnosen. Ihre Befehle können sich während der Beta
noch ändern; sie wird noch nicht als eigenständiges Paket veröffentlicht.

## Grenzen der aktuellen Beta

Die Syntax der ausführbaren Beispiele ist real und funktioniert. Noch nicht
zugesichert ist die langfristige Quelltextkompatibilität: Schlüsselwörter,
Formatierungsregeln und einige fortgeschrittene Darstellungskonstrukte können
sich vor der ersten stabilen Sprachversion ändern. Einen allgemeinen
C4ML-Formatierer gibt es noch nicht.

Eingebaute Themes und Theme-Projektdateien funktionieren bereits. Offen ist
lediglich eine mögliche künftige Syntax, mit der Themes direkt in `.c4ml`
deklariert werden könnten – nicht die Theme-Funktion selbst. Ebenso decken die
vorhandenen Platzierungs- und Routing-Steuerungen den üblichen Ablauf aus
Automatik und gezielten Eingriffen bereits ab; für besondere Diagramme sind
weitere Arten von Einschränkungen geplant.

Signierte und notarisierte öffentliche Downloads für macOS sowie signierte
Installationsprogramme für Windows stehen noch aus. Deshalb wird die Beta als
Quelltext verteilt. Diese Punkte sowie die kleineren Lücken in Editor und
Sprache sind im [Projektstatus](docs/de/project-status.md) verständlich
aufgeführt; die technischen Arbeitspakete stehen in der
[technischen Roadmap](docs/engineering/roadmap.md).

## Dokumentation

Der [deutsche Dokumentationsindex](docs/de/README.md) ist der beste Einstieg.

- [Aus dem Quellcode bauen](docs/de/build-from-source.md)
- [Projektstatus](docs/de/project-status.md)
- [Benutzerhandbuch](docs/de/user-guide.md)
- [Vibe Coding mit fachlicher Verantwortung](docs/de/ki-gestuetzte-entwicklung.md)
- [C4ML-Projekte](docs/de/projects.md)
- [Native Plattformmatrix](docs/de/platforms.md)
- [Versionshinweise](docs/de/releases/0.1.0-beta.3.md)
- [CONTRIBUTING.de.md](CONTRIBUTING.de.md) — Ablauf für Beiträge
- [SECURITY.de.md](SECURITY.de.md) — vertrauliches Melden von Sicherheitsproblemen
- [Technische Projektdokumentation](docs/engineering/README.md) — maßgebliche
  englische Spezifikation, Tests, Einstellungen, Roadmap und Abhängigkeiten

## Eigenständigkeit und verwandte Projekte

C4thedral ist eine eigenständige Implementierung im weiteren Umfeld von C4 und
Architecture as Code. Das C4-Modell, PlantUML, Structurizr, Mermaid, LikeC4,
D2, Graphviz, ELK, Penrose und andere Projekte liefern wertvolle allgemeine
Anregungen zu Fähigkeiten. C4ML strebt keine Quelltextkompatibilität mit einer
anderen Diagrammsprache an; Grammatik, Beispiele, Oberfläche, Themes und
visuelle Elemente werden unabhängig entwickelt.

## Lizenz

C4thedral und C4ML stehen unter der [Apache License 2.0](LICENSE).
Abhängigkeiten Dritter behalten ihre jeweiligen Lizenzen und sind gesondert
dokumentiert.
