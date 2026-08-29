import {
  applySourceChangeSet,
  type ProposedSourceChangeSet,
  type SourceChangeIssue,
  type SourceTextEdit,
} from "@c4ml/compiler-core";

export interface SourceEditorChangeSetHost {
  source(): string;
  pushUndoStop(): void;
  executeEdits(edits: readonly SourceTextEdit[]): boolean;
}

export type SourceEditorChangeSetApplication =
  | {
      readonly applied: true;
      readonly source: string;
      readonly issues: readonly [];
    }
  | {
      readonly applied: false;
      readonly issues: readonly SourceChangeIssue[];
      readonly reason: "editor-rejected" | "invalid";
    };

/** Applies one validated C4ML change set as exactly one editor undo unit. */
export function applySourceChangeSetAsSingleUndo(
  changeSet: ProposedSourceChangeSet,
  host: SourceEditorChangeSetHost,
): SourceEditorChangeSetApplication {
  const application = applySourceChangeSet(host.source(), changeSet);
  if (!application.valid) {
    return { applied: false, reason: "invalid", issues: application.issues };
  }

  host.pushUndoStop();
  const accepted = host.executeEdits(changeSet.edits);
  host.pushUndoStop();
  return accepted
    ? { applied: true, source: application.source, issues: [] }
    : { applied: false, reason: "editor-rejected", issues: [] };
}
