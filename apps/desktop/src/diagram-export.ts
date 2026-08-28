import { basename, join, resolve } from "node:path";

export const pngFontFilenames = [
  "IBMPlexSans-Regular.ttf",
  "IBMPlexSans-Bold.ttf",
  "IBMPlexSans-Italic.ttf",
] as const;

export interface DesktopPngFontLocation {
  readonly appPath: string;
  readonly packaged: boolean;
  readonly resourcesPath: string;
}

export function ensurePngExtension(path: string): string {
  return path.toLowerCase().endsWith(".png") ? path : `${path}.png`;
}

export function safeSuggestedPngName(value: string): string {
  const cleaned = basename(value)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/[. ]+$/g, "")
    .trim();
  if (cleaned.length === 0) {
    return "architecture.png";
  }
  return ensurePngExtension(cleaned);
}

export function resolveDesktopPngFontFiles(
  location: DesktopPngFontLocation,
): readonly string[] {
  const fontRoot = location.packaged
    ? join(location.resourcesPath, "sans")
    : resolve(
        location.appPath,
        "../../packages/font-ibm-plex/fonts/sans",
      );
  return pngFontFilenames.map((filename) => join(fontRoot, filename));
}
