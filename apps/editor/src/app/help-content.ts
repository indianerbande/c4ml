import type {
  C4mlHelpTopicId,
} from "@c4ml/language-c4ml";

import type { WorkbenchUiLanguage } from "./workbench-preferences.js";

type LocalizedText = Readonly<Record<WorkbenchUiLanguage, string>>;

export type HelpCategoryId =
  | "connections"
  | "layout"
  | "model"
  | "output"
  | "start"
  | "views";

interface HelpCategoryDefinition {
  readonly id: HelpCategoryId;
  readonly title: LocalizedText;
}

interface HelpTopicDefinition {
  readonly id: C4mlHelpTopicId;
  readonly categoryId: HelpCategoryId;
  readonly title: LocalizedText;
  readonly summary: LocalizedText;
  readonly paragraphs: readonly LocalizedText[];
  readonly points: readonly LocalizedText[];
  readonly exampleTitle?: LocalizedText;
  readonly example?: string;
  readonly keywords: LocalizedText;
}

export interface HelpCategory {
  readonly id: HelpCategoryId;
  readonly title: string;
  readonly topics: readonly HelpTopic[];
}

export interface HelpTopic {
  readonly id: C4mlHelpTopicId;
  readonly categoryId: HelpCategoryId;
  readonly title: string;
  readonly summary: string;
  readonly paragraphs: readonly string[];
  readonly points: readonly string[];
  readonly exampleTitle: string | undefined;
  readonly example: string | undefined;
  readonly keywords: string;
  readonly status: "available";
}

const categories: readonly HelpCategoryDefinition[] = [
  { id: "start", title: text("First steps", "Erste Schritte") },
  { id: "model", title: text("Architecture model", "Architekturmodell") },
  { id: "connections", title: text("Connections", "Verbindungen") },
  { id: "views", title: text("Views", "Ansichten") },
  { id: "layout", title: text("Layout and routes", "Layout und Routen") },
  { id: "output", title: text("Output", "Ausgabe") },
];

