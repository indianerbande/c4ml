import { Resvg, type ResvgRenderOptions } from "@resvg/resvg-js";

import {
  ContractError,
  type PngRenderer,
  type PngRenderOptions,
  type PngRenderResult,
} from "@c4ml/compiler-core";

export class ResvgPngRenderer implements PngRenderer {
  readonly rendererId = "resvg-js-2.6";

  async render(
    svg: string,
    options: PngRenderOptions = {},
  ): Promise<PngRenderResult> {
    if (svg.trim().length === 0) {
      throw new ContractError("C4ML-PNG-001", "SVG input is empty.");
    }

    const scale = options.scale ?? 1;
    if (!Number.isFinite(scale) || scale <= 0) {
      throw new ContractError(
        "C4ML-PNG-002",
        "PNG scale must be finite and greater than zero.",
      );
    }

    const renderOptions: ResvgRenderOptions = {
      fitTo:
        scale === 1
          ? { mode: "original" }
          : { mode: "zoom", value: scale },
      font: {
        loadSystemFonts: options.loadSystemFonts ?? false,
        ...(options.fontFiles === undefined
          ? {}
          : { fontFiles: [...options.fontFiles] }),
        ...(options.defaultFontFamily === undefined
          ? {}
          : { defaultFontFamily: options.defaultFontFamily }),
      },
      logLevel: "off",
      ...(options.background === undefined
        ? {}
        : { background: options.background }),
    };
    const renderer = new Resvg(svg, renderOptions);

    if (renderer.imagesToResolve().length > 0) {
      throw new ContractError(
        "C4ML-PNG-003",
        "SVG contains external image resources.",
      );
    }

    const image = renderer.render();
    return {
      bytes: Uint8Array.from(image.asPng()),
      width: image.width,
      height: image.height,
    };
  }
}
