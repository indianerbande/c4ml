export type SourceEditorSuggestionShortcut = "Ctrl+Space" | "⌘I";

export function sourceEditorSuggestionShortcut(
  userAgent: string,
): SourceEditorSuggestionShortcut {
  return /Macintosh|Mac OS X/u.test(userAgent) ? "⌘I" : "Ctrl+Space";
}