const topics: readonly HelpTopicDefinition[] = [
  {
    id: "getting-started",
    categoryId: "start",
    title: text("Your first diagram", "Dein erstes Diagramm"),
    summary: text(
      "Start with one person, one software system, one relationship, and one view.",
      "Beginne mit einer Person, einem Softwaresystem, einer Verbindung und einer Ansicht.",
    ),
    paragraphs: [
      text(
        "A C4ML document separates the architecture model from the diagrams that show it. Names and responsibilities belong to the model; titles, scope, and layout belong to a view.",
        "Ein C4ML-Dokument trennt das Architekturmodell von den Diagrammen, die es zeigen. Namen und Verantwortungen gehören ins Modell; Titel, Ausschnitt und Layout gehören in eine Ansicht.",
      ),
      text(
        "The current language is draft-1. The handbook marks only syntax that the editor and compiler can execute today.",
        "Die aktuelle Sprache heißt draft-1. Dieses Handbuch zeigt nur Syntax, die Editor und Compiler heute tatsächlich ausführen können.",
      ),
    ],
    points: [
      text("Use stable identifiers without spaces.", "Verwende stabile Kennungen ohne Leerzeichen."),
      text("Describe responsibilities, not feature lists.", "Beschreibe Verantwortungen statt Funktionslisten."),
      text("Give every relationship a clear direction and intent.", "Gib jeder Verbindung eine klare Richtung und Absicht."),
    ],
    exampleTitle: text("Small executable structure", "Kleine ausführbare Struktur"),
    example: `c4ml draft-1
model {
  person gardener {
    name = "Garden Caretaker"
    responsibility = "Plans and reviews garden work."
    classification = external
  }
  system garden-pulse {
    name = "Garden Pulse"
    responsibility = "Turns observations into a shared work plan."
    classification = internal
  }
}
relations {
  relation gardener-reviews-plan {
    from = gardener
    to = garden-pulse
    intent = "Reviews and adjusts the garden work plan"
  }
}
view garden-context {
  type = system-context
  scope = garden-pulse
  title = "System Context — Garden Pulse"
  purpose = "Explain who uses Garden Pulse."
  audience = default
  legend = generated
}`,
    keywords: text("start first diagram document", "start erstes diagramm dokument"),
  },
  {
    id: "model",
    categoryId: "model",
    title: text("Model and stable identities", "Modell und stabile Kennungen"),
    summary: text(
      "Declare architecture once and refer to it from relationships and views.",
      "Deklariere die Architektur einmal und verweise aus Verbindungen und Ansichten darauf.",
    ),
    paragraphs: [
      text(
        "The model block owns People, Software Systems, Containers, Components, and Code Elements. Its identifiers remain stable even when display names change.",
        "Der model-Block enthält Personen, Softwaresysteme, Container, Komponenten und Code-Elemente. Deren Kennungen bleiben stabil, auch wenn sich Anzeigenamen ändern.",
      ),
    ],
    points: [
      text("Source order does not define diagram position.", "Die Reihenfolge im Quelltext legt keine Diagrammposition fest."),
      text("Containment follows the C4 hierarchy.", "Die Verschachtelung folgt der C4-Hierarchie."),
      text("Visual grouping does not change semantic ownership.", "Visuelle Gruppierung ändert keine fachliche Zugehörigkeit."),
    ],
    exampleTitle: text("Model boundary", "Modellgrenze"),
    example: `model {
  person gardener { ... }
  system garden-pulse { ... }
  container planning-api inside garden-pulse { ... }
}`,
    keywords: text("model identity id hierarchy", "modell kennung identität hierarchie"),
  },
  {
    id: "people",
    categoryId: "model",
    title: text("People and roles", "Personen und Rollen"),
    summary: text(
      "Represent a person, role, team, or group that interacts with software.",
      "Stelle eine Person, Rolle, ein Team oder eine Gruppe dar, die mit Software interagiert.",
    ),
    paragraphs: [
      text(
        "A Person usually names a role such as Garden Caretaker, not an individual employee. Classification says whether the role belongs inside or outside the modeled organization.",
        "Eine Person bezeichnet meist eine Rolle wie Gartenbetreuung, nicht einen einzelnen Beschäftigten. classification sagt, ob die Rolle zur betrachteten Organisation gehört.",
      ),
    ],
    points: [
      text("name is the visible label.", "name ist die sichtbare Bezeichnung."),
      text("responsibility states what the role does.", "responsibility beschreibt die Aufgabe der Rolle."),
      text("classification is internal or external.", "classification ist internal oder external."),
    ],
    exampleTitle: text("Person declaration", "Person deklarieren"),
    example: `person caretaker {
  name = "Garden Caretaker"
  responsibility = "Reviews cultivation signals and schedules work."
  classification = external
}`,
    keywords: text("person role team user internal external", "person rolle team nutzer intern extern"),
  },
  {
    id: "systems",
    categoryId: "model",
    title: text("Software systems", "Softwaresysteme"),
    summary: text(
      "Model a software product or platform that people recognize by one name.",
      "Modelliere ein Softwareprodukt oder eine Plattform, die Menschen unter einem Namen kennen.",
    ),
    paragraphs: [
      text(
        "A Software System is the highest software abstraction in C4ML. It may later own separately running Containers.",
        "Ein Softwaresystem ist die höchste Softwareabstraktion in C4ML. Es kann später separat laufende Container enthalten.",
      ),
    ],
    points: [
      text("Use one concise responsibility.", "Verwende eine knappe Verantwortung."),
      text("Mark ownership with internal or external.", "Kennzeichne die Zugehörigkeit mit internal oder external."),
    ],
    exampleTitle: text("Software System declaration", "Softwaresystem deklarieren"),
    example: `system garden-pulse {
  name = "Garden Pulse"
  responsibility = "Turns observations into a shared work plan."
  classification = internal
}`,
    keywords: text("system application product platform", "system anwendung produkt plattform"),
  },
  {
    id: "containers",
    categoryId: "model",
    title: text("Running parts and data stores", "Laufende Teile und Datenspeicher"),
    summary: text(
      "A C4 Container is something that runs or stores data separately; it does not have to be Docker.",
      "Ein C4-Container läuft separat oder speichert Daten; er muss nichts mit Docker zu tun haben.",
    ),
    paragraphs: [
      text(
        "Typical Containers are browser applications, backend services, jobs, message brokers, and databases. Every Container belongs to one Software System and declares its technology.",
        "Typische Container sind Browser-Anwendungen, Backend-Services, Jobs, Message Broker und Datenbanken. Jeder Container gehört zu einem Softwaresystem und nennt seine Technologie.",
      ),
    ],
    points: [
      text("inside selects the owning Software System.", "inside wählt das zugehörige Softwaresystem."),
      text("technology names the runtime or storage technology.", "technology nennt Laufzeit- oder Speichertechnik."),
    ],
    exampleTitle: text("Container declaration", "Container deklarieren"),
    example: `container planning-api inside garden-pulse {
  name = "Planning API"
  responsibility = "Maintains the shared garden work plan."
  technology = "TypeScript service"
}`,
    keywords: text("container service database job runtime technology", "container service datenbank job laufzeit technologie"),
  },
  {
    id: "components-code",
    categoryId: "model",
    title: text("Components and code elements", "Komponenten und Code-Elemente"),
    summary: text(
      "Zoom into one Container with Components and into one Component with Code Elements.",
      "Zoome mit Komponenten in einen Container und mit Code-Elementen in eine Komponente hinein.",
    ),
    paragraphs: [
      text(
        "A Component is a meaningful implementation building block inside one Container. A Code Element belongs to exactly one Component and records an implementation-level kind.",
        "Eine Komponente ist ein bedeutender Implementierungsbaustein in einem Container. Ein Code-Element gehört genau zu einer Komponente und nennt seine Implementierungsart.",
      ),
    ],
    points: [
      text("Components require technology.", "Komponenten benötigen technology."),
      text("Code Elements require code-kind; language is optional.", "Code-Elemente benötigen code-kind; language ist optional."),
    ],
    exampleTitle: text("Two C4 zoom levels", "Zwei C4-Zoomstufen"),
    example: `component scheduler inside planning-api {
  name = "Work Scheduler"
  responsibility = "Orders recommended garden tasks."
  technology = "TypeScript module"
}

code priority-rule inside scheduler {
  name = "Priority Rule"
  responsibility = "Ranks one proposed task."
  code-kind = function
  language = "TypeScript"
}`,
    keywords: text("component code module class function zoom", "komponente code modul klasse funktion zoom"),
  },
  {
    id: "relationships",
    categoryId: "connections",
    title: text("Relationships and interactions", "Verbindungen und Interaktionen"),
    summary: text(
      "Connect architecture elements with a direction and a concrete intent.",
      "Verbinde Architekturelemente mit einer Richtung und einer konkreten Absicht.",
    ),
    paragraphs: [
      text(
        "from is the sender or actor; to is the receiver. intent should read naturally in that direction. Connections between Containers require a protocol or technology.",
        "from ist Absender oder Handelnder; to ist der Empfänger. intent sollte in dieser Richtung natürlich lesbar sein. Verbindungen zwischen Containern benötigen Protokoll oder Technologie.",
      ),
      text(
        "Dynamic interactions reuse static relationships and add an explicit order for one scenario.",
        "Dynamische Interaktionen verwenden statische Verbindungen erneut und ergänzen eine feste Reihenfolge für ein Szenario.",
      ),
    ],
    points: [
      text("Relationships are always directed.", "Verbindungen sind immer gerichtet."),
      text("Layout instructions never create relationships.", "Layoutanweisungen erzeugen niemals Verbindungen."),
    ],
    exampleTitle: text("Directed relationship", "Gerichtete Verbindung"),
    example: `relation caretaker-reviews-plan {
  from = caretaker
  to = garden-pulse
  intent = "Reviews and adjusts the garden work plan"
}`,
    keywords: text("relationship relation from to intent protocol interaction", "verbindung beziehung von nach absicht protokoll interaktion"),
  },
  {
    id: "views",
    categoryId: "views",
    title: text("Views and diagram scope", "Ansichten und Diagrammausschnitt"),
    summary: text(
      "Select one useful projection of the shared architecture model.",
      "Wähle einen nützlichen Ausschnitt aus dem gemeinsamen Architekturmodell.",
    ),
    paragraphs: [
      text(
        "draft-1 executes all seven C4 view types: System Landscape, System Context, Container, Component, Code, Dynamic, and Deployment. The required scope depends on the selected type.",
        "draft-1 führt alle sieben C4-Ansichtstypen aus: System Landscape, System Context, Container, Component, Code, Dynamic und Deployment. Der erforderliche scope hängt vom Typ ab.",
      ),
    ],
    points: [
      text("title says which diagram and scope the reader sees.", "title nennt Diagrammart und Ausschnitt."),
      text("purpose states the question the diagram answers.", "purpose benennt die Frage, die das Diagramm beantwortet."),
      text("Use audience = default and legend = generated for the standard profile.", "Verwende audience = default und legend = generated für das Standardprofil."),
    ],
    exampleTitle: text("System Context View", "System-Context-Ansicht"),
    example: `view garden-context {
  type = system-context
  scope = garden-pulse
  title = "System Context — Garden Pulse"
  purpose = "Explain users and neighboring systems."
  audience = default
  legend = generated
  layout { flow = right }
}`,
    keywords: text("view diagram scope context landscape dynamic", "ansicht diagramm ausschnitt kontext landschaft dynamisch"),
  },
  {
    id: "deployments",
    categoryId: "views",
    title: text("Deployment environments", "Deployment-Umgebungen"),
    summary: text(
      "Show where static systems and Containers run in one environment.",
      "Zeige, wo statische Systeme und Container in einer Umgebung laufen.",
    ),
    paragraphs: [
      text(
        "Deployment Nodes describe execution locations and may be nested. Instances refer back to the static model instead of duplicating it. Infrastructure Nodes represent operational facilities such as brokers or gateways.",
        "Deployment Nodes beschreiben Ausführungsorte und können verschachtelt werden. Instanzen verweisen auf das statische Modell, statt es zu duplizieren. Infrastructure Nodes stehen für betriebliche Einrichtungen wie Broker oder Gateways.",
      ),
    ],
    points: [
      text("One Deployment View selects one environment.", "Eine Deployment-Ansicht wählt genau eine Umgebung."),
      text("systems lists the Software Systems included in the view.", "systems listet die enthaltenen Softwaresysteme."),
    ],
    exampleTitle: text("Environment and instance", "Umgebung und Instanz"),
    example: `deployments {
  environment production {
    name = "Production"
    responsibility = "Runs the live service."
    node regional-cloud {
      name = "Regional Cloud"
      responsibility = "Hosts the application."
      technology = "Managed cloud"
    }
    system-instance garden-live of garden-pulse on regional-cloud
  }
}`,
    keywords: text("deployment environment node instance infrastructure", "deployment umgebung knoten instanz infrastruktur"),
  },
  {
    id: "layout",
    categoryId: "layout",
    title: text("Automatic layout", "Automatisches Layout"),
    summary: text(
      "Choose the main reading direction while leaving geometry to the layout adapter.",
      "Wähle die Hauptleserichtung und überlasse die Geometrie dem Layoutadapter.",
    ),
    paragraphs: [
      text(
        "Layout belongs to a view and never changes architecture semantics. The executable slice currently supports flow in all four cardinal directions.",
        "Layout gehört zu einer Ansicht und verändert niemals die Architektursemantik. Der ausführbare Teil unterstützt derzeit flow in allen vier Himmelsrichtungen.",
      ),
    ],
    points: [
      text("Use right or down for common reading directions.", "Verwende right oder down für übliche Leserichtungen."),
      text("Source declaration order has no layout meaning.", "Die Deklarationsreihenfolge hat keine Layoutbedeutung."),
    ],
    exampleTitle: text("View-local flow", "Ansichtslokale Leserichtung"),
    example: `layout {
  flow = right
}`,
    keywords: text("layout flow automatic direction", "layout fluss automatisch richtung"),
  },
  {
    id: "routes",
    categoryId: "layout",
    title: text("Ports, corridors, and routes", "Ports, Korridore und Routen"),
    summary: text(
      "Keep automatic routing, guide selected decisions, or provide a complete fixed path.",
      "Behalte automatische Routen, führe einzelne Entscheidungen oder gib einen vollständigen festen Pfad vor.",
    ),
    paragraphs: [
      text(
        "A route controls one relationship appearance inside one view. policy is automatic, guided, or fixed; style is direct or orthogonal. Source and target Ports use north, east, south, and west.",
        "Eine route steuert die Darstellung einer Verbindung in genau einer Ansicht. policy ist automatic, guided oder fixed; style ist direct oder orthogonal. Quell- und Ziel-Ports verwenden north, east, south und west.",
      ),
      text(
        "Named corridors reserve parallel lanes and help prevent dense connections from collapsing into a line web.",
        "Benannte Korridore reservieren parallele Spuren und verhindern, dass dichte Verbindungen zu einem Liniennetz zusammenfallen.",
      ),
    ],
    points: [
      text("guided may set Ports, via points, corridor, and lane.", "guided kann Ports, via-Punkte, Korridor und Spur setzen."),
      text("fixed requires the complete points list.", "fixed benötigt die vollständige points-Liste."),
      text("Hard impossible routes fail visibly.", "Nicht erfüllbare feste Routen schlagen sichtbar fehl."),
    ],
    exampleTitle: text("Guided orthogonal route", "Geführte orthogonale Route"),
    example: `corridor lower-entry {
  orientation = vertical
  coordinate = 687
  lanes = 3
  lane-gap = 18
}

route sensor-publishes-observations {
  policy = guided
  style = orthogonal
  source-port = east
  target-port = west
  corridor = lower-entry
  lane = 1
  label-shift = (0, 16)
}`,
    keywords: text("route port connector corridor lane waypoint guided fixed", "route port connector korridor spur wegpunkt geführt fest"),
  },
  {
    id: "export",
    categoryId: "output",
    title: text("SVG and PNG export", "SVG- und PNG-Export"),
    summary: text(
      "Export the active diagram as canonical SVG or derived PNG.",
      "Exportiere das aktive Diagramm als kanonisches SVG oder abgeleitetes PNG.",
    ),
    paragraphs: [
      text(
        "SVG is the canonical vector result. PNG is rendered locally from that same SVG without another layout pass. Diagram geometry and text therefore remain aligned across formats.",
        "SVG ist das kanonische Vektorergebnis. PNG wird lokal aus genau diesem SVG erzeugt, ohne einen weiteren Layoutlauf. Geometrie und Text bleiben deshalb in beiden Formaten gleich.",
      ),
    ],
    points: [
      text("Use the Output activity area for exports.", "Verwende den Bereich Ausgabe für Exporte."),
      text("Desktop PNG supports 1x, 2x, and 3x resolution.", "Desktop-PNG unterstützt die Auflösungen 1x, 2x und 3x."),
      text("Export never changes the source document.", "Ein Export verändert niemals das Quelldokument."),
    ],
    exampleTitle: text("Experimental command line", "Experimentelle Kommandozeile"),
    example: `pnpm run c4ml -- render architecture.c4ml \\
  --view garden-context \\
  --format svg,png \\
  --output build/diagrams`,
    keywords: text("output export svg png cli", "ausgabe export svg png kommandozeile"),
  },
];

