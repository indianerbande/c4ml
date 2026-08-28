import { readFile } from "node:fs/promises";

import { afterEach, describe, expect, it, vi } from "vitest";

import { loadIbmPlexSansSvgFontFaces as loadBrowserFontFaces } from "../src/browser.js";
import { ibmPlexSansFamily } from "../src/index.js";
import {
  ibmPlexSansTtfFontFiles,
  loadIbmPlexSansSvgFontFaces,
} from "../src/node.js";

describe("bundled IBM Plex assets", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads the controlled standalone-SVG faces", async () => {
    const faces = await loadIbmPlexSansSvgFontFaces();

    expect(faces).toHaveLength(3);
    expect(faces.map(({ family, style, weight }) => ({ family, style, weight })))
      .toEqual([
        { family: ibmPlexSansFamily, style: "normal", weight: 400 },
        { family: ibmPlexSansFamily, style: "normal", weight: 700 },
        { family: ibmPlexSansFamily, style: "italic", weight: 400 },
      ]);
    expect(faces.every(({ dataUrl }) => dataUrl.startsWith("data:font/woff2;base64,d09GMg")))
      .toBe(true);
  });

  it("provides parseable TTF files to the Node PNG adapter", async () => {
    const headers = await Promise.all(
      ibmPlexSansTtfFontFiles.map(async (path) =>
        (await readFile(path)).subarray(0, 4).toString("hex"),
      ),
    );

    expect(headers).toEqual(["00010000", "00010000", "00010000"]);
  });

  it("loads browser faces only from the supplied local asset root", async () => {
    const requested: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        requested.push(String(input));
        return new Response(Uint8Array.from([0x77, 0x4f, 0x46, 0x32]));
      }),
    );

    const faces = await loadBrowserFontFaces(
      new URL("https://editor.invalid/fonts/ibm-plex/"),
    );

    expect(requested).toEqual([
      "https://editor.invalid/fonts/ibm-plex/sans/IBMPlexSans-Regular.woff2",
      "https://editor.invalid/fonts/ibm-plex/sans/IBMPlexSans-Bold.woff2",
      "https://editor.invalid/fonts/ibm-plex/sans/IBMPlexSans-Italic.woff2",
    ]);
    expect(
      faces.every(
        ({ dataUrl }) => dataUrl === "data:font/woff2;base64,d09GMg==",
      ),
    ).toBe(true);
  });
});
