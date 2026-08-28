import { Injectable, computed, inject } from "@angular/core";

import {
  workbenchMessage,
  type WorkbenchMessageKey,
  type WorkbenchMessageParameters,
} from "./workbench-messages.js";
import { WorkbenchPreferencesService } from "./workbench-preferences.service.js";

@Injectable({ providedIn: "root" })
export class WorkbenchLocalizationService {
  readonly #preferences = inject(WorkbenchPreferencesService);
  readonly language = computed(() => this.#preferences.uiLanguage());

  t(
    key: WorkbenchMessageKey,
    parameters: WorkbenchMessageParameters = {},
  ): string {
    return workbenchMessage(this.language(), key, parameters);
  }
}
