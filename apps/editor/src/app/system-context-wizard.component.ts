import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from "@angular/core";

import {
  defaultSystemContextWizardAnswers,
  type C4mlArchitectureConnectionAnswer,
  type C4mlArchitecturePartAnswer,
  type C4mlArchitectureWizardViewKind,
  type C4mlSystemContextWizardAnswers,
  type C4mlSystemContextWizardField,
} from "@c4ml/language-c4ml";

import { CompilerWorkerClient } from "./compiler-worker-client.service.js";
import type { CompilerWorkerProject } from "./compiler-worker.compile.protocol.js";
import { WorkbenchLocalizationService } from "./workbench-localization.js";
import type { WorkbenchUiLanguage } from "./workbench-preferences.js";

@Component({
  selector: "c4ml-system-context-wizard",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./system-context-wizard.component.html",
  styleUrl: "./system-context-wizard.component.css",
})
export class SystemContextWizardComponent {
  readonly extensionProject = input<CompilerWorkerProject | undefined>();
  readonly extensionFile = input<string | undefined>();
  readonly applied = output<{ readonly mode: "extend" | "new"; readonly source: string }>();
  readonly cancelled = output<void>();
  readonly compiler = inject(CompilerWorkerClient);
  readonly i18n = inject(WorkbenchLocalizationService);
  readonly step = signal(0);
  readonly mode = signal<"extend" | "new">("new");
  readonly extensionAvailable = computed(
    () => this.extensionProject() !== undefined && this.extensionFile() !== undefined,
  );
  readonly answers = signal<C4mlSystemContextWizardAnswers>(
    initialWizardAnswers(this.i18n.language()),
  );
  readonly openHelp = signal<string | undefined>(undefined);
  readonly lastStep = computed(() =>
    this.answers().viewKind === "container" ? 4 : 3,
  );
  readonly progress = computed(() => {
    const labels = [
      this.i18n.t("wizard.step.goal"),
      this.i18n.t("wizard.step.application"),
      this.i18n.t("wizard.step.people"),
    ];
    if (this.answers().viewKind === "container") {
      labels.push(this.i18n.t("wizard.step.parts"));
    }
    labels.push(this.i18n.t("wizard.step.connections"));
    return labels;
  });