export function helpTopic(
  language: WorkbenchUiLanguage,
  id: C4mlHelpTopicId,
): HelpTopic {
  const definition = topics.find((topic) => topic.id === id);
  if (definition === undefined) {
    throw new Error(`Unknown help topic: ${id}`);
  }
  return localizeTopic(language, definition);
}

export function helpCategories(
  language: WorkbenchUiLanguage,
  query = "",
): readonly HelpCategory[] {
  const terms = query
    .trim()
    .toLocaleLowerCase(language === "de" ? "de-DE" : "en-US")
    .split(/\s+/u)
    .filter((term) => term.length > 0);
  return categories.flatMap((category) => {
    const localizedTopics = topics
      .filter(({ categoryId }) => categoryId === category.id)
      .map((topic) => localizeTopic(language, topic))
      .filter((topic) => {
        const haystack = `${topic.title} ${topic.summary} ${topic.keywords}`
          .toLocaleLowerCase(language === "de" ? "de-DE" : "en-US");
        return terms.every((term) => haystack.includes(term));
      });
    return localizedTopics.length === 0
      ? []
      : [{ id: category.id, title: category.title[language], topics: localizedTopics }];
  });
}

function localizeTopic(
  language: WorkbenchUiLanguage,
  topic: HelpTopicDefinition,
): HelpTopic {
  return {
    id: topic.id,
    categoryId: topic.categoryId,
    title: topic.title[language],
    summary: topic.summary[language],
    paragraphs: topic.paragraphs.map((paragraph) => paragraph[language]),
    points: topic.points.map((point) => point[language]),
    exampleTitle: topic.exampleTitle?.[language],
    example: topic.example,
    keywords: topic.keywords[language],
    status: "available",
  };
}

function text(en: string, de: string): LocalizedText {
  return { en, de };
}
