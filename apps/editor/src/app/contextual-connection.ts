import type {
  C4mlSemanticAuthoringContext,
  C4mlSemanticAuthoringElement,
} from "@c4ml/language-c4ml";

export type ContextualConnectionDirection = "from-context" | "to-context";

export function contextualConnectionCounterparts(
  context: Pick<C4mlSemanticAuthoringContext, "connectionOptions" | "elements">,
  contextElementId: string,
  direction: ContextualConnectionDirection,
): readonly C4mlSemanticAuthoringElement[] {
  const ids = direction === "from-context"
    ? context.connectionOptions.find(({ sourceId }) => sourceId === contextElementId)
        ?.targetIds ?? []
    : context.connectionOptions
        .filter(({ targetIds }) => targetIds.includes(contextElementId))
        .map(({ sourceId }) => sourceId);
  return ids.flatMap((id) => {
    const element = context.elements.find((candidate) => candidate.id === id);
    return element === undefined ? [] : [element];
  });
}
