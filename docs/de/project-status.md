# C4thedral-Projektstatus

[English](../en/project-status.md) | [Deutsch](project-status.md)

Status: Öffentliche Source-Beta

Aktuelle Version: `v0.1.0-beta.5`

Aktualisiert: 2026-09-04

Dieses Dokument beschreibt den aktuellen Reifegrad und die Grenzen der Beta.
Es ist kein Entwicklungstagebuch. Detaillierte Produktanforderungen stehen in
der [technischen Spezifikation](../engineering/specification.md), notwendige
Nachweise in [Testing](../engineering/testing.md), abgeschlossene Änderungen in
den [Versionshinweisen](releases/0.1.0-beta.5.md) und technische Arbeitspunkte
in der [Roadmap](../engineering/roadmap.md).

## Was Beta hier bedeutet

C4thedral ist nutzbare Software mit funktionierender Desktop-Anwendung,
Compiler und Kommandozeile. Es ist weder bloß ein Parser-Experiment noch eine
leere Programmoberfläche. Die aktuelle ausführbare C4ML-Sprache modelliert und
rendert alle sieben C4-Sichttypen; Desktop-Worker und CLI verwenden denselben
Compiler.

Die Bezeichnung Beta schränkt zwei Zusagen bewusst ein:

1. **Quellkompatibilität ist noch nicht eingefroren.** Bestehende Beta-Dateien
   funktionieren mit dem Beta-Compiler, doch Syntax und CLI-Befehle können sich
   bis zur stabilen Version ändern. Eine spätere Version kann eine dokumentierte
   Migration verlangen.
2. **Offizielle signierte Downloads fehlen noch.** Aus dem Quellcode lassen
   sich native Pakete erzeugen; Apple Developer ID/Notarisierung und die
   Windows-Herausgebersignatur stehen noch aus.

Die Beta eignet sich zum Ausprobieren, für lokale Architekturarbeit,
Source-Builds und Beiträge. Sie ist noch kein langfristiger
Kompatibilitätsvertrag und keine offiziell signierte Binärdistribution.

## In der aktuellen Beta vorhanden

### Modellierung und Diagramme

- Ein semantisches Architekturmodell mit stabilen Identitäten und gerichteten
  Beziehungen, die einmal auf ihrer detailliertesten Ebene deklariert und auf
  die Abstraktionsebene jeder statischen View projiziert werden (gestrichelte
  implizierte Verbindungen mit Legendeneintrag; `relationships = declared`
  schaltet das je View ab).
- Personen, Softwaresysteme, Container, Components und Code-Elemente.
- Deployment-Umgebungen, verschachtelte Deployment Nodes, Infrastruktur sowie
  Instanzen von Softwaresystemen und Containern.
- System Landscape, System Context, Container, Component, Code, Dynamic und
  Deployment Views.
- Ein-Datei-Modelle und ausdrückliche Mehrdatei-Projekte mit dokumentübergreifenden
  Referenzen, Diagnosen, Navigation und Speichern.
- Deterministisches eigenständiges SVG und daraus abgeleitetes PNG mit
  kontrollierten IBM-Plex-Schriften und einer generierten Legende aller
  gezeichneten Notationsarten.

### Layout und Routing

- Automatisches zusammengesetztes Layout über den austauschbaren ELK.js-Adapter
  mit festem Seed, reserviertem Platz für Beziehungslabels und Randanbindungen,
  die mehrere Verbindungen an einer Seite auseinanderhalten.
- Relative Platzierung, Ausrichtung, gleiche Abstände, Verschiebung gegenüber
  dem automatischen Ergebnis und exaktes Fixieren ausgewählter Elemente.
- Automatische, geführte und feste Routen mit Himmelsrichtungs-Ports, relativen
  oder absoluten Wegpunkten, gesperrten Segmenten, Sperrflächen, benannten
  Korridoren und Spuren sowie ausdrücklicher Labelposition.
- Prüfbare automatische und endgültige Geometrie sowie Routendiagnose in der
  Desktop-Vorschau.

Damit funktioniert der beabsichtigte hybride Ablauf bereits: ein brauchbares
automatisches Ergebnis übernehmen und nur die für ein bestimmtes Diagramm
nötigen, quellgebundenen Steuerungen ergänzen. Speziellere Constraints wie
benannte Zeilen-/Spaltengruppen, bevorzugte Nähe, begrenzte Bewegung oder
beschränkte Elementgrößen sind spätere Erweiterungen. Ihr Fehlen schaltet weder
das automatische Layout noch die vorhandenen Platzierungs- und Routenfunktionen
ab.

### Desktop-Workbench

- Native Electron-Workbench mit Angular, Monaco und lokalem Compiler-Worker.
- Files, Source Control, Diagrams, Output, Help, Problems, Routeninspektion,
  Einstellungen, Befehlssuche und lokales deutsch/englisches Handbuch.
- Datei-/Projektöffnung, Save, Save All, Save As, Schließschutz, SVG-/PNG-Export
  und leerer Startarbeitsbereich.
- Navigation zwischen Quelle und Diagramm sowie quellgebundene grafische
  Erstellung, Verbindung, Platzierung, Routing, Deployment-Topologie und
  Dynamic-Interaktionen mit Kandidatenprüfung und einmaligem Rückgängigmachen.
