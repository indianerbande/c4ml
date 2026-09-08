import { describe, expect, it } from "vitest";

import {
  PreviewSvgObjectUrl,
  type PreviewSvgObjectUrlFactory,
} from "../src/app/preview-svg-object-url.js";

class RecordingObjectUrls implements PreviewSvgObjectUrlFactory {
  readonly created: { readonly blob: Blob; readonly url: string }[] = [];
  readonly revoked: string[] = [];

  createObjectURL(blob: Blob): string {
    const url = `blob:c4ml-preview-${this.created.length + 1}`;
    this.created.push({ blob, url });
    return url;
  }

  revokeObjectURL(url: string): void {
    this.revoked.push(url);
  }
}

describe("preview SVG object URL", () => {
  it("reuses canonical font bytes when only the interactive overlay changes", async () => {
    const fontPayload = "QUJD".repeat(32_768);
    const canonical = `<svg xmlns="http://www.w3.org/2000/svg"><style>@font-face{font-family:C4ML;src:url(data:font/woff2;base64,${fontPayload})}</style><text>Garden</text></svg>`;
    const firstOverlay = '<path id="selection-one" d="M 1 1 H 4"/>';
    const secondOverlay = '<path id="selection-two" d="M 2 2 H 8"/>';
    const urls = new RecordingObjectUrls();
    const preview = new PreviewSvgObjectUrl(urls);

    const initial = preview.update(canonical, firstOverlay)!;
    const changed = preview.update(canonical, secondOverlay)!;

    expect(await initial.blob.text()).toBe(
      canonical.replace("</svg>", `${firstOverlay}</svg>`),
    );
    expect(await changed.blob.text()).toBe(
      canonical.replace("</svg>", `${secondOverlay}</svg>`),
    );
    expect(initial.encodedStringBytes).toBeGreaterThan(fontPayload.length);
    expect(changed.encodedStringBytes).toBe(
      new TextEncoder().encode(secondOverlay).byteLength,
    );
    expect(changed.reusedCanonicalBytes).toBe(
      new TextEncoder().encode(canonical).byteLength,
    );
    expect(changed.encodedStringBytes).toBeLessThan(
      changed.reusedCanonicalBytes / 1_000,
    );
    expect(urls.revoked).toEqual([initial.url]);

    preview.dispose();
    expect(urls.revoked).toEqual([initial.url, changed.url]);
  });

  it("does not replace an unchanged URL and revokes it when the preview clears", () => {
    const urls = new RecordingObjectUrls();
    const preview = new PreviewSvgObjectUrl(urls);
    const first = preview.update("<svg></svg>", "")!;

    expect(preview.update("<svg></svg>", "")).toBe(first);
    expect(urls.created).toHaveLength(1);
    expect(urls.revoked).toEqual([]);

    expect(preview.update(undefined)).toBeUndefined();
    expect(urls.revoked).toEqual([first.url]);
  });

  it("keeps malformed compiler output unchanged instead of appending an overlay", async () => {
    const urls = new RecordingObjectUrls();
    const preview = new PreviewSvgObjectUrl(urls);
    const allocation = preview.update("<svg>", "<path/>")!;

    expect(await allocation.blob.text()).toBe("<svg>");
    expect(allocation.encodedStringBytes).toBe(5);
  });
});
