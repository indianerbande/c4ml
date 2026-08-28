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
  editorFontFamilyCss,
  loadWorkbenchPreferences,
  normalizeEditorFontSize,
  resolveEffectiveColorScheme,
  storeWorkbenchPreferences,
  type WorkbenchColorScheme,
  type WorkbenchEditorFontFamily,
  type WorkbenchPreferences,
  type WorkbenchUiLanguage,
} from "./workbench-preferences.js";

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
  readonly editorFontSize = computed(
    () => this.preferences().editorFontSize,
  );
  readonly uiLanguage = computed(() => this.preferences().uiLanguage);

  constructor() {
    const mediaQuery = this.#window?.matchMedia(
      "(prefers-color-scheme: dark)",
    );
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
      this.#document.documentElement.lang = preferences.uiLanguage;
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

  setEditorFontFamily(editorFontFamily: WorkbenchEditorFontFamily): void {
    this.preferences.update((preferences) => ({
      ...preferences,
      editorFontFamily,
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