- Vollbildvorschau und abtrennbare reine Projektionsvorschau.
- Ausdrückliche lokale Git-Aktionen für Status, Stage, Unstage, Commit und Push;
  bewusst ohne verstecktes Pull, Checkout, Verwerfen oder Umschreiben.
- Lokale Einstellungen für Sprache, Hell/Dunkel, Farbfamilien, Quellthemes und
  Editor-Typografie.

### Architekturentwicklung und Prüfungen

- Semantischer Vergleich über stabile Identitäten einschließlich Umbenennungen,
  Wirkungspfaden, stabiler visueller Gegenüberstellung und Offline-
  Migrationsberichten.
- Eingebaute Qualitätsbefunde und Graphabfragen mit Fundstellen.
- Optionale lokale Richtlinien- und Beobachtungsressourcen, die Desktop-Worker
  und CLI identisch bewerten, ohne den verfassten Quelltext zu ändern.
- Typisierte Glossar-, Erzählungs-, Publikations-, Theme-, Shape- und
  lizenzierte passive Asset-Ressourcen.

## Status der Sprache

Es gibt einen echten `.c4ml`-Parser. Er verarbeitet und kompiliert die Syntax
der ausführbaren Beispiele einschließlich aller sieben Sichtfamilien und der
implementierten Platzierungs- und Routensteuerung. „Parser noch nicht
vollständig“ in älteren Projektnotizen bedeutete, dass nicht jedes geplante
öffentliche Syntaxkonstrukt eingefroren war – nicht, dass `.c4ml`-Dateien
unlesbar wären.

Vorläufig bleiben:

- keine Rückwärtskompatibilitätszusage vor der ersten stabilen Sprachversion;
- noch kein allgemeiner Quelltext-Formatter;
- ausdrücklich als Entwurf markierte Handbuchabschnitte statt ausführbarer
  Syntax;
- Visual-Group-Syntax und Quelldeklarationen eigener Shapes noch nicht im
  Parser; und
- Themes über Presets und `.c4ml-theme.json`, während eine mögliche
  `.c4ml`-Theme-Grammatik nicht eingefroren ist.

Das [Benutzerhandbuch](user-guide.md) trennt ausführbare Syntax von Entwürfen;
`examples/draft` enthält lauffähige Beta-Beispiele.

## Status der CLI

Die CLI prüft, rendert, vergleicht, analysiert und befragt Dateien oder Projekte
über den gemeinsamen Compiler. Sie unterstützt SVG und PNG, eine oder alle
Views, JSON- oder Textdiagnosen, Git-Versionsvergleiche ohne Checkout sowie
klassifizierte Exit-Codes für Automatisierung.

Namen und Optionen können sich noch ändern; die CLI wird aus dem Repository
aufgerufen und noch nicht als eigenständiges Paket veröffentlicht. Deshalb
heißt sie experimentell, obwohl ihre implementierten Befehle getestet und
nutzbar sind.

## Status der nativen Plattformen

Native Builds müssen auf ihrem Zielbetriebssystem entstehen und geprüft
werden. Die aktuelle Beta hat Source-, Paket-, Installations-, Offline-Start-
und native Datei-/Exportabläufe bestanden auf:

- macOS arm64;
- Windows x64;
- Ubuntu arm64; und
- Ubuntu x64.

macOS-Entwicklungsartefakte sind nur ad hoc signiert. Die öffentliche
Apple-Verteilung verlangt Developer ID und Notarisierung. Windows-Verhalten und
Squirrel-Installation sind geprüft, doch dem öffentlichen Installer fehlt die
Herausgebersignatur. Ubuntu verwendet ein natives DEB, damit der Chromium-
Sandbox-Helfer mit erforderlichem Besitzer und Modus installiert wird.

Genaue Nachweise und Host-Befehle stehen in der
[Plattformmatrix](platforms.md) und in [Testing](../engineering/testing.md).

## Noch offen vor einem signierten öffentlichen Binär-Release

- Apple Developer ID/Notarisierung konfigurieren und prüfen.
- Windows-Herausgebersignatur konfigurieren und prüfen.
- Nur Artefakte veröffentlichen, die das vollständige Host-Release-Gate
  bestanden haben.
- Kompatibilitäts- und Migrationsregeln für die erste stabile C4ML-Sprache und
  CLI festlegen.

Weitere Produktverbesserungen sind kein Hindernis für die Source-Beta: ein
allgemeiner Formatter, speziellere Layout-/Routenconstraints, auswählbare
Pfeilspitzen, vollständige Assistive-Technology-Prüfung, breitere
Assistentenabläufe und eine separat paketierte CLI.

## Maßgebliche Statusquellen

- [Versionshinweise](releases/0.1.0-beta.5.md): Inhalt des aktuellen Tags.
- [Plattformmatrix](platforms.md): aktuelle native Nachweise.
- [Testing](../engineering/testing.md): notwendige Nachweise für Aussagen.
- [Roadmap](../engineering/roadmap.md): Arbeitspunkte und bewusste Vertagungen.
- [Spezifikation](../engineering/specification.md): maßgebliches Produktverhalten
  und Architektur.
