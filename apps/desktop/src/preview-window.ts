import type {
  DesktopPreviewProjection,
  DesktopPreviewWindowBounds,
} from "@c4ml/desktop-contract";

export interface DesktopWorkArea {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export class DesktopPreviewProjectionSequence {
  #revision = 0;

  accept(projection: DesktopPreviewProjection): DesktopPreviewProjection {
    return { ...projection, revision: ++this.#revision };
  }
}

export function normalizePreviewWindowBounds(
  requested: DesktopPreviewWindowBounds | undefined,
  workArea: DesktopWorkArea,
): DesktopPreviewWindowBounds {
  const width = Math.min(requested?.width ?? 1100, workArea.width);
  const height = Math.min(requested?.height ?? 760, workArea.height);
  const maximumX = workArea.x + workArea.width - width;
  const maximumY = workArea.y + workArea.height - height;
  return {
    x: Math.min(maximumX, Math.max(workArea.x, requested?.x ?? workArea.x + 48)),
    y: Math.min(maximumY, Math.max(workArea.y, requested?.y ?? workArea.y + 48)),
    width,
    height,
  };
}
