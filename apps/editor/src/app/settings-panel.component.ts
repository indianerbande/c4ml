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
  WorkbenchColorPalette,
  WorkbenchEditorFontFamily,
  WorkbenchUiLanguage,
} from "./workbench-preferences.js";
import {
  workbenchColorPalettes,
  workbenchEditorFontFamilyOptions,
} from "./workbench-preferences.js";
import { WorkbenchLocalizationService } from "./workbench-localization.js";
import { ModalInteractionDirective } from "./modal-interaction.directive.js";
import { WorkbenchPreferencesService } from "./workbench-preferences.service.js";
import {
  c4mlSyntaxThemePresets,
  type C4mlSyntaxThemePreset,
} from "./syntax-theme.js";

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

interface ColorPaletteOption {
  readonly id: WorkbenchColorPalette;
  readonly label: string;
}

interface SyntaxThemeOption {
  readonly id: C4mlSyntaxThemePreset;
  readonly label: string;
}

@Component({
  selector: "c4ml-settings-panel",
  imports: [ModalInteractionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./settings-panel.component.html",
  styleUrl: "./settings-panel.component.css",
})
export class SettingsPanelComponent {
  readonly preferences = inject(WorkbenchPreferencesService);
  readonly i18n = inject(WorkbenchLocalizationService);
  readonly closed = output<void>();
  readonly editorFontFamilyOptions = workbenchEditorFontFamilyOptions;
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
  readonly colorPaletteOptions = computed<readonly ColorPaletteOption[]>(() =>
    workbenchColorPalettes.map((id) => ({
      id,
      label: this.i18n.t(`settings.palette.${id}`),
    })),
  );
  readonly syntaxThemeOptions = computed<readonly SyntaxThemeOption[]>(() =>
    c4mlSyntaxThemePresets.map((id) => ({
      id,
      label: this.i18n.t(`settings.syntaxTheme.${id}`),
    })),
  );
  readonly activeCategory = signal<SettingsCategoryId>("appearance");
  readonly closeButton =
    viewChild.required<ElementRef<HTMLButtonElement>>("closeButton");

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

  setColorPalette(colorPalette: WorkbenchColorPalette): void {
    this.preferences.setColorPalette(colorPalette);
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

  setSyntaxTheme(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }
    this.preferences.setSyntaxTheme(target.value as C4mlSyntaxThemePreset);
  }

  setFontLigatures(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    this.preferences.setEditorFontLigatures(target.checked);
  }

  setInterfaceFontSize(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    this.preferences.setInterfaceFontSize(target.valueAsNumber);
  }

  setFontSize(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    this.preferences.setEditorFontSize(target.valueAsNumber);
  }

}
