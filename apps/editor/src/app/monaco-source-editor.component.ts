import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  signal,
  viewChild,
} from "@angular/core";
import type { AfterViewInit, OnDestroy } from "@angular/core";
import type {
  editor as MonacoEditor,
  languages as MonacoLanguages,
} from "monaco-editor/editor";

import type { CompilerWorkerDiagnostic } from "./compiler-worker.protocol.js";
import {
  c4mlDaySuggestionColors,
  c4mlNightSuggestionColors,
} from "./monaco-theme.js";
import type { EffectiveColorScheme } from "./workbench-preferences.js";
import {
  sourceEditorCompletion,
  sourceEditorMarkers,
  sourceEditorSemanticTokens,
  sourceEditorSemanticTokenTypes,
  type SourceEditorCompletionProvider,
  type SourceEditorHighlightProvider,
} from "./source-editor.contract.js";

const c4mlLanguageId = "c4ml";
const markerOwner = "c4ml-compiler";
type MonacoRuntime = typeof import("./monaco-source-editor.runtime.js");

export interface SourceEditorSelection {
  readonly startOffset: number;
  readonly endOffset: number;
}

globalThis.MonacoEnvironment = {
  getWorker: () =>
    new Worker(new URL("./monaco-editor.worker", import.meta.url), {
      name: "c4ml-monaco-editor",
      type: "module",
    }),
};

