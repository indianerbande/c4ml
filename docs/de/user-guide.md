# C4thedral-Benutzerhandbuch

[English](../en/user-guide.md) | [Deutsch](user-guide.md)

Status: Syntaxentwurf mit ausführbarer Sprache und Desktop-Workbench

Datum: 2026-09-02

**C4thedral** ist die Desktop-Workbench für Softwarearchitektur. **C4ML** ist
ihre Sprache, ihr Quellformat, Compiler und Kommandozeile.

Dieses Handbuch beschreibt die Arbeit mit C4ML und die vorgeschlagene Syntax
an realistischen Beispielen.

> **Wichtig:** Die Beta enthält einen echten `.c4ml`-Parser, eine funktionierende
> Electron-Anwendung und eine experimentelle CLI. Alle sieben C4-Sichttypen
> sowie die dokumentierten Platzierungs- und Routensteuerungen sind ausführbar.
> Syntax und CLI sind noch keine stabile Kompatibilitätszusage; öffentliche
> macOS- und Windows-Signaturen fehlen. Ausdrücklich als Entwurf bezeichnete
> Abschnitte – derzeit Visual Groups, Themes und eigene Shapes im C4ML-Quelltext
> – sind nicht ausführbare Sprachvorschauen. Details stehen im
> [Projektstatus](project-status.md).

Die [technische Spezifikation](../engineering/specification.md) ist für das
Produktverhalten maßgeblich. Bei einem Widerspruch gewinnt die Spezifikation.

## Inhalt

