import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from "@angular/core";

import type {
  WorkbenchColorScheme,
  WorkbenchEditorFontFamily,
  WorkbenchUiLanguage,
} from "./workbench-preferences.js";
import { WorkbenchLocalizationService } from "./workbench-localization.js";
import { WorkbenchPreferencesService } from "./workbench-preferences.service.js";

type SettingsCategoryId = "appearance" | "source-editor";

interface SettingsCategory {
  readonly id: SettingsCategoryId;
  readonly label: string;
  readonly description: string;
}

interface ColorSchemeOption {
  readonly id: WorkbenchColorScheme;
  readonly label: string;
  readonly hint: string;
}

@Component({
  selector: "c4ml-settings-panel",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./settings-panel.component.html",
  styleUrl: "./settings-panel.component.css",
})
export class SettingsPanelComponent {
  readonly preferences = inject(WorkbenchPreferencesService);
  readonly i18n = inject(WorkbenchLocalizationService);
  readonly closed = output<void>();
  readonly categories = computed<readonly SettingsCategory[]>(() => [
    {
      id: "appearance",
      label: this.i18n.t("settings.appearance"),
      description: this.i18n.t("settings.appearanceHint"),
    },
    {
      id: "source-editor",
      label: this.i18n.t("settings.sourceEditor"),
      description: this.i18n.t("settings.sourceEditorHint"),
    },
  ]);
  readonly colorSchemeOptions = computed<readonly ColorSchemeOption[]>(() => [
    {
      id: "system",
      label: this.i18n.t("settings.system"),
      hint: this.i18n.t("settings.systemHint"),
    },
    {
      id: "light",
      label: this.i18n.t("settings.light"),
      hint: this.i18n.t("settings.lightHint"),
    },
    {
      id: "dark",
      label: this.i18n.t("settings.dark"),
      hint: this.i18n.t("settings.darkHint"),
    },
  ]);
  readonly activeCategory = signal<SettingsCategoryId>("appearance");
  readonly closeButton = viewChild.required<ElementRef<HTMLButtonElement>>(
    "closeButton",
  );
  readonly dialog = viewChild.required<ElementRef<HTMLElement>>("dialog");

  constructor() {
    afterNextRender(() => this.closeButton().nativeElement.focus());
  }

  close(): void {
    this.closed.emit();
  }

  selectCategory(category: SettingsCategoryId): void {
    this.activeCategory.set(category);
  }

  setColorScheme(colorScheme: WorkbenchColorScheme): void {
    this.preferences.setColorScheme(colorScheme);
  }

  setLanguage(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }
    this.preferences.setUiLanguage(target.value as WorkbenchUiLanguage);
  }

  setFontFamily(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }
    this.preferences.setEditorFontFamily(
      target.value as WorkbenchEditorFontFamily,
    );
  }

  setFontSize(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    this.preferences.setEditorFontSize(target.valueAsNumber);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      return;
    }
    if (event.key !== "Tab") {
      return;
    }
    const focusable = Array.from(
      this.dialog().nativeElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = focusable.at(0);
    const last = focusable.at(-1);
    if (first === undefined || last === undefined) {
      return;
    }
    if (event.shiftKey && this.#documentActiveElement() === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.#documentActiveElement() === last) {
      event.preventDefault();
      first.focus();
    }
  }

  #documentActiveElement(): Element | null {
    return this.dialog().nativeElement.ownerDocument.activeElement;
  }
}
