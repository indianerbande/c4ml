import { Injectable, computed, inject, signal } from "@angular/core";

import {
  filterWorkbenchCommands,
  type WorkbenchCommand,
} from "./workbench-command.js";
import { WorkbenchDocumentFacade } from "./workbench-document.facade.js";
import { WorkbenchPreferencesService } from "./workbench-preferences.service.js";

@Injectable({ providedIn: "root" })
export class WorkbenchCommandFacade {
  readonly open = signal(false);
  readonly query = signal("");

  readonly #documents = inject(WorkbenchDocumentFacade);
  readonly #preferences = inject(WorkbenchPreferencesService);

  readonly commands = computed<readonly WorkbenchCommand[]>(() =>
    filterWorkbenchCommands(
      this.query(),
      this.#documents.desktopAvailable,
      this.#preferences.uiLanguage(),
    ),
  );

  show(): void {
    this.query.set("");
    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
    this.query.set("");
  }

  setQuery(query: string): void {
    this.query.set(query);
  }
}
