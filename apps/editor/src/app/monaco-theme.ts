import {
  workbenchColorPalettes,
  type EffectiveColorScheme,
  type WorkbenchColorPalette,
} from "./workbench-preferences.js";
import {
  c4mlSyntaxThemePresets,
  c4mlSyntaxTokenRoles,
  resolveC4mlSyntaxTheme,
  type C4mlSyntaxThemePreset,
} from "./syntax-theme.js";

export type MonacoColorTheme = Readonly<Record<string, string>>;

export interface C4mlMonacoThemeDefinition {
  readonly name: string;
  readonly syntaxTheme: C4mlSyntaxThemePreset;
  readonly base: "vs" | "vs-dark";
  readonly inherit: true;
  readonly rules: readonly {
    readonly token: string;
    readonly foreground: string;
    readonly fontStyle?: string;
  }[];
  readonly colors: MonacoColorTheme;
}

interface PaletteColors {
  readonly background: string;
  readonly accent: string;
  readonly cursor: string;
  readonly selection: string;
  readonly inactiveSelection: string;
}

const lightPalettes: Readonly<Record<WorkbenchColorPalette, PaletteColors>> = {
  blue: palette("#FBFCFE", "#096D87", "#157CA3", "#B8DDE9", "#DCEAF0"),
  gray: palette("#FCFCFD", "#4F5D6B", "#66717E", "#D9DEE3", "#ECEFF2"),
  yellow: palette("#FFFDF7", "#765A09", "#8A6812", "#F1E2A8", "#F8F0D5"),
  green: palette("#FAFDFB", "#2F6D4F", "#34785B", "#C8E3D6", "#E5F2EB"),
  violet: palette("#FCFAFE", "#644E8E", "#705A9B", "#DED2EB", "#F0E9F7"),
  red: palette("#FEFAFB", "#953E4B", "#A34F5B", "#EBCDD2", "#F7E8EA"),
  orange: palette("#FFFBF7", "#8C4D0E", "#A45F1A", "#EED3B6", "#F8EADD"),
  turquoise: palette("#F9FDFC", "#126C69", "#177D79", "#BFE1DE", "#E1F1EF"),
};

const darkPalettes: Readonly<Record<WorkbenchColorPalette, PaletteColors>> = {
  blue: palette("#132132", "#7DD8E6", "#7DD8E6", "#24516E", "#203F57"),
  gray: palette("#1B1D20", "#B7C0CA", "#B7C0CA", "#3A4149", "#2D3238"),
  yellow: palette("#211E14", "#E6C45F", "#E6C45F", "#504519", "#3B351B"),
  green: palette("#142019", "#72C69A", "#72C69A", "#28543C", "#203D2F"),
  violet: palette("#1C1725", "#BBA0DE", "#BBA0DE", "#49345F", "#352943"),
  red: palette("#24181B", "#E89AA3", "#E89AA3", "#5D3038", "#45272D"),
  orange: palette("#231B14", "#E9AA6B", "#E9AA6B", "#5A3920", "#422D1D"),
  turquoise: palette("#122120", "#64C6BF", "#64C6BF", "#25514E", "#1D3B39"),
};

export const c4mlMonacoThemes: readonly C4mlMonacoThemeDefinition[] =
  workbenchColorPalettes.flatMap((palette) =>
    c4mlSyntaxThemePresets.flatMap((syntaxTheme) => [
      createTheme("light", palette, syntaxTheme, lightPalettes[palette]),
      createTheme("dark", palette, syntaxTheme, darkPalettes[palette]),
    ]),
  );

export function c4mlMonacoThemeName(
  scheme: EffectiveColorScheme,
  palette: WorkbenchColorPalette,
  syntaxTheme: C4mlSyntaxThemePreset,
): string {
  return `c4ml-${scheme}-${palette}-${syntaxTheme}`;
}

function createTheme(
  scheme: EffectiveColorScheme,
  palette: WorkbenchColorPalette,
  syntaxTheme: C4mlSyntaxThemePreset,
  colors: PaletteColors,
): C4mlMonacoThemeDefinition {
  const dark = scheme === "dark";
  const foreground = dark ? "#E4EEF8" : "#17263D";
  const syntax = resolveC4mlSyntaxTheme(syntaxTheme, scheme, colors.accent);

  return {
    name: c4mlMonacoThemeName(scheme, palette, syntaxTheme),
    syntaxTheme,
    base: dark ? "vs-dark" : "vs",
    inherit: true,
    rules: c4mlSyntaxTokenRoles.map((token) => {
      const role = syntax.roles[token];
      return role.fontStyle === undefined
        ? { token, foreground: withoutHash(role.foreground) }
        : {
            token,
            foreground: withoutHash(role.foreground),
            fontStyle: role.fontStyle,
          };
    }),
    colors: {
      "editor.background": colors.background,
      "editor.foreground": foreground,
      "editorLineNumber.foreground": dark ? "#71869A" : "#73869A",
      "editorLineNumber.activeForeground": dark ? "#C4D5E4" : "#40566B",
      "editorCursor.foreground": colors.cursor,
      "editor.selectionBackground": colors.selection,
      "editor.inactiveSelectionBackground": colors.inactiveSelection,
      "editorSuggestWidget.background": dark ? "#18222D" : "#FFFFFF",
      "editorSuggestWidget.border": dark ? "#657483" : "#9FB0C2",
      "editorSuggestWidget.foreground": dark ? "#DCE8F2" : "#26394E",
      "editorSuggestWidget.highlightForeground": colors.accent,
      "editorSuggestWidget.selectedBackground": colors.selection,
      "editorSuggestWidget.selectedForeground": dark ? "#FFFFFF" : "#17263D",
      "editorSuggestWidget.selectedIconForeground": colors.accent,
      "list.focusOutline": colors.cursor,
    },
  };
}

function palette(
  background: string,
  accent: string,
  cursor: string,
  selection: string,
  inactiveSelection: string,
): PaletteColors {
  return { background, accent, cursor, selection, inactiveSelection };
}

function withoutHash(color: string): string {
  return color.slice(1);
}