- [1. Wozu C4ML dient](#1-wozu-c4ml-dient)
- [2. Aktuelle und geplante Verwendung](#2-aktuelle-und-geplante-verwendung)
- [3. Vorgeschlagenes Quellformat](#3-vorgeschlagenes-quellformat)
- [4. Architekturmodell deklarieren](#4-architekturmodell-deklarieren)
- [5. Beziehungen deklarieren](#5-beziehungen-deklarieren)
- [6. Views deklarieren](#6-views-deklarieren)
- [7. Dynamic Views](#7-dynamic-views)
- [8. Deployment-Modell und Views](#8-deployment-modell-und-views)
- [9. Layout und Routing](#9-layout-und-routing)
- [10. Diagnosen](#10-diagnosen)
- [11. Beispieldateien](#11-beispieldateien)
- [12. Grundsätze zur Prüfung](#12-grundsätze-zur-prüfung)
- [13. Respekt vor verwandten Projekten](#13-respekt-vor-verwandten-projekten)

## 1. Wozu C4ML dient

C4ML beschreibt Softwarearchitektur einmal und leitet mehrere Diagramme aus
dem gemeinsamen Modell ab. Beginne mit automatischem Layout und verfeinere nur
Positionen oder Routen, die bewusste Kontrolle benötigen.

Ein Dokument trennt vier Anliegen:

1. `model`: Personen, Systeme, Container, Components und Code-Elemente;
2. `relations`: gerichtete Architekturbeziehungen;
3. `deployments`: Laufzeitumgebungen und Instanzen; und
4. `view`: Diagrammauswahl sowie lokale Darstellung und Layout.

Layoutanweisungen erzeugen niemals Architekturbeziehungen. Route, Position,
Theme oder Legende verändern das semantische Modell nicht.

## 2. Aktuelle und geplante Verwendung

### Heute für Mitwirkende verfügbar

Baue und prüfe den gemeinsamen TypeScript-Compiler mit:

```shell
pnpm install
pnpm run check
```

Die Desktop-Workbench startet mit:

```shell
pnpm run desktop:start
```

Sie bietet Files, Source Control, Diagrams, Output, Help und Settings,
gleichzeitige Quell- und Vorschau-Tabs, Problems und Routendetails. Öffnen und
Speichern verwenden die nativen Menüs und `Cmd/Ctrl+O`, `Cmd/Ctrl+S` sowie
`Cmd/Ctrl+Shift+S`. Ungespeicherte Änderungen sind sichtbar und beim Schließen
geschützt. Der Renderer erhält nur einen undurchsichtigen Dokument-Handle;
native Pfade und Node.js bleiben im Electron-Hauptprozess.

Source Control zeigt das umgebende lokale Repository und erlaubt ausschließlich
ausdrückliches Stage, Unstage, Commit und Push. Speichere Editoränderungen vor
dem Commit. Es gibt kein verborgenes Pull, Checkout, Verwerfen oder Umschreiben.

Die Vorschau kann die Workbench vollständig belegen oder in ein zweites
Electron-Fenster wechseln. Auswahl, Zoom, Fit und Routenoverlay bleiben
synchron. Das zweite Fenster ist reine Projektion: Es erhält weder Quelltext,
Dateipfad, Compiler-, Speicher- noch Exportautorität.

**Export SVG** speichert das kanonische Vektordiagramm. **Export PNG** erzeugt
lokal 1x, 2x oder 3x aus genau diesem SVG mit den paketierten IBM-Plex-Sans-
Schriften; es ist weder Screenshot noch erneutes Layout.

Settings ändern Sprache, System/Hell/Dunkel, Workbench-Farbfamilie, Quelltheme
und Editor-Typografie sofort und lokal. Sie übersetzen niemals verfasste Namen,
Diagnosen oder Diagramme und ändern keine `.c4ml`-Datei. Der technische Vertrag
steht in [Settings](../engineering/settings-contract.md).

Help öffnet ein lokales deutsch/englisches Handbuch. `F1` zeigt den vom
Sprach-Worker erkannten Kontext am Cursor. Suche und Navigation ändern weder
Quelle noch Diagramm.

Parser, Compiler und SVG-Erzeugung laufen in einem lokalen Web Worker. Bei
ungültiger Eingabe bleibt das letzte gültige Diagramm sichtbar. Monaco zeigt
nur Vorschläge und Edits des C4ML-Sprach-Workers. `Ctrl+Space` öffnet Vorschläge
auf Windows/Linux, `Cmd+I` auf macOS. Diagnosen navigieren zum Quellbereich;
Quell- und Diagrammauswahl funktionieren in beide Richtungen.

Native Entwicklungspakete erzeugst du mit:

```shell
pnpm run desktop:package
pnpm run desktop:make
```

Ausgaben liegen ignoriert unter `build/desktop/`. Installationsanleitungen gibt
es für [Windows](install-windows.md) und [Linux](install-linux.md).

### Experimentelle CLI für Mitwirkende

Die CLI ruft denselben Compiler wie der Desktop-Worker auf:

```shell
# Prüfen
pnpm run c4ml -- check examples/draft/hello-static-zoom.c4ml

# Rendern
pnpm run c4ml -- render examples/draft/hello-static-zoom.c4ml \
  --view arrangement-engine-code --format svg,png --output build/diagrams

# Zwei Architekturstände vergleichen
pnpm run c4ml -- diff path/to/before.c4ml path/to/after.c4ml \
  --diagnostics json

# Einen Git-Stand ohne Checkout mit dem Arbeitsstand vergleichen
pnpm run c4ml -- diff path/to/project \
  --before-ref main --after-ref working --diagnostics json

# Einen Wirkungspfad abfragen
pnpm run c4ml -- query path/to/project \
  --kind path --subject element:browser-app \
  --target element:records-store --diagnostics json
```

`check`, `render`, `diff`, `query` und `analyze` liefern menschliche oder
JSON-Diagnosen. `--scale` steuert PNG; `version` meldet Frontend- und
Sprachversion. Exit-Klassen unterscheiden Bedien-, Quell-, Layout-/Render- und
Umgebungsfehler; `analyze --fail-on` verwendet Klasse 6 für erreichte
Befundschwellen.

`analyze` führt eingebaute Architekturprüfungen sowie optionale lokale
`.c4ml-policy.json`- und `.c4ml-observations.json`-Ressourcen aus. Nur
bestätigte Beobachtungsabweichungen sind Drift; unsichere Daten ändern niemals
den Quelltext.

`query` beantwortet Upstream-, Downstream-, Pfad-, Containment-, Deployment-
und View-Abdeckungsfragen über qualifizierte Identitäten wie
`element:browser-app`. Der temporäre Fokus referenziert das kanonische Modell,
dupliziert oder verändert es aber nicht.

`diff` trennt Modell-, Beziehungs-, Deployment-, View-, Darstellungs- und
Layoutänderungen. Stabile IDs erkennen Umbenennungen; Formatierung, Kommentare
und Deklarationsreihenfolge erzeugen keine Änderung. Vergleichsmodi `before`,
`after`, `overlay` und `change-only` erzeugen SVG/PNG mit Legende und Metadaten.
Git-Refs werden aus dem lokalen Objektspeicher gelesen, ohne `HEAD`, Index oder
Arbeitsdateien zu verändern.

### Geprüfte Migrationsgeschichten

Der portable Compiler kann mehrere geprüfte Architekturstände zu einer
geordneten Migrationsgeschichte verbinden. Jeder Schritt trägt semantischen
Unterschied, Wirkungspfade und Provenienz. Ein selbstständiges Offline-HTML
bettet die vier Vergleichsansichten ein und lädt weder Skripte, Schriften noch
Styles aus dem Netz. Welche Stände geprüft sind und welche Views erscheinen,
entscheidet weiterhin das Frontend; versteckter Editorzustand ist keine
Architekturhistorie.

### Geführter Modellierungsassistent

Der Assistent beginnt mit der Frage, die das Diagramm beantworten soll:

- **Wer verwendet diese Anwendung und was liegt um sie herum?** erzeugt einen
  System-Context-Start mit Anwendung, Benutzerrolle und Absicht.
- **Was läuft innerhalb dieser Anwendung?** erzeugt einen Container-Start aus
  separat start-, deploy- oder betreibbaren Teilen samt Verantwortung,
  Technologie und Protokollen.

C4-Begriffe werden optional erklärt; „Container“ meint keine Docker-Pflicht.
Vor dem Anwenden zeigt der Assistent vollständigen `draft-1`-Quelltext. Abbruch
ändert nichts, Anwenden ist ein ausdrücklicher Source-Edit und **Undo wizard**
stellt den vorherigen Stand einmal wieder her.

### Kontextabhängige Architekturänderungen

**Architecture** fügt einem bestehenden statischen View ein gültiges Element
hinzu. **Connect** ist getrennt, weil eine gerichtete Beziehung eine andere
Aufgabe ist. Quelle und Ziel kommen aus gültigen Listen oder werden temporär im
Diagramm gewählt. View und C4-Ebene begrenzen die möglichen Elementarten.

Die Vorschau erzeugt zuerst ein normales dokumentadressiertes Text-Edit und
kompiliert das vollständige Kandidatenprojekt ohne Änderung. Quellvorschlag,
Diagramm und blockierende Diagnosen erscheinen gemeinsam. Nur ein gültiger
Kandidat kann als ein Monaco-Edit angewendet und einmal rückgängig gemacht
werden. Source bleibt maßgeblich.

## 3. Vorgeschlagenes Quellformat

### 3.1 Dokumentkopf

Jede Datei beginnt mit:

```c4ml
c4ml draft-1
```

`draft-1` ist die aktuelle Beta-Kennung, noch keine stabile Sprachzusage.

### 3.2 Grundnotation

- UTF-8-Dateien;
- stabile IDs wie `signal-garden`;
- Text in doppelten Anführungszeichen;
- `//`-Zeilenkommentare;
- Listen als `[first, second]`;
- Eigenschaften als `name = "Signal Garden"`; und
- Klammern für Modell-, Beziehungs-, Deployment-, View- und Layoutbereiche.

Deklarationsreihenfolge hat keine Bedeutung, außer ein Konstrukt wie eine
Dynamic Interaction gibt sie ausdrücklich an.

### 3.3 Projekte und mehrere Quelldateien

Eine `.c4ml`-Datei ist bereits ein Projekt. Mehrere Dateien werden durch
`c4ml.project.json` ausdrücklich aufgelistet:

```json
{
  "version": 1,
  "id": "garden-architecture",
  "policy": "governance.c4ml-policy.json",
  "observations": "evidence/local-inventory.c4ml-observations.json",
  "glossary": "knowledge/garden.c4ml-glossary.json",
  "narratives": ["docs/overview.c4ml-narrative.md"],
  "publication": "publication/review.c4ml-publication.json",
  "theme": "presentation/garden.c4ml-theme.json",
  "shapes": "presentation/garden.c4ml-shapes.json",
  "assets": "assets/garden.c4ml-assets.json",
  "sources": ["model/systems.c4ml", "views/context.c4ml"]
}
```

Alle Pfade sind lokal, relativ und ausdrücklich. Globs, Elternpfade, Remote-
Includes und Modulaliase gibt es in Version 1 nicht. Die Zusatzressourcen sind
typisiert, schreibgeschützt und verändern keine Architektursemantik. Die
vollständige Beschreibung steht unter [C4ML-Projekte](projects.md).

## 4. Architekturmodell deklarieren

### 4.1 Personen und Softwaresysteme

```c4ml
model {
  person grower {
    name = "Grower"
    responsibility = "Plans and supervises cultivation cycles."
    classification = external
  }

  system signal-garden {
    name = "Signal Garden"
    responsibility = "Coordinates cultivation plans from environmental signals."
    classification = internal
  }
}
```

Die ID nach der Elementart ist die dauerhafte Identität. `name` darf geändert
werden, ohne Referenzen zu brechen. `responsibility` beschreibt die Aufgabe;
`classification` unterscheidet intern und extern.

### 4.2 Container

```c4ml
container studio-ui inside signal-garden {
  name = "Cultivation Studio"
  responsibility = "Presents plans and accepts cultivation changes."
  technology = "TypeScript web application"
}
```

Ein Container gehört genau einem Softwaresystem und nennt seine Technologie.
`inside` ist semantischer Besitz, keine Layoutanweisung.

### 4.3 Components

```c4ml
component recommendation-engine inside cultivation-api {
  name = "Recommendation Engine"
  responsibility = "Calculates recommendations from observations."
  technology = "Domain service"
}
```

Eine Component gehört genau einem Container.

### 4.4 Code-Elemente

```c4ml
code zone-policy inside recommendation-engine {
  name = "Zone Policy"
  responsibility = "Combines zone constraints into a recommendation."
  code-kind = module
  language = "TypeScript"
}
```

Ein Code-Element gehört genau einer Component. `code-kind` ist ausdrücklich,
damit das Modell nicht auf objektorientierte Klassen beschränkt ist.

### 4.5 Tags, Links und Metadaten

```c4ml
system signal-garden {
  name = "Signal Garden"
  responsibility = "Coordinates cultivation plans."
  classification = internal
  tags = [core, cultivation]
  link handbook {
    label = "Operations handbook"
    url = "https://docs.example.invalid/signal-garden"
  }
  metadata "example.owner" = "Cultivation Platform Team"
}
```

Metadaten ändern keine C4-Kernsemantik. Beispiel-URLs verwenden reservierte
oder ungültige Domains und begründen keine Netzpflicht.

## 5. Beziehungen deklarieren

Beziehungen sind eigenständige gerichtete Deklarationen mit stabiler ID:

```c4ml
relations {
  relation ui-calls-api {
    from = studio-ui
    to = cultivation-api
    intent = "Submits cultivation commands"
    technology = "HTTPS/JSON"
  }
}
```

`intent` beschreibt die Richtung `from` nach `to`. Beziehungen zwischen
Containern benötigen `technology` oder `protocol`. Layoutabhängigkeiten sind
niemals Beziehungen.

## 6. Views deklarieren

Jeder View besitzt stabile ID, C4-Typ, Titel, Zweck, Scope, Zielgruppe und
Legende. `audience = default` und `legend = generated` fordern die C4ML-
Vorgaben ausdrücklich an.

### 6.1 System Landscape

```c4ml
view cultivation-portfolio {
  type = system-landscape
  scope = "Cultivation Operations"
  title = "System Landscape — Cultivation Operations"
  purpose = "Shows the people and systems exchanging cultivation signals."
  audience = default
  legend = generated
}
```

### 6.2 System Context

```c4ml
view signal-context {
  type = system-context
  scope = signal-garden
  title = "System Context — Signal Garden"
  purpose = "Explains who uses Signal Garden and which systems supply it."
  audience = default
  legend = generated
}
```

Der Fokus ist ein Softwaresystem; unmittelbar verbundene Personen und Systeme
sind zulässig, tiefere C4-Ebenen nicht.

### 6.3 Container

```c4ml
view signal-containers {
  type = container
  scope = signal-garden
  title = "Container View — Signal Garden"
  purpose = "Explains deployable responsibilities."
  audience = default
  legend = generated
}
```

### 6.4 Component

```c4ml
view api-components {
  type = component
  scope = cultivation-api
  title = "Component View — Cultivation API"
  purpose = "Explains the parts of the API."
  audience = default
  legend = generated
}
```

### 6.5 Code

```c4ml
view engine-code {
  type = code
  scope = recommendation-engine
  title = "Code View — Recommendation Engine"
  purpose = "Explains important policy calculations."
  audience = default
  legend = generated
}
```

### 6.6 Inhalte auswählen und ausschließen

Automatische View-Auflösung ist Standard. `select` darf eine gültige Projektion
einschränken, aber keine unzulässige C4-Ebene einführen oder das notwendige
Fokuselement entfernen:

```c4ml
select {
  include-elements = auto
  exclude-elements = [seasonal-reporting]
  include-relations = auto
  exclude-relations = []
}
```

### 6.7 Eigene Legenden und Zielgruppen

`audience` kann eine Liste enthalten. Eine eigene `legend` erklärt zusätzliche
visuelle Codierungen; jede nicht standardmäßige Codierung muss in Legende oder
Glossar verständlich sein.

### 6.8 Visual Groups

> **Sprachentwurf:** Der zugrunde liegende Compilervertrag ist vorhanden, die
> folgende `.c4ml`-Syntax aber noch nicht ausführbar oder eingefroren.

Eine Visual Group zeichnet in genau einem View eine benannte Grenze um bereits
sichtbare Elemente. Sie verändert weder C4-Besitz noch Sichtbarkeit:

```c4ml
group cultivation-services {
  title = "Cultivation Services"
  members = [signal-garden, weather-beacon]
  keep-together = true
  padding = 32
}
```

Gruppen bilden einen überlappungsfreien Baum oder Wald. Zyklen, mehrfache
direkte Eltern und überlappende Geschwistermitgliedschaft sind Fehler.

### 6.9 Themes und semantische Farbrollen

Die ausführbare Projektressource `.c4ml-theme.json` wählt `c4ml-blue` oder
`c4ml-garden` und kann geprüfte Farbrollen überschreiben. Elementart und
intern/extern bleiben unabhängig von Farbe in Modell, SVG und Legende sichtbar.
Eine Theme-Grammatik direkt in `.c4ml` ist lediglich Entwurf.

### 6.10 Person- und eigene Shapes

Person verwendet `c4ml-person`, andere Rollen standardmäßig `c4ml-box`. Der
interne Shape-Vertrag kennt eine normalisierte 100×100-Fläche, Inhaltsbox,
Ports `north/east/south/west`, eingeschränkte Primitive und semantische
Farbrollen. Skripte, CSS, Schriften, Filter, Bilder, URLs und beliebiges SVG sind
verboten. `.c4ml-shapes.json` ist ausführbar; eine Shape-Deklaration im
C4ML-Quelltext bleibt Sprachentwurf.

## 7. Dynamic Views

Ein Dynamic View beschreibt ein benanntes Szenario als geordnete Vorkommen
bereits vorhandener statischer Beziehungen:

```c4ml
view revise-plan {
  type = dynamic
  scope = "Revise a cultivation plan"
  title = "Dynamic View — Revise a Cultivation Plan"
  purpose = "Explains the runtime collaboration."
  audience = default
  legend = generated
  display = collaboration

  interaction submit-plan {
    order = 1
    from = studio-ui
    to = cultivation-api
    intent = "Submits the revised cultivation plan"
    relation = ui-calls-api
  }

  interaction store-plan {
    order = 2
    parallel = persist-and-notify
    from = cultivation-api
    to = ledger-store
    intent = "Stores the revised plan"
    relation = api-writes-ledger
  }
}
```

Interaktionen mit derselben `order` sind nur dann parallel, wenn sie dieselbe
nichtleere `parallel`-ID tragen. `display` kann `collaboration` oder `sequence`
sein und ändert die Semantik nicht. Endpunkte sind Softwaresysteme, Container
oder Components. Bewusst gemischte Ebenen benötigen
`allow-mixed-levels = true`.

## 8. Deployment-Modell und Views

### 8.1 Umgebungen und verschachtelte Nodes

```c4ml
deployments {
  environment production {
    name = "Production"
    responsibility = "Runs the live cultivation service."

    node prod-cloud {
      name = "Production Cloud"
      responsibility = "Hosts the live installation."
      technology = "European cloud region"
    }

    node prod-cluster inside prod-cloud {
      name = "Application Cluster"
      responsibility = "Runs services."
      technology = "Kubernetes"
    }

    infrastructure prod-gateway on prod-cloud {
      name = "Edge Gateway"
      responsibility = "Terminates public HTTPS traffic."
      technology = "Managed application gateway"
    }
  }
}
```

`inside` verschachtelt Deployment Nodes, `on` platziert Infrastruktur. Besitz
und Laufzeitplatzierung bleiben damit sichtbar verschieden.

### 8.2 Referenzen und Instanzen

```c4ml
deployments {
  environment production {
    system-instance prod-system of signal-garden on prod-cloud
    container-instance prod-ui of studio-ui on prod-cluster
    container-instance prod-api of cultivation-api on prod-cluster

    deployment-relation prod-ui-api {
      from = prod-ui
      to = prod-api
      intent = "Submits cultivation commands"
      relation = ui-calls-api
      technology = "HTTPS/JSON"
    }
  }
}
```

Instanzen referenzieren statische Elemente, definieren sie nicht neu. Mehrere
Instanzen desselben Systems oder Containers sind erlaubt. Eine
Deployment-Beziehung bewahrt oder präzisiert die statische Beziehung.

### 8.3 Deployment View

```c4ml
view production-deployment {
  type = deployment
  environment = production
  systems = [signal-garden]
  title = "Deployment View — Signal Garden Production"
  purpose = "Explains where the live services execute."
  audience = default
  legend = generated
}
```

Der View wählt eine Umgebung und Systeme. Er enthält deren Instanzen, nötige
verschachtelte Nodes und relevante Infrastruktur.

## 9. Layout und Routing

Der erste brauchbare Stand benötigt keinen Layoutblock. Automatisches Layout
erzeugt Kandidatengeometrie, danach wendet C4ML die quellgebundenen Steuerungen
des jeweiligen Views an.

**Arrange element…** zeigt erzeugten C4ML-Block und vollständig kompiliertes
Kandidatendiagramm. **Apply to source** ist ein normaler Monaco-Edit; **Undo
arrangement** nimmt ihn einmal zurück. **Fix exact current position** ist
bewusst die letzte Option.

**Edit route…** bearbeitet Ports und Führungspunkte einer ausgewählten
Verbindung. Vor dem Anwenden kompiliert **Preview route change** das gesamte
Projekt, zeigt sichere Aufräumvorschläge und blockierende Konflikte getrennt.
Zurücksetzen auf automatische Route entfernt überflüssige Führung, bewahrt aber
weiterhin sinnvolle Ports oder Labelpositionen.

### 9.1 Flussrichtung

```c4ml
layout {
  flow = right
}
```

### 9.2 Nach Absicht platzieren, ausrichten und verteilen

```c4ml
layout {
  place grower left-of signal-garden {
    strength = hard
    gap = normal
  }

  align center-y [grower, signal-garden, weather-beacon] {
    anchor = signal-garden
    strength = soft
  }

  distribute horizontal [grower, signal-garden, weather-beacon] {
    gap = normal
    strength = hard
  }
}
```

`place` unterstützt `left-of`, `right-of`, `above`, `below`; `align` unterstützt
Kanten und Mittellinien. `distribute` respektiert Listenreihenfolge und gleichen
Abstand. `tiny`, `small`, `normal`, `large` sind 1, 2, 4 und 8 Schritte; ein
`step` sind 16 Diagrammeinheiten (`du`). Harte Regeln müssen gelten oder mit
allen Konfliktfundstellen scheitern. Weiche Regeln dürfen nur mit Warnung
gelockert werden.

### 9.3 Automatisches Ergebnis verschieben

```c4ml
layout {
  adjust weather-beacon {
    relative-to = automatic
    move = up small
    strength = soft
  }
}
```

Der Offset wird immer vom automatischen Kandidaten berechnet und sammelt sich
nicht über Builds an. `move-x` und `move-y` nehmen vorzeichenbehaftete
`step`- oder `du`-Werte.

### 9.4 Exakte Diagrammkoordinaten fixieren

```c4ml
layout {
  pin signal-garden {
    x = 520du
    y = 240du
    strength = hard
  }
}
```

Ein Pin schaltet automatisches Layout für den Rest nicht ab. Verwende ihn nur,
wenn `place`, `align`, `distribute` und `adjust` die Absicht nicht ausdrücken.

### 9.5 Ports und geführte Routen

Relationship, Anschlusspunkt und Zeichnung sind getrennt:

```text
Quelle -> Quell-Port -> Route -> Ziel-Port -> Ziel
                              -> Pfeilspitze
```

Die Autorenrichtlinie ist `automatic`, `guided` oder `fixed`; der Stil zunächst
`direct` oder `orthogonal`. Eine geführte Route kann so aussehen:

```c4ml
layout {
  route ui-calls-api {
    policy = guided
    style = orthogonal
    source-port = east
    target-port = west
    via = [(520, 260), (520, 410)]
    label-segment = 2
    label-shift = (0, -14)
  }
}
```

Die relative Form verankert Wegpunkte an Ports, Elementseiten oder Canvas:

```c4ml
guide = [
  via source-port shift (36, 0),
  lock canvas at (520, 260) to canvas at (620, 260),
  via element cultivation-api north shift (0, -24),
  via target-port shift (-36, 0)
]
```

Harte Sperrflächen müssen eingehalten werden; weiche dürfen nur mit Diagnose
`C4ML-ROUTE-030` gekreuzt werden:

```c4ml
avoidance service-clearance {
  strength = hard
  around = cultivation-api
  padding = 24
}
```

### 9.6 Benannte Korridore und Spuren

```c4ml
layout {
  corridor data-access-east {
    orientation = vertical
    coordinate = 780
    lanes = 4
    lane-gap = 16
  }

  route api-writes-ledger {
    policy = guided
    style = orthogonal
    corridor = data-access-east
    lane = 1
  }
}
```

Bei vertikaler Orientierung ist `coordinate` x, sonst y. Spuren zählen ab null.
Außerhalb der Kapazität oder doppelt exklusiv belegte Spuren sind Fehler. Harte
geführte und feste Pfade werden zuerst geroutet; ihre Korridore werden Hindernisse
für automatische Pfade. Gemeinsame Stämme benötigen ausdrückliche Autorenschaft.

### 9.7 Feste Routen und gesperrte Segmente

```c4ml
layout {
  route exceptional-export {
    policy = fixed
    style = orthogonal
    points = [(640, 590), (640, 720), (1180, 720), (1180, 460)]
    label-segment = 2
  }
}
```

Erster und letzter Punkt müssen exakt auf den wirksamen Quell-/Zielgrenzen
liegen. Feste Koordinaten sind der letzte Ausweg; Ports, Korridore und relative
Wegpunkte sind robuster. Harte Führung wird niemals still ignoriert oder
herabgestuft. Das Debug-Overlay zeigt Ports, Korridore, Spuren, Wegpunkte,
gesperrte Segmente und gelockerte Regeln.

## 10. Diagnosen

C4ML-Diagnosen enthalten Schweregrad, stabilen Code, knappe Meldung, Datei und
Bereich, verwandte Bereiche und – wo bekannt – eine umsetzbare Korrektur.

Beispiele:

- `C4ML-SEM-002`: doppelte statische Element-ID;
- `C4ML-SEM-007`: ungültiger Component-Besitzer;
- `C4ML-SEM-015`: Containerbeziehung ohne Technologie oder Protokoll;
- `C4ML-DYN-006`: Dynamic Interaction löst keine gerichtete statische
  Beziehung auf;
- `C4ML-VIEW-011`: unzulässige oder unbekannte Auswahl für die C4-Ebene.

Die CLI trennt Quell-, Layout-, Rendering- und Umgebungsfehler. Der Editor zeigt
Diagnosen der aktuellen ungültigen Quelle und behält die letzte gültige
Vorschau.

## 11. Beispieldateien

Ausführbare Originalbeispiele:

- [`hello-context.c4ml`](../../examples/draft/hello-context.c4ml): minimales
  Modell und System Context;
- [`hello-container.c4ml`](../../examples/draft/hello-container.c4ml):
  Containerbesitz, Technologien und Protokolle;
- [`hello-static-zoom.c4ml`](../../examples/draft/hello-static-zoom.c4ml):
  vollständige statische Hierarchie und mehrere Views;
- [`hello-dynamic.c4ml`](../../examples/draft/hello-dynamic.c4ml): System
  Landscape und geordnete/parallele Interaktionen;
- [`hello-deployment.c4ml`](../../examples/draft/hello-deployment.c4ml):
  Umgebungen, Instanzen und Deployment View;
- [`signal-garden.c4ml`](../../examples/draft/signal-garden.c4ml): größeres
  Modell mit allen sieben Sichttypen.

Nicht ausführbare, getrennte Sprachvorschauen:

- [`signal-garden-language-preview.md`](../../examples/draft/signal-garden-language-preview.md):
  Tags, Visual Groups und View-Darstellung;
- [`shape-marker.c4ml`](../../examples/draft/shape-marker.c4ml): vorgeschlagene
  Quellnotation zum eingeschränkten Shape-Vertrag.

## 12. Grundsätze zur Prüfung

1. Ist ein gemeinsames C4-Modell ohne versteckte Vorgaben lesbar?
2. Sind Besitz, Deployment-Platzierung, View-Auswahl und Layout unterscheidbar?
3. Bleiben stabile IDs bei grafischer Bearbeitung erhalten?
4. Kann ein künftiger Formatter Bedeutung unverändert reproduzieren?
5. Liefert unvollständige Eingabe hilfreiche Diagnosen mit Fundstellen?
6. Sind automatisches Layout und genaue manuelle Kontrolle ausdrückbar?
7. Bleiben künftige Source-Edits klein, ausdrücklich und rückgängig machbar?

## 13. Respekt vor verwandten Projekten

C4ML steht in einem Feld, das vom C4-Modell sowie Werkzeugen und Forschung wie
PlantUML, Structurizr, Mermaid, LikeC4, D2, Graphviz, ELK und Penrose geprägt
ist. Sie liefern wertvolle öffentliche Hinweise auf Nutzerbedürfnisse.

C4ML kopiert oder übersetzt weder Code, Grammatik, Dokumentation,
Beispielmodelle noch visuelle Identität anderer Projekte. Es untersucht
allgemeine Fähigkeiten und dokumentierte Abläufe und entwickelt daraus eigene
Semantik, Sprache, Beispiele, Oberfläche, Themes und Implementierung. Die
Herkunft der allgemeinen Konzepte und Primärquellen dokumentiert die
[technische Spezifikation](../engineering/specification.md).
