export {
  MarkerSeverity,
  Uri,
  editor,
  languages,
} from "monaco-editor/editor";
import "monaco-editor/features/bracketMatching/register";
import "monaco-editor/features/clipboard/register";
import "monaco-editor/features/codeEditor/register";
import "monaco-editor/features/contextmenu/register";
import "monaco-editor/features/cursorUndo/register";
import "monaco-editor/features/find/register";
import "monaco-editor/features/gotoError/register";
import "monaco-editor/features/gotoLine/register";
import "monaco-editor/features/indentation/register";
import "monaco-editor/features/linesOperations/register";
import "monaco-editor/features/multicursor/register";
// Monaco 0.56.0 does not register the popup controller through its public
// suggest feature entry. The production dependency check pins and verifies
// this adapter-local path so an upgrade cannot change it unnoticed.
import "monaco-editor/editor/contrib/suggest/browser/suggestController.js";
import { SuggestWidget } from "monaco-editor/editor/contrib/suggest/browser/suggestWidget.js";
import "monaco-editor/features/toggleTabFocusMode/register";
import "monaco-editor/features/wordOperations/register";
// Monaco has no public feature entry for semantic-token painting in 0.56.0.
// The dependency check pins this adapter-local import beside the suggest path.
import "monaco-editor/editor/contrib/semanticTokens/browser/documentSemanticTokens.js";

export function setNoSuggestionsMessage(message: string): void {
  SuggestWidget.NO_SUGGESTIONS_MESSAGE = message;
}