  #generationTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.#generationTimer !== undefined) {
        clearTimeout(this.#generationTimer);
      }
    });
    this.#generate();
  }

  selectMode(mode: "extend" | "new"): void {
    if (mode === "extend" && !this.extensionAvailable()) return;
    this.mode.set(mode);
    this.#generate();
  }

  selectViewKind(viewKind: C4mlArchitectureWizardViewKind): void {
    this.answers.update((answers) => {
      const systemSlug = slug(answers.systemName, "application");
      const viewCopy = localizedViewCopy(
        this.i18n.language(),
        viewKind,
        answers.systemName,
      );
      return {
        ...answers,
        viewKind,
        viewId: `${systemSlug}-${viewKind === "container" ? "containers" : "context"}`,
        ...viewCopy,
      };
    });
    this.step.set(Math.min(this.step(), viewKind === "container" ? 4 : 3));
    this.#scheduleGeneration();
  }

  updateField(field: C4mlSystemContextWizardField, event: Event): void {
    const value = inputValue(event);
    if (value === undefined) {
      return;
    }
    if (field.includes(".")) {
      return;
    }
    this.answers.update((answers) => ({ ...answers, [field]: value }));
    this.#scheduleGeneration();
  }

  updateSystemName(event: Event): void {
    const name = inputValue(event);
    if (name === undefined) {
      return;
    }
    this.answers.update((answers) => {
      const systemId = slug(name, "application");
      const suffix = answers.viewKind === "container" ? "containers" : "context";
      const viewCopy = localizedViewCopy(
        this.i18n.language(),
        answers.viewKind,
        name,
      );
      return {
        ...answers,
        systemName: name,
        systemId,
        relationshipId: `${answers.personId}-uses-${systemId}`,
        viewId: `${systemId}-${suffix}`,
        ...viewCopy,
      };
    });
    this.#scheduleGeneration();
  }

  updatePersonName(event: Event): void {
    const name = inputValue(event);
    if (name === undefined) {
      return;
    }
    this.answers.update((answers) => {
      const personId = slug(name, "user");
      return {
        ...answers,
        personName: name,
        personId,
        relationshipId: `${personId}-uses-${answers.systemId}`,
      };
    });
    this.#scheduleGeneration();
  }

  updatePart(
    index: number,
    field: keyof C4mlArchitecturePartAnswer,
    event: Event,
  ): void {
    const value = inputValue(event);
    if (value === undefined) {
      return;
    }
    this.answers.update((answers) => {
      const existing = answers.parts[index];
      if (existing === undefined) {
        return answers;
      }
      const nextId = field === "name" ? slug(value, `part-${index + 1}`) : undefined;
      const part = {
        ...existing,
        [field]: value,
        ...(nextId === undefined ? {} : { id: nextId }),
      };
      const parts = answers.parts.map((candidate, candidateIndex) =>
        candidateIndex === index ? part : candidate,
      );
      if (nextId === undefined || nextId === existing.id) {
        return { ...answers, parts };
      }
      return {
        ...answers,
        parts,
        entryPartId:
          answers.entryPartId === existing.id ? nextId : answers.entryPartId,
        connections: answers.connections.map((connection) => ({
          ...connection,
          fromId: connection.fromId === existing.id ? nextId : connection.fromId,
          toId: connection.toId === existing.id ? nextId : connection.toId,
        })),
      };
    });
    this.#scheduleGeneration();
  }

  addPart(): void {
    this.answers.update((answers) => {
      const number = answers.parts.length + 1;
      const german = this.i18n.language() === "de";
      return {
        ...answers,
        parts: [
          ...answers.parts,
          {
            id: `running-part-${number}`,
            name: german ? `Laufender Teil ${number}` : `Running part ${number}`,
            responsibility: german
              ? "Beschreibe die eine Aufgabe dieses Teils."
              : "Describe the one job this part performs.",
            technology: german
              ? "Laufzeit- oder Datentechnologie"
              : "Runtime or data technology",
          },
        ],
      };
    });
    this.#scheduleGeneration();
  }

  removePart(index: number): void {
    this.answers.update((answers) => {
      const removed = answers.parts[index];
      if (removed === undefined || answers.parts.length === 1) {
        return answers;
      }
      const parts = answers.parts.filter((_, candidate) => candidate !== index);
      return {
        ...answers,
        parts,
        entryPartId:
          answers.entryPartId === removed.id
            ? (parts[0]?.id ?? "")
            : answers.entryPartId,
        connections: answers.connections.filter(
          ({ fromId, toId }) => fromId !== removed.id && toId !== removed.id,
        ),
      };
    });
    this.#scheduleGeneration();
  }

  selectEntryPart(event: Event): void {
    this.updateField("entryPartId", event);
  }

  updateConnection(
    index: number,
    field: keyof C4mlArchitectureConnectionAnswer,
    event: Event,
  ): void {
    const value = inputValue(event);
    if (value === undefined) {
      return;
    }
    this.answers.update((answers) => {
      const existing = answers.connections[index];
      if (existing === undefined) {
        return answers;
      }
      const updated = { ...existing, [field]: value };
      const connection =
        field === "fromId" || field === "toId"
          ? {
              ...updated,
              id: `${updated.fromId}-to-${updated.toId}`,
            }
          : updated;
      return {
        ...answers,
        connections: answers.connections.map((candidate, candidateIndex) =>
          candidateIndex === index ? connection : candidate,
        ),
      };
    });
    this.#scheduleGeneration();
  }

  addConnection(): void {
    this.answers.update((answers) => {
      const fromId = answers.parts[0]?.id ?? "";
      const toId = answers.parts[1]?.id ?? answers.parts[0]?.id ?? "";
      const german = this.i18n.language() === "de";
      return {
        ...answers,
        connections: [
          ...answers.connections,
          {
            id: `${fromId}-to-${toId}-${answers.connections.length + 1}`,
            fromId,
            toId,
            intent: german
              ? "Beschreibe, was angefordert oder übertragen wird."
              : "Describe what is requested or transferred.",
            protocol: german
              ? "Protokoll oder Kommunikationsmechanismus"
              : "Protocol or communication mechanism",
          },
        ],
      };
    });
    this.#scheduleGeneration();
  }

  removeConnection(index: number): void {
    this.answers.update((answers) => ({
      ...answers,
      connections: answers.connections.filter(
        (_, candidate) => candidate !== index,
      ),
    }));
    this.#scheduleGeneration();
  }

  previous(): void {
    this.step.update((step) => Math.max(0, step - 1));
  }

  next(): void {
    this.step.update((step) => Math.min(this.lastStep(), step + 1));
  }

  cancel(): void {
    this.cancelled.emit();
  }

  apply(): void {
    const state = this.compiler.wizard();
    if (state.phase === "valid" && state.source !== undefined) {
      this.applied.emit({ mode: this.mode(), source: state.source });
    }
  }

  issueFor(field: C4mlSystemContextWizardField): string | undefined {
    return this.compiler.wizard().issues.find((issue) => issue.field === field)
      ?.message;
  }

  partIssue(
    index: number,
    field: keyof C4mlArchitecturePartAnswer,
  ): string | undefined {
    return this.issueFor(`parts.${index}.${field}`);
  }

  connectionIssue(
    index: number,
    field: keyof C4mlArchitectureConnectionAnswer,
  ): string | undefined {
    return this.issueFor(`connections.${index}.${field}`);
  }

  toggleHelp(id: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.openHelp.update((open) => (open === id ? undefined : id));
  }

  #scheduleGeneration(): void {
    if (this.#generationTimer !== undefined) {
      clearTimeout(this.#generationTimer);
    }
    this.#generationTimer = setTimeout(() => {
      this.#generate();
    }, 90);
  }

  #generate(): void {
    const project = this.extensionProject();
    const file = this.extensionFile();
    this.compiler.generateSystemContext(
      this.answers(),
      this.mode() === "extend" && project !== undefined && file !== undefined
        ? { project, file }
        : undefined,
    );
  }
}

