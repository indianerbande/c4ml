import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  ibmPlexSansFamily,
  ibmPlexSansSvgFonts,
  type IbmPlexSvgFontFace,
} from "./index.js";

export const ibmPlexSansTtfFontFiles = [
  fileURLToPath(
    new URL("../fonts/sans/IBMPlexSans-Regular.ttf", import.meta.url),
  ),
  fileURLToPath(new URL("../fonts/sans/IBMPlexSans-Bold.ttf", import.meta.url)),
  fileURLToPath(
    new URL("../fonts/sans/IBMPlexSans-Italic.ttf", import.meta.url),
  ),
] as const;

let cachedFaces: Promise<readonly IbmPlexSvgFontFace[]> | undefined;

export function loadIbmPlexSansSvgFontFaces(): Promise<
  readonly IbmPlexSvgFontFace[]
> {
  cachedFaces ??= Promise.all(
    ibmPlexSansSvgFonts.map(async ({ filename, style, weight }) => ({
      family: ibmPlexSansFamily,
      style,
      weight,
      format: "woff2" as const,
      dataUrl: `data:font/woff2;base64,${(
        await readFile(new URL(`../fonts/sans/${filename}`, import.meta.url))
      ).toString("base64")}`,
    })),
  );
  return cachedFaces;
}
