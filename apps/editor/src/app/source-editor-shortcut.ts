export type SourceEditorSuggestionShortcut = "Ctrl+Space" | "⌘I";

export const sourceEditorDismissSuggestionsCommand = "hideSuggestWidget";

export interface SourceEditorSuggestionCommandHost {
  trigger(source: string, handlerId: string, payload: unknown): void;
}

export function sourceEditorSuggestionShortcut(
  userAgent: string,
): SourceEditorSuggestionShortcut {
  return /Macintosh|Mac OS X/u.test(userAgent) ? "⌘I" : "Ctrl+Space";
}

export function dismissSourceEditorSuggestions(
  editor: SourceEditorSuggestionCommandHost | undefined,
): void {
  editor?.trigger(
    "c4ml.localization",
    sourceEditorDismissSuggestionsCommand,
    undefined,
  );
}
