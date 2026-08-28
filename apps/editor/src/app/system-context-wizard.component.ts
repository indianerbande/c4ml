import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
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
import { WorkbenchLocalizationService } from "./workbench-localization.js";

@Component({
  selector: "c4ml-system-context-wizard",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./system-context-wizard.component.html",
  styleUrl: "./system-context-wizard.component.css",
})
export class SystemContextWizardComponent {
  readonly applied = output<string>();
  readonly cancelled = output<void>();
  readonly compiler = inject(CompilerWorkerClient);
  readonly i18n = inject(WorkbenchLocalizationService);
  readonly step = signal(0);
  readonly answers = signal<C4mlSystemContextWizardAnswers>({
    ...defaultSystemContextWizardAnswers,
    parts: defaultSystemContextWizardAnswers.parts.map((part) => ({ ...part })),
    connections: defaultSystemContextWizardAnswers.connections.map(
      (connection) => ({ ...connection }),
    ),
  });
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
    this.compiler.generateSystemContext(this.answers());
  }

  selectViewKind(viewKind: C4mlArchitectureWizardViewKind): void {
    this.answers.update((answers) => {
      const systemSlug = slug(answers.systemName, "application");
      return {
        ...answers,
        viewKind,
        viewId: `${systemSlug}-${viewKind === "container" ? "containers" : "context"}`,
        viewTitle:
          viewKind === "container"
            ? `Container View — ${answers.systemName}`
            : `System Context — ${answers.systemName}`,
        viewPurpose:
          viewKind === "container"
            ? `Show what runs inside ${answers.systemName} and how the parts communicate.`
            : `Show who uses ${answers.systemName} and why.`,
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
      return {
        ...answers,
        systemName: name,
        systemId,
        relationshipId: `${answers.personId}-uses-${systemId}`,
        viewId: `${systemId}-${suffix}`,
        viewTitle:
          answers.viewKind === "container"
            ? `Container View — ${name}`
            : `System Context — ${name}`,
        viewPurpose:
          answers.viewKind === "container"
            ? `Show what runs inside ${name} and how the parts communicate.`
            : `Show who uses ${name} and why.`,
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
      return {
        ...answers,
        parts: [
          ...answers.parts,
          {
            id: `running-part-${number}`,
            name: `Running part ${number}`,
            responsibility: "Describe the one job this part performs.",
            technology: "Runtime or data technology",
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
      return {
        ...answers,
        connections: [
          ...answers.connections,
          {
            id: `${fromId}-to-${toId}-${answers.connections.length + 1}`,
            fromId,
            toId,
            intent: "Describe what is requested or transferred.",
            protocol: "Protocol or communication mechanism",
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
      this.applied.emit(state.source);
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

  #scheduleGeneration(): void {
    if (this.#generationTimer !== undefined) {
      clearTimeout(this.#generationTimer);
    }
    this.#generationTimer = setTimeout(() => {
      this.compiler.generateSystemContext(this.answers());
    }, 90);
  }
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
