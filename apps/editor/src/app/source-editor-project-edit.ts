/** Synchronous editor ports; source compilation and revision checks stay outside. */
export interface SourceEditorBatchEntry {
  readonly before: string;
  readonly after: string;
  read(): string | undefined;
  version(): number;
  apply(): void;
  undo(): void;
  redo(): void;
}

export interface SourceEditorProjectEditApplication {
  synchronize(): boolean;
  undo(): boolean;
  redo(): boolean;
}

/** Reject the complete batch before writing; move history only while every model matches. */
export function applySourceEditorProjectEdit(
  entries: readonly SourceEditorBatchEntry[],
): SourceEditorProjectEditApplication | undefined {
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
  let phase: "applied" | "undone" = "applied";
  let versions = entries.map((entry) => entry.version());
  return {
    synchronize: () => {
      const expected = phase === "applied" ? "after" : "before";
      if (entries.some((entry) => entry.read() !== entry[expected])) return false;
      versions = entries.map((entry) => entry.version());
      return true;
    },
    undo: () => {
      if (
        phase !== "applied" ||
        entries.some(
          (entry, index) =>
            entry.read() !== entry.after || entry.version() !== versions[index],
        )
      ) {
        return false;
      }
      for (const entry of [...entries].reverse()) entry.undo();
      if (entries.some((entry) => entry.read() !== entry.before)) return false;
      phase = "undone";
      versions = entries.map((entry) => entry.version());
      return true;
    },
    redo: () => {
      if (
        phase !== "undone" ||
        entries.some(
          (entry, index) =>
            entry.read() !== entry.before || entry.version() !== versions[index],
        )
      ) {
        return false;
      }
      for (const entry of entries) entry.redo();
      if (entries.some((entry) => entry.read() !== entry.after)) return false;
      phase = "applied";
      versions = entries.map((entry) => entry.version());
      return true;
    },
  };
}
