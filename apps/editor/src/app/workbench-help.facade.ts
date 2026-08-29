import { Injectable, computed, inject, signal } from "@angular/core";

import type { C4mlHelpTopicId } from "@c4ml/language-c4ml";

import { CompilerWorkerClient } from "./compiler-worker-client.service.js";
import { helpCategories, helpTopic } from "./help-content.js";
import { WorkbenchLocalizationService } from "./workbench-localization.js";
import { WorkbenchSessionService } from "./workbench-session.service.js";

@Injectable({ providedIn: "root" })
export class WorkbenchHelpFacade {
  readonly query = signal("");
  readonly activeTopicId = signal<C4mlHelpTopicId>("getting-started");
  readonly pane = signal<"diagram" | "help">("diagram");

  readonly #compiler = inject(CompilerWorkerClient);
  readonly #i18n = inject(WorkbenchLocalizationService);
  readonly #session = inject(WorkbenchSessionService);

  readonly categories = computed(() =>
    helpCategories(this.#i18n.language(), this.query()),
  );
  readonly activeTopic = computed(() =>
    helpTopic(this.#i18n.language(), this.activeTopicId()),
  );
  readonly contextTopic = computed(() =>
    helpTopic(this.#i18n.language(), this.#compiler.help().topicId),
  );

  setQuery(query: string): void {
    this.query.set(query);
  }

  openTopic(topicId: C4mlHelpTopicId): void {
    this.activeTopicId.set(topicId);
    this.pane.set("help");
  }

  openContext(): void {
    this.#session.setActivity("help");
    this.openTopic(this.#compiler.help().topicId);
  }

  showDiagram(): void {
    this.pane.set("diagram");
  }
}
