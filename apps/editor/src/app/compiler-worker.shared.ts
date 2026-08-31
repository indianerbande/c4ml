export const compilerWorkerProtocolVersion = 17 as const;

export interface CompilerWorkerPosition {
  readonly offset: number;
  readonly line: number;
  readonly column: number;
}

export interface CompilerWorkerSource {
  readonly file: string;
  readonly start: CompilerWorkerPosition;
  readonly end: CompilerWorkerPosition;
}

export function isPositiveRequestId(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

export function isWorkerPosition(
  value: unknown,
): value is CompilerWorkerPosition {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const position = value as Partial<CompilerWorkerPosition>;
  return (
    Number.isSafeInteger(position.offset) &&
    (position.offset ?? -1) >= 0 &&
    Number.isSafeInteger(position.line) &&
    (position.line ?? -1) >= 0 &&
    Number.isSafeInteger(position.column) &&
    (position.column ?? -1) >= 0
  );
}

export function isWorkerSource(value: unknown): value is CompilerWorkerSource {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<CompilerWorkerSource>;
  return (
    typeof candidate.file === "string" &&
    isWorkerPosition(candidate.start) &&
    isWorkerPosition(candidate.end) &&
    candidate.start.offset <= candidate.end.offset
  );
}

export function isPositiveFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
