/** Synchronous editor ports; source compilation and revision checks stay outside. */
export interface SourceEditorBatchEntry {
  readonly before: string;
  readonly after: string;
  read(): string | undefined;
  version(): number;
  apply(): void;
  undo(): void;
}

/** Reject the complete batch before writing; undo only while every model matches. */
export function applySourceEditorProjectEdit(entries: readonly SourceEditorBatchEntry[]): (() => boolean) | undefined {
  if (entries.length === 0 || entries.some((entry) => entry.read() !== entry.before)) return undefined;
  const touched: SourceEditorBatchEntry[] = [];
  try {
    for (const entry of entries) {
      touched.push(entry);
      entry.apply();
      if (entry.read() !== entry.after) throw new Error("Editor rejected project edit.");
    }
  } catch (error) {
    for (const entry of touched.reverse()) {
      if (entry.read() !== entry.before) entry.undo();
    }
    if (entries.some((entry) => entry.read() !== entry.before)) throw error;
    return undefined;
  }
  const versions = entries.map((entry) => entry.version());
  return () => {
    if (entries.some((entry, i) => entry.read() !== entry.after || entry.version() !== versions[i])) return false;
    for (const entry of [...entries].reverse()) entry.undo();
    return entries.every((entry) => entry.read() === entry.before);
  };
}