function initialWizardAnswers(
  language: WorkbenchUiLanguage,
): C4mlSystemContextWizardAnswers {
  const base = {
    ...defaultSystemContextWizardAnswers,
    parts: defaultSystemContextWizardAnswers.parts.map((part) => ({ ...part })),
    connections: defaultSystemContextWizardAnswers.connections.map(
      (connection) => ({ ...connection }),
    ),
  };
  if (language === "en") {
    return base;
  }
  return {
    ...base,
    personName: "Kundin oder Kunde",
    personResponsibility:
      "Sucht Produkte, gibt Bestellungen auf und prüft den Lieferstatus.",
    systemName: "Onlineshop",
    systemResponsibility:
      "Zeigt Produkte, nimmt Bestellungen entgegen und informiert über den Bestellstatus.",
    relationshipIntent:
      "Sucht Produkte, bestellt sie und prüft den Bestellstatus.",
    parts: [
      {
        id: "shop-web-interface",
        name: "Shop-Weboberfläche",
        responsibility:
          "Ermöglicht Kunden die Produktsuche, den Warenkorb und die Bestellung.",
        technology: "Webanwendung",
      },
      {
        id: "admin-interface",
        name: "Verwaltungsoberfläche",
        responsibility:
          "Ermöglicht Mitarbeitenden die Verwaltung von Produkten, Bestand und Bestellungen.",
        technology: "Webanwendung",
      },
      {
        id: "shop-service",
        name: "Shop-Dienst",
        responsibility:
          "Verarbeitet Produktanfragen, Warenkörbe und Bestellungen.",
        technology: "Anwendungsdienst",
      },
      {
        id: "order-events",
        name: "Bestellereignisse",
        responsibility:
          "Verteilt Bestellereignisse an nachgelagerte Prozesse.",
        technology: "Apache Kafka",
      },
      {
        id: "shop-database",
        name: "Shop-Datenbank",
        responsibility:
          "Speichert Produkte, Kundenkonten und den Bestellstatus.",
        technology: "PostgreSQL",
      },
      {
        id: "product-media",
        name: "Produktmedien",
        responsibility:
          "Speichert Produktbilder und herunterladbare Dokumente.",
        technology: "S3-kompatibler Objektspeicher",
      },
    ],
    connections: [
      {
        id: "shop-interface-requests-service",
        fromId: "shop-web-interface",
        toId: "shop-service",
        intent: "Fragt Produkte ab und übermittelt Bestellungen",
        protocol: "HTTPS/JSON",
      },
      {
        id: "admin-interface-requests-service",
        fromId: "admin-interface",
        toId: "shop-service",
        intent: "Verwaltet Produkte, Bestand und Bestellungen",
        protocol: "HTTPS/JSON",
      },
      {
        id: "service-publishes-order-events",
        fromId: "shop-service",
        toId: "order-events",
        intent: "Veröffentlicht Bestellereignisse",
        protocol: "Kafka-Protokoll",
      },
      {
        id: "service-reads-shop-database",
        fromId: "shop-service",
        toId: "shop-database",
        intent: "Liest und speichert Produkte, Kunden und Bestellungen",
        protocol: "PostgreSQL-Protokoll",
      },
      {
        id: "service-reads-product-media",
        fromId: "shop-service",
        toId: "product-media",
        intent: "Liest Produktbilder und Dokumente",
        protocol: "S3-API",
      },
    ],
    viewTitle: "Systemkontext — Onlineshop",
    viewPurpose: "Zeigt, wie Kunden den Onlineshop verwenden.",
  };
}

function localizedViewCopy(
  language: WorkbenchUiLanguage,
  viewKind: C4mlArchitectureWizardViewKind,
  systemName: string,
): Pick<C4mlSystemContextWizardAnswers, "viewPurpose" | "viewTitle"> {
  if (language === "de") {
    return viewKind === "container"
      ? {
          viewTitle: `Container-Ansicht — ${systemName}`,
          viewPurpose: `Zeigt, was innerhalb von ${systemName} läuft und wie die Teile miteinander kommunizieren.`,
        }
      : {
          viewTitle: `Systemkontext — ${systemName}`,
          viewPurpose: `Zeigt, wer ${systemName} verwendet und warum.`,
        };
  }
  return viewKind === "container"
    ? {
        viewTitle: `Container View — ${systemName}`,
        viewPurpose: `Show what runs inside ${systemName} and how the parts communicate.`,
      }
    : {
        viewTitle: `System Context — ${systemName}`,
        viewPurpose: `Show who uses ${systemName} and why.`,
      };
}

function inputValue(event: Event): string | undefined {
  const target = event.target;
  return target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
    ? target.value
    : undefined;
}

function slug(value: string, fallback: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return /^[a-z]/u.test(normalized) ? normalized : fallback;
}
