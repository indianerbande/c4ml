export const ibmPlexSansFamily = "IBM Plex Sans" as const;
export const ibmPlexMonoFamily = "IBM Plex Mono" as const;

export interface IbmPlexSvgFontFace {
  readonly family: typeof ibmPlexSansFamily;
  readonly style: "italic" | "normal";
  readonly weight: 400 | 700;
  readonly format: "woff2";
  readonly dataUrl: string;
}

export const ibmPlexSansSvgFonts = [
  {
    filename: "IBMPlexSans-Regular.woff2",
    style: "normal",
    weight: 400,
  },
  {
    filename: "IBMPlexSans-Bold.woff2",
    style: "normal",
    weight: 700,
  },
  {
    filename: "IBMPlexSans-Italic.woff2",
    style: "italic",
    weight: 400,
  },
] as const;
