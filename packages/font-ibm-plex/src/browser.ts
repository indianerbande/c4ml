import {
  ibmPlexSansFamily,
  ibmPlexSansSvgFonts,
  type IbmPlexSvgFontFace,
} from "./index.js";

const cachedFaces = new Map<string, Promise<readonly IbmPlexSvgFontFace[]>>();

export function loadIbmPlexSansSvgFontFaces(
  publicAssetRoot: URL,
): Promise<readonly IbmPlexSvgFontFace[]> {
  const root = publicAssetRoot.href.endsWith("/")
    ? publicAssetRoot.href
    : `${publicAssetRoot.href}/`;
  let pending = cachedFaces.get(root);
  if (pending === undefined) {
    pending = Promise.all(
      ibmPlexSansSvgFonts.map(async ({ filename, style, weight }) => {
        const url = new URL(`sans/${filename}`, root);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Cannot load bundled IBM Plex font ${filename}: HTTP ${response.status}.`,
          );
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        return {
          family: ibmPlexSansFamily,
          style,
          weight,
          format: "woff2" as const,
          dataUrl: `data:font/woff2;base64,${bytesToBase64(bytes)}`,
        };
      }),
    );
    cachedFaces.set(root, pending);
  }
  return pending;
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}