@Component({
  selector: "c4ml-monaco-source-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #editorHost class="monaco-host"></div>
    @if (loadFailure(); as message) {
      <p class="load-failure" role="alert">{{ message }}</p>
    }
  `,
  styleUrl: "./monaco-source-editor.component.css",
})
export class C4mlMonacoSourceEditorComponent
  implements AfterViewInit, OnDestroy
{
  readonly value = input.required<string>();
  readonly diagnostics = input<readonly CompilerWorkerDiagnostic[]>([]);
  readonly completionProvider =
    input.required<SourceEditorCompletionProvider>();
  readonly highlightProvider = input.required<SourceEditorHighlightProvider>();
  readonly colorScheme = input.required<EffectiveColorScheme>();
  readonly editorFontFamily = input.required<string>();
  readonly editorFontLigatures = input.required<boolean | string>();
  readonly editorFontSize = input.required<number>();
  readonly valueChanged = output<string>();
  readonly selectionChanged = output<SourceEditorSelection>();
  readonly loadFailure = signal<string | undefined>(undefined);
  readonly editorHost =
    viewChild.required<ElementRef<HTMLDivElement>>("editorHost");

  #editor: MonacoEditor.IStandaloneCodeEditor | undefined;
  #model: MonacoEditor.ITextModel | undefined;
  #completionRegistration: { dispose(): void } | undefined;
  #highlightRegistration: { dispose(): void } | undefined;
  #synchronizeExternalValue = false;
  #destroyed = false;
  #runtime: MonacoRuntime | undefined;

  constructor() {
    effect(() => {
      const value = this.value();
      const model = this.#model;
      if (model === undefined || model.getValue() === value) {
        return;
      }
      this.#synchronizeExternalValue = true;
      model.setValue(value);
      this.#synchronizeExternalValue = false;
    });

    effect(() => {
      const diagnostics = this.diagnostics();
      const model = this.#model;
      if (model === undefined) {
        return;
      }
      this.#setMarkers(diagnostics);
    });

    effect(() => {
      const colorScheme = this.colorScheme();
      const fontFamily = this.editorFontFamily();
      const fontLigatures = this.editorFontLigatures();
      const fontSize = this.editorFontSize();
      this.#runtime?.editor.setTheme(
        colorScheme === "dark" ? "c4ml-night" : "c4ml-day",
      );
      this.#editor?.updateOptions({
        fontFamily,
        fontLigatures,
        fontSize,
        lineHeight: Math.round(fontSize * 1.68),
      });
      this.#remeasureFontAfterLoad(fontFamily, fontSize);
    });
  }

  ngAfterViewInit(): void {
    void this.#initialize().catch((error: unknown) => {
      if (!this.#destroyed) {
        this.loadFailure.set(
          error instanceof Error
            ? error.message
            : "The source editor could not be started.",
        );
      }
    });
  }

  ngOnDestroy(): void {
    this.#destroyed = true;
    this.#completionRegistration?.dispose();
    this.#highlightRegistration?.dispose();
    this.#editor?.dispose();
    this.#model?.dispose();
  }

  revealDiagnostic(diagnostic: CompilerWorkerDiagnostic): void {
    const source = diagnostic.source;
    if (source === undefined) {
      return;
    }
    this.revealSource(source);
  }

  revealSource(source: NonNullable<CompilerWorkerDiagnostic["source"]>): void {
    if (this.#editor === undefined) {
      return;
    }
    const range = {
      startLineNumber: source.start.line + 1,
      startColumn: source.start.column + 1,
      endLineNumber: source.end.line + 1,
      endColumn: source.end.column + 1,
    };
    this.#editor.setSelection(range);
    this.#editor.revealRangeInCenter(range);
    this.#editor.focus();
  }

  triggerSuggestions(): void {
    this.#editor?.focus();
    this.#editor?.trigger(
      "c4ml-editor",
      "editor.action.triggerSuggest",
      undefined,
    );
  }

  async #initialize(): Promise<void> {
    const [runtime] = await Promise.all([
      loadMonacoRuntime(),
      loadMonacoStyles(),
    ]);
    if (this.#destroyed) {
      return;
    }
    this.#runtime = runtime;
    registerC4mlLanguage(runtime);
    const modelUri = runtime.Uri.parse("inmemory://c4ml/architecture.c4ml");
    this.#model = runtime.editor.createModel(
      this.value(),
      c4mlLanguageId,
      modelUri,
    );
    this.#editor = runtime.editor.create(this.editorHost().nativeElement, {
      model: this.#model,
      theme: this.colorScheme() === "dark" ? "c4ml-night" : "c4ml-day",
      ariaLabel: "C4ML source",
      automaticLayout: true,
      bracketPairColorization: { enabled: true },
      editContext: false,
      fontFamily: this.editorFontFamily(),
      fontLigatures: this.editorFontLigatures(),
      fontSize: this.editorFontSize(),
      lineHeight: Math.round(this.editorFontSize() * 1.68),
      lineNumbersMinChars: 3,
      minimap: { enabled: false },
      overviewRulerBorder: false,
      padding: { top: 16, bottom: 28 },
      quickSuggestions: {
        comments: false,
        other: true,
        strings: true,
      },
      renderValidationDecorations: "on",
      scrollBeyondLastLine: false,
      "semanticHighlighting.enabled": true,
      smoothScrolling: true,
      suggestOnTriggerCharacters: false,
      tabSize: 2,
      wordBasedSuggestions: "off",
      wordWrap: "off",
    });
    this.#remeasureFontAfterLoad(
      this.editorFontFamily(),
      this.editorFontSize(),
    );
    this.#editor.onDidChangeModelContent(() => {
      if (!this.#synchronizeExternalValue && this.#model !== undefined) {
        this.valueChanged.emit(this.#model.getValue());
      }
    });
    this.#editor.onDidChangeCursorSelection(({ selection }) => {
      const model = this.#model;
      if (model === undefined) {
        return;
      }
      this.selectionChanged.emit({
        startOffset: model.getOffsetAt(selection.getStartPosition()),
        endOffset: model.getOffsetAt(selection.getEndPosition()),
      });
    });
    this.#completionRegistration =
      runtime.languages.registerCompletionItemProvider(c4mlLanguageId, {
        provideCompletionItems: async (model, position, _context, token) => {
          const source = model.getValue();
          const offset = model.getOffsetAt(position);
          const candidates = await this.completionProvider()(source, offset);
          if (token.isCancellationRequested || model.getValue() !== source) {
            return { suggestions: [] };
          }
          return {
            suggestions: candidates.map((candidate, index) => {
              const completion = sourceEditorCompletion(candidate);
              return {
                label: completion.label,
                kind: completionKind(runtime, completion.kind),
                detail: completion.detail,
                insertText: completion.insertText,
                range: completion.range,
                sortText: index.toString().padStart(5, "0"),
                ...(completion.documentation === undefined
                  ? {}
                  : { documentation: completion.documentation }),
              };
            }),
          };
        },
      });
    this.#highlightRegistration =
      runtime.languages.registerDocumentSemanticTokensProvider(
        c4mlLanguageId,
        {
          getLegend: () => ({
            tokenTypes: [...sourceEditorSemanticTokenTypes],
            tokenModifiers: [],
          }),
          provideDocumentSemanticTokens: async (model, _lastResultId, token) => {
            const source = model.getValue();
            const highlights = await this.highlightProvider()(source);
            if (token.isCancellationRequested || model.getValue() !== source) {
              return { data: new Uint32Array() };
            }
            return { data: sourceEditorSemanticTokens(highlights) };
          },
          releaseDocumentSemanticTokens: () => undefined,
        },
      );
    this.#updateMarkers();
  }

  #remeasureFontAfterLoad(fontFamily: string, fontSize: number): void {
    const runtime = this.#runtime;
    if (runtime === undefined) {
      return;
    }
    const fontSet = this.editorHost().nativeElement.ownerDocument.fonts;
    void fontSet
      .load(`${fontSize}px ${fontFamily}`)
      .then(() => {
        if (!this.#destroyed && this.#runtime === runtime) {
          runtime.editor.remeasureFonts();
        }
      })
      .catch(() => {
        // The CSS fallback remains usable when a packaged face cannot load.
      });
  }

  #updateMarkers(): void {
    const model = this.#model;
    const runtime = this.#runtime;
    if (model === undefined || runtime === undefined) {
      return;
    }
    this.#setMarkers(this.diagnostics());
  }

  #setMarkers(diagnostics: readonly CompilerWorkerDiagnostic[]): void {
    const model = this.#model;
    const runtime = this.#runtime;
    if (model === undefined || runtime === undefined) {
      return;
    }
    runtime.editor.setModelMarkers(
      model,
      markerOwner,
      sourceEditorMarkers(diagnostics).map((marker) => ({
        ...marker.range,
        code: marker.code,
        severity: markerSeverity(runtime, marker.severity),
        message:
          marker.correction === undefined
            ? marker.message
            : `${marker.message}\n\nSuggested correction: ${marker.correction}`,
        source: "C4ML",
      })),
    );
  }
}

let languageRegistered = false;
let monacoRuntime: Promise<MonacoRuntime> | undefined;
let monacoStyles: Promise<void> | undefined;

function loadMonacoRuntime(): Promise<MonacoRuntime> {
  monacoRuntime ??= import("./monaco-source-editor.runtime.js");
  return monacoRuntime;
}

function loadMonacoStyles(): Promise<void> {
  monacoStyles ??= new Promise<void>((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL("monaco/editor.main.css", document.baseURI).href;
    link.dataset["c4mlMonacoStyles"] = "true";
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener(
      "error",
      () => reject(new Error("Could not load the local Monaco stylesheet.")),
      { once: true },
    );
    document.head.append(link);
  });
  return monacoStyles;
}

function registerC4mlLanguage(runtime: MonacoRuntime): void {
  if (languageRegistered) {
    return;
  }
  runtime.languages.register({ id: c4mlLanguageId });
  runtime.editor.defineTheme("c4ml-night", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "7895AA", fontStyle: "italic" },
      { token: "keyword", foreground: "7DD8E6", fontStyle: "bold" },
      { token: "number", foreground: "F2C879" },
      { token: "operator", foreground: "A9C2D8" },
      { token: "string", foreground: "B8D98A" },
      { token: "variable", foreground: "E4EEF8" },
    ],
    colors: {
      "editor.background": "#132132",
      "editor.foreground": "#E4EEF8",
      "editorLineNumber.foreground": "#61778D",
      "editorLineNumber.activeForeground": "#A9C2D8",
      "editorCursor.foreground": "#7DD8E6",
      "editor.selectionBackground": "#24516E",
      "editor.inactiveSelectionBackground": "#203F57",
      ...c4mlNightSuggestionColors,
    },
  });
  runtime.editor.defineTheme("c4ml-day", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "607B8F", fontStyle: "italic" },
      { token: "keyword", foreground: "096D87", fontStyle: "bold" },
      { token: "number", foreground: "8A570D" },
      { token: "operator", foreground: "52677D" },
      { token: "string", foreground: "4D711D" },
      { token: "variable", foreground: "17263D" },
    ],
    colors: {
      "editor.background": "#FBFCFE",
      "editor.foreground": "#17263D",
      "editorLineNumber.foreground": "#8292A3",
      "editorLineNumber.activeForeground": "#40566B",
      "editorCursor.foreground": "#157CA3",
      "editor.selectionBackground": "#B8DDE9",
      "editor.inactiveSelectionBackground": "#DCEAF0",
      ...c4mlDaySuggestionColors,
    },
  });
  languageRegistered = true;
}

function markerSeverity(
  runtime: MonacoRuntime,
  severity: CompilerWorkerDiagnostic["severity"],
): MonacoEditor.IMarkerData["severity"] {
  switch (severity) {
    case "error":
      return runtime.MarkerSeverity.Error;
    case "warning":
      return runtime.MarkerSeverity.Warning;
    case "information":
      return runtime.MarkerSeverity.Info;
  }
}

function completionKind(
  runtime: MonacoRuntime,
  kind: "keyword" | "property" | "reference" | "value",
): MonacoLanguages.CompletionItemKind {
  switch (kind) {
    case "keyword":
      return runtime.languages.CompletionItemKind.Keyword;
    case "property":
      return runtime.languages.CompletionItemKind.Property;
    case "reference":
      return runtime.languages.CompletionItemKind.Reference;
    case "value":
      return runtime.languages.CompletionItemKind.Value;
  }
}
