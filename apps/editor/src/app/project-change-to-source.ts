import {
  createProposedSourceChangeSet,
  type ProposedProjectSourceChangeSet,
  type ProposedSourceChangeSet,
} from "@c4ml/compiler-core";

export type ProjectChangeToSourceResult =
  | {
      readonly valid: true;
      readonly changeSet: ProposedSourceChangeSet;
    }
  | {
      readonly valid: false;
      readonly reason: "different-document" | "missing-edit";
    };

/** Narrows one project-addressed authoring transaction to one Monaco model. */
export function projectChangeToSourceChange(
  changeSet: ProposedProjectSourceChangeSet,
  documentUri: string,
  source: string,
): ProjectChangeToSourceResult {
  const edits = changeSet.edits.filter(
    (edit) => edit.documentUri === documentUri,
  );
  if (edits.length === 0) {
    return { valid: false, reason: "missing-edit" };
  }
  if (edits.length !== changeSet.edits.length) {
    return { valid: false, reason: "different-document" };
  }
  return {
    valid: true,
    changeSet: createProposedSourceChangeSet(source, {
      id: changeSet.id,
      intent: changeSet.intent,
      affectedIds: changeSet.affectedIds,
      edits: edits.map(({ startOffset, endOffset, text }) => ({
        startOffset,
        endOffset,
        text,
      })),
    }),
  };
}
