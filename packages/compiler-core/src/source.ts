export interface SourcePosition {
  readonly offset: number;
  readonly line: number;
  readonly column: number;
}

export interface SourceRange {
  readonly start: SourcePosition;
  readonly end: SourcePosition;
}

export interface SourceReference {
  readonly file: string;
  readonly range: SourceRange;
}

const zeroPosition: SourcePosition = {
  offset: 0,
  line: 0,
  column: 0,
};

export const inMemorySource: SourceReference = {
  file: "<memory>",
  range: {
    start: zeroPosition,
    end: zeroPosition,
  },
};

export interface SourceBacked {
  readonly source?: SourceReference;
}

export function sourceOf(value: SourceBacked | undefined): SourceReference {
  return value?.source ?? inMemorySource;
}
