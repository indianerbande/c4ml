import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  output,
  signal,
} from "@angular/core";

import {
  defaultSystemContextWizardAnswers,
  type C4mlSystemContextWizardAnswers,
  type C4mlSystemContextWizardField,
} from "@c4ml/language-c4ml";

import { CompilerWorkerClient } from "./compiler-worker-client.service.js";

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
  readonly step = signal(0);
  readonly answers = signal<C4mlSystemContextWizardAnswers>({
    ...defaultSystemContextWizardAnswers,
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

  updateField(field: C4mlSystemContextWizardField, event: Event): void {
    const target = event.target;
    if (
      !(target instanceof HTMLInputElement) &&
      !(target instanceof HTMLSelectElement) &&
      !(target instanceof HTMLTextAreaElement)
    ) {
      return;
    }
    this.answers.update((answers) => ({
      ...answers,
      [field]: target.value,
    }) as C4mlSystemContextWizardAnswers);
    this.#scheduleGeneration();
  }

  previous(): void {
    this.step.update((step) => Math.max(0, step - 1));
  }

  next(): void {
    this.step.update((step) => Math.min(2, step + 1));
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

  #scheduleGeneration(): void {
    if (this.#generationTimer !== undefined) {
      clearTimeout(this.#generationTimer);
    }
    this.#generationTimer = setTimeout(() => {
      this.compiler.generateSystemContext(this.answers());
    }, 90);
  }
}
