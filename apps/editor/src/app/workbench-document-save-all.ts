import type {
  DesktopSaveRequest,
  DesktopSaveResult,
} from "@c4ml/desktop-contract";

export interface SaveableWorkbenchDocument {
  readonly uri: string;
  readonly displayName: string;
  readonly source: string;
  readonly handle?: string;
  readonly dirty: boolean;
}

export interface SaveAllDocumentsResult<Document> {
  readonly documents: readonly Document[];
  readonly savedCount: number;
  readonly failedCount: number;
  readonly canceled: boolean;
}

export async function saveAllProjectDocuments<
  Document extends SaveableWorkbenchDocument,
>(
  documents: readonly Document[],
  save: (request: DesktopSaveRequest) => Promise<DesktopSaveResult>,
): Promise<SaveAllDocumentsResult<Document>> {
  const updated = documents.map((document) => ({ ...document })) as Document[];
  let savedCount = 0;
  let failedCount = 0;
  let canceled = false;

  for (let index = 0; index < updated.length; index += 1) {
    const document = updated[index]!;
    if (!document.dirty) {
      continue;
    }
    try {
      const result = await save({
        suggestedName: document.displayName,
        source: document.source,
        mode: "save",
        ...(document.handle === undefined ? {} : { handle: document.handle }),
      });
      if (result.status === "canceled") {
        canceled = true;
        break;
      }
      if (result.status === "failed") {
        failedCount += 1;
        continue;
      }
      updated[index] = {
        ...document,
        handle: result.handle,
        displayName: result.displayName,
        dirty: false,
      };
      savedCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  return { documents: updated, savedCount, failedCount, canceled };
}
