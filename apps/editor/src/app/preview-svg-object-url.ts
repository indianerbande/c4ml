export interface PreviewSvgObjectUrlFactory {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
}

export interface PreviewSvgAllocation {
  readonly url: string;
  readonly blob: Blob;
  /** UTF-8 bytes converted from strings for this update. */
  readonly encodedStringBytes: number;
  /** Canonical UTF-8 bytes reused from the prepared Blob. */
  readonly reusedCanonicalBytes: number;
}

interface PreparedPreviewSvg {
  readonly source: string;
  readonly canonicalBytes: number;
  readonly complete: Blob;
  readonly beforeClosingTag: Blob;
  readonly closingTagAndRemainder: Blob;
  readonly acceptsOverlay: boolean;
}

/**
 * Owns one live preview URL and one prepared canonical SVG Blob. Selection and
 * routing-debug updates concatenate the stable Blob parts with only their small
 * overlay string, so embedded font data is not converted again on every click.
 */
export class PreviewSvgObjectUrl {
  readonly #urls: PreviewSvgObjectUrlFactory;
  #prepared: PreparedPreviewSvg | undefined;
  #overlay = "";
  #current: PreviewSvgAllocation | undefined;

  constructor(urls: PreviewSvgObjectUrlFactory = URL) {
    this.#urls = urls;
  }

  update(
    canonicalSvg: string | undefined,
    overlay = "",
  ): PreviewSvgAllocation | undefined {
    if (canonicalSvg === undefined) {
      this.clear();
      return undefined;
    }
    if (
      this.#prepared?.source === canonicalSvg &&
      this.#overlay === overlay &&
      this.#current !== undefined
    ) {
      return this.#current;
    }

    const canonicalChanged = this.#prepared?.source !== canonicalSvg;
    if (canonicalChanged) {
      this.#prepared = preparePreviewSvg(canonicalSvg);
    }
    const prepared = this.#prepared!;
    const effectiveOverlay = prepared.acceptsOverlay ? overlay : "";
    const overlayBytes = utf8Length(effectiveOverlay);
    const blob = effectiveOverlay.length === 0
      ? prepared.complete
      : new Blob(
          [
            prepared.beforeClosingTag,
            effectiveOverlay,
            prepared.closingTagAndRemainder,
          ],
          { type: "image/svg+xml;charset=utf-8" },
        );

    this.#revokeCurrent();
    const current = {
      url: this.#urls.createObjectURL(blob),
      blob,
      encodedStringBytes:
        (canonicalChanged ? prepared.canonicalBytes : 0) + overlayBytes,
      reusedCanonicalBytes: canonicalChanged ? 0 : prepared.canonicalBytes,
    };
    this.#overlay = overlay;
    this.#current = current;
    return current;
  }

  clear(): void {
    this.#revokeCurrent();
    this.#prepared = undefined;
    this.#overlay = "";
  }

  dispose(): void {
    this.clear();
  }

  #revokeCurrent(): void {
    if (this.#current !== undefined) {
      this.#urls.revokeObjectURL(this.#current.url);
      this.#current = undefined;
    }
  }
}

function preparePreviewSvg(svg: string): PreparedPreviewSvg {
  const closingTag = "</svg>";
  const closingIndex = svg.lastIndexOf(closingTag);
  const acceptsOverlay = closingIndex >= 0;
  const before = acceptsOverlay ? svg.slice(0, closingIndex) : svg;
  const after = acceptsOverlay ? svg.slice(closingIndex) : "";
  const beforeClosingTag = svgBlob(before);
  const closingTagAndRemainder = svgBlob(after);
  return {
    source: svg,
    canonicalBytes: beforeClosingTag.size + closingTagAndRemainder.size,
    complete: new Blob([beforeClosingTag, closingTagAndRemainder], {
      type: "image/svg+xml;charset=utf-8",
    }),
    beforeClosingTag,
    closingTagAndRemainder,
    acceptsOverlay,
  };
}

function svgBlob(value: string): Blob {
  return new Blob([value], { type: "image/svg+xml;charset=utf-8" });
}

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}
