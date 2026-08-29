import type { EffectiveColorScheme } from "./workbench-preferences.js";

export const c4mlSyntaxThemePresets = [
  "balanced",
  "minimal",
  "vivid",
  "high-contrast",
  "color-safe",
] as const;

export type C4mlSyntaxThemePreset = (typeof c4mlSyntaxThemePresets)[number];

export const c4mlSyntaxTokenRoles = [
  "comment",
  "declaration",
  "property",
  "value",
  "keyword",
  "number",
  "operator",
  "string",
  "variable",
] as const;

export type C4mlSyntaxTokenRole = (typeof c4mlSyntaxTokenRoles)[number];

export interface C4mlSyntaxStyle {
  readonly foreground: string;
  readonly fontStyle?: string;
}

export interface C4mlResolvedSyntaxTheme {
  readonly preset: C4mlSyntaxThemePreset;
  readonly scheme: EffectiveColorScheme;
  readonly roles: Readonly<Record<C4mlSyntaxTokenRole, C4mlSyntaxStyle>>;
}

type SyntaxRoleStyles = C4mlResolvedSyntaxTheme["roles"];

const lightThemes: Readonly<
  Record<C4mlSyntaxThemePreset, (accent: string) => SyntaxRoleStyles>
> = {
  balanced: (accent) => ({
    comment: style("#526B7E", "italic"),
    declaration: style(accent, "bold"),
    property: style("#355C7D"),
    value: style("#6A4D8A"),
    keyword: style("#52677D", "bold"),
    number: style("#8A570D"),
    operator: style("#52677D"),
    string: style("#4D711D"),
    variable: style("#17263D"),
  }),
  minimal: (accent) => ({
    comment: style("#52677D", "italic"),
    declaration: style(accent, "bold"),
    property: style("#26394E"),
    value: style("#40566B"),
    keyword: style("#40566B", "bold"),
    number: style("#26394E"),
    operator: style("#52677D"),
    string: style("#26394E"),
    variable: style("#17263D"),
  }),
  vivid: (accent) => ({
    comment: style("#526B7E", "italic"),
    declaration: style(accent, "bold"),
    property: style("#145F91"),
    value: style("#743C8A"),
    keyword: style("#4B5870", "bold"),
    number: style("#934A00"),
    operator: style("#4B5870"),
    string: style("#3C6B13"),
    variable: style("#17263D"),
  }),
  "high-contrast": (accent) => ({
    comment: style("#3F5060", "italic"),
    declaration: style(accent, "bold underline"),
    property: style("#003D73", "bold"),
    value: style("#5A2675"),
    keyword: style("#1C334A", "bold"),
    number: style("#713B00"),
    operator: style("#1C334A"),
    string: style("#275D00"),
    variable: style("#000000"),
  }),
  "color-safe": (accent) => ({
    comment: style("#52677D", "italic"),
    declaration: style(accent, "bold"),
    property: style("#155E8A"),
    value: style("#795000", "bold"),
    keyword: style("#40566B", "bold"),
    number: style("#814600"),
    operator: style("#52677D"),
    string: style("#5D4380"),
    variable: style("#17263D"),
  }),
};

const darkThemes: typeof lightThemes = {
  balanced: (accent) => ({
    comment: style("#8FA6BA", "italic"),
    declaration: style(accent, "bold"),
    property: style("#80C4E8"),
    value: style("#D8B7F2"),
    keyword: style("#A9C2D8", "bold"),
    number: style("#F2C879"),
    operator: style("#A9C2D8"),
    string: style("#B8D98A"),
    variable: style("#E4EEF8"),
  }),
  minimal: (accent) => ({
    comment: style("#9BADBD", "italic"),
    declaration: style(accent, "bold"),
    property: style("#E4EEF8"),
    value: style("#C4D5E4"),
    keyword: style("#C4D5E4", "bold"),
    number: style("#E4EEF8"),
    operator: style("#A9B9C8"),
    string: style("#E4EEF8"),
    variable: style("#E4EEF8"),
  }),
  vivid: (accent) => ({
    comment: style("#9BADBD", "italic"),
    declaration: style(accent, "bold"),
    property: style("#78C8F0"),
    value: style("#DAA7F0"),
    keyword: style("#B7CAE0", "bold"),
    number: style("#FFD06A"),
    operator: style("#B7CAE0"),
    string: style("#B9E58D"),
    variable: style("#F2F7FC"),
  }),
  "high-contrast": (accent) => ({
    comment: style("#B7C8D8", "italic"),
    declaration: style(accent, "bold underline"),
    property: style("#8DD7FF", "bold"),
    value: style("#E6B9FF"),
    keyword: style("#D5E8FA", "bold"),
    number: style("#FFD978"),
    operator: style("#D5E8FA"),
    string: style("#C8F29D"),
    variable: style("#FFFFFF"),
  }),
  "color-safe": (accent) => ({
    comment: style("#9BAEBF", "italic"),
    declaration: style(accent, "bold"),
    property: style("#86CDF2"),
    value: style("#F1C76D", "bold"),
    keyword: style("#BCD0E3", "bold"),
    number: style("#FFCF75"),
    operator: style("#A9C2D8"),
    string: style("#D8B9EE"),
    variable: style("#EAF2FA"),
  }),
};

export function resolveC4mlSyntaxTheme(
  preset: C4mlSyntaxThemePreset,
  scheme: EffectiveColorScheme,
  accent: string,
): C4mlResolvedSyntaxTheme {
  return {
    preset,
    scheme,
    roles: (scheme === "dark" ? darkThemes : lightThemes)[preset](accent),
  };
}

function style(foreground: string, fontStyle?: string): C4mlSyntaxStyle {
  return fontStyle === undefined ? { foreground } : { foreground, fontStyle };
}
