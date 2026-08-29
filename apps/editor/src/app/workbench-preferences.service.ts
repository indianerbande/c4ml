import { DOCUMENT } from "@angular/common";
import {
  DestroyRef,
  Injectable,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";

import {
  defaultWorkbenchPreferences,
  editorFontFeatureSettingsCss,
  editorFontFamilyCss,
  editorFontLigaturesOption,
  loadWorkbenchPreferences,
  normalizeEditorFontSize,
  normalizeInterfaceFontSize,
  resolveEffectiveColorScheme,
  storeWorkbenchPreferences,
  type WorkbenchColorScheme,
  type WorkbenchColorPalette,
  type WorkbenchEditorFontFamily,
  type WorkbenchPreferences,
  type WorkbenchUiLanguage,
} from "./workbench-preferences.js";
import type { C4mlSyntaxThemePreset } from "./syntax-theme.js";

@Injectable({ providedIn: "root" })
export class WorkbenchPreferencesService {
  readonly #document = inject(DOCUMENT);
  readonly #destroyRef = inject(DestroyRef);
  readonly #window = this.#document.defaultView;
  readonly #systemPrefersDark = signal(this.#readSystemPreference());
  readonly preferences = signal<WorkbenchPreferences>(this.#load());
  readonly effectiveColorScheme = computed(() =>
    resolveEffectiveColorScheme(
      this.preferences().colorScheme,
      this.#systemPrefersDark(),
    ),
  );
  readonly editorFontFamilyCss = computed(() =>
    editorFontFamilyCss(this.preferences().editorFontFamily),
  );
  readonly editorFontLigatures = computed(() =>
    editorFontLigaturesOption(
      this.preferences().editorFontFamily,
      this.preferences().editorFontLigatures,
    ),
  );
  readonly editorFontFeatureSettingsCss = computed(() =>
    editorFontFeatureSettingsCss(
      this.preferences().editorFontFamily,
      this.preferences().editorFontLigatures,
    ),
  );
  readonly editorFontSize = computed(() => this.preferences().editorFontSize);
  readonly interfaceFontSize = computed(
    () => this.preferences().interfaceFontSize,
  );
  readonly uiLanguage = computed(() => this.preferences().uiLanguage);

  constructor() {
    const mediaQuery = this.#window?.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemSchemeChange = (event: MediaQueryListEvent): void => {
      this.#systemPrefersDark.set(event.matches);
    };
    mediaQuery?.addEventListener("change", handleSystemSchemeChange);
    this.#destroyRef.onDestroy(() =>
      mediaQuery?.removeEventListener("change", handleSystemSchemeChange),
    );

    effect(() => {
      const preferences = this.preferences();
      const effectiveColorScheme = this.effectiveColorScheme();
      this.#document.documentElement.dataset["colorScheme"] =
        effectiveColorScheme;
      this.#document.documentElement.dataset["colorPalette"] =
        preferences.colorPalette;
      this.#document.documentElement.lang = preferences.uiLanguage;
      this.#document.documentElement.style.setProperty(
        "--c4ml-interface-font-size",
        `${preferences.interfaceFontSize}px`,
      );
      storeWorkbenchPreferences(this.#readStorage(), preferences);
    });
  }

  setUiLanguage(uiLanguage: WorkbenchUiLanguage): void {
    this.preferences.update((preferences) => ({
      ...preferences,
      uiLanguage,
    }));
  }

  setColorScheme(colorScheme: WorkbenchColorScheme): void {
    this.preferences.update((preferences) => ({
      ...preferences,
      colorScheme,
    }));
  }

  setColorPalette(colorPalette: WorkbenchColorPalette): void {
    this.preferences.update((preferences) => ({
      ...preferences,
      colorPalette,
    }));
  }

  setSyntaxTheme(syntaxTheme: C4mlSyntaxThemePreset): void {
    this.preferences.update((preferences) => ({
      ...preferences,
      syntaxTheme,
    }));
  }

  setEditorFontFamily(editorFontFamily: WorkbenchEditorFontFamily): void {
    this.preferences.update((preferences) => ({
      ...preferences,
      editorFontFamily,
    }));
  }

  setEditorFontLigatures(editorFontLigatures: boolean): void {
    this.preferences.update((preferences) => ({
      ...preferences,
      editorFontLigatures,
    }));
  }

  setInterfaceFontSize(interfaceFontSize: number): void {
    this.preferences.update((preferences) => ({
      ...preferences,
      interfaceFontSize: normalizeInterfaceFontSize(interfaceFontSize),
    }));
  }

  setEditorFontSize(editorFontSize: number): void {
    this.preferences.update((preferences) => ({
      ...preferences,
      editorFontSize: normalizeEditorFontSize(editorFontSize),
    }));
  }

  reset(): void {
    this.preferences.set(defaultWorkbenchPreferences);
  }

  #load(): WorkbenchPreferences {
    return loadWorkbenchPreferences(this.#readStorage());
  }

  #readSystemPreference(): boolean {
    return (
      this.#window?.matchMedia("(prefers-color-scheme: dark)").matches ?? false
    );
  }

  #readStorage(): Storage | undefined {
    try {
      return this.#window?.localStorage;
    } catch {
      return undefined;
    }
  }
}
