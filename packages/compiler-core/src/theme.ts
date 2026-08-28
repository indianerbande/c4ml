import { ContractError } from "./layout.js";
import type { SemanticElementKind } from "./model.js";

export const sceneElementRoles = [
  "person",
  "software-system",
  "container",
  "component",
  "code-element",
  "software-system-instance",
  "container-instance",
  "infrastructure-node",
] as const;

export type SceneElementRole = SemanticElementKind;
export type SceneElementState = "external" | "internal";
export type SceneThemePresetId = "c4ml-blue" | "c4ml-garden";

export interface SceneCanvasColors {
  readonly background: string;
  readonly foreground: string;
  readonly muted: string;
}

export interface SceneElementColors {
  readonly fill: string;
  readonly border: string;
  readonly accent: string;
  readonly title: string;
  readonly metadata: string;
  readonly description: string;
}

export interface SceneElementRoleColors {
  readonly internal: SceneElementColors;
  readonly external: SceneElementColors;
}

export interface SceneBoundaryColors {
  readonly fill: string;
  readonly border: string;
  readonly title: string;
  readonly metadata: string;
}

export interface SceneRouteColors {
  readonly guided: string;
  readonly automatic: string;
  readonly fixed: string;
  readonly label: string;
  readonly technology: string;
}

export interface SceneTheme {
  readonly id: string;
  readonly canvas: SceneCanvasColors;
  readonly elements: Readonly<Record<SceneElementRole, SceneElementRoleColors>>;
  readonly boundaries: {
    readonly scope: SceneBoundaryColors;
    readonly group: SceneBoundaryColors;
    readonly deployment: SceneBoundaryColors;
  };
  readonly routes: SceneRouteColors;
}

export interface SceneThemeOverrides {
  readonly id?: string;
  readonly preset?: SceneThemePresetId;
  readonly canvas?: Partial<SceneCanvasColors>;
  readonly elements?: Partial<
    Record<
      SceneElementRole,
      {
        readonly internal?: Partial<SceneElementColors>;
        readonly external?: Partial<SceneElementColors>;
      }
    >
  >;
  readonly boundaries?: {
    readonly scope?: Partial<SceneBoundaryColors>;
    readonly group?: Partial<SceneBoundaryColors>;
    readonly deployment?: Partial<SceneBoundaryColors>;
  };
  readonly routes?: Partial<SceneRouteColors>;
}

export type SceneThemeSelection = SceneThemePresetId | SceneThemeOverrides;

const lightText = "#FFFFFF";
const lightMetadata = "#E6F1F8";
const darkText = "#102A43";
const darkMetadata = "#425B70";

const neutralExternalDark = elementColors({
  fill: "#4E5966",
  border: "#333C46",
  accent: "#AFC1CF",
  title: lightText,
  metadata: lightMetadata,
  description: lightText,
});
const neutralExternalPerson = elementColors({
  fill: "#4E5966",
  border: "#333C46",
  accent: "#FFFFFF",
  title: lightText,
  metadata: lightMetadata,
  description: lightText,
});
const neutralExternalMedium = elementColors({
  fill: "#65717E",
  border: "#46515C",
  accent: "#C1CED8",
  title: lightText,
  metadata: lightText,
  description: lightText,
});
const neutralExternalLight = elementColors({
  fill: "#D7DDE3",
  border: "#8A98A6",
  accent: "#65717E",
  title: darkText,
  metadata: darkMetadata,
  description: darkText,
});

const c4mlBlueTheme: SceneTheme = {
  id: "c4ml-blue",
  canvas: {
    background: "#F5F8FB",
    foreground: "#173F5F",
    muted: "#526A7B",
  },
  elements: {
    person: {
      internal: elementColors({
        fill: "#173F5F",
        border: "#0E2C45",
        accent: "#FFFFFF",
        title: lightText,
        metadata: lightMetadata,
        description: lightText,
      }),
      external: neutralExternalPerson,
    },
    "software-system": {
      internal: elementColors({
        fill: "#215A8E",
        border: "#16466F",
        accent: "#7BC3EE",
        title: lightText,
        metadata: lightMetadata,
        description: lightText,
      }),
      external: neutralExternalDark,
    },
    container: {
      internal: elementColors({
        fill: "#2B6F9F",
        border: "#1C5278",
        accent: "#8FD2F5",
        title: lightText,
        metadata: lightMetadata,
        description: lightText,
      }),
      external: neutralExternalMedium,
    },
    component: {
      internal: elementColors({
        fill: "#C7E3F4",
        border: "#6D9FC3",
        accent: "#2B6F9F",
        title: darkText,
        metadata: darkMetadata,
        description: darkText,
      }),
      external: neutralExternalLight,
    },
    "code-element": {
      internal: elementColors({
        fill: "#E6F2FA",
        border: "#8EB7D2",
        accent: "#3D7FA8",
        title: darkText,
        metadata: darkMetadata,
        description: darkText,
      }),
      external: neutralExternalLight,
    },
    "software-system-instance": {
      internal: elementColors({
        fill: "#285E8C",
        border: "#173F5F",
        accent: "#83C8EE",
        title: lightText,
        metadata: lightMetadata,
        description: lightText,
      }),
      external: neutralExternalDark,
    },
    "container-instance": {
      internal: elementColors({
        fill: "#367CAC",
        border: "#215A7B",
        accent: "#A6D9F4",
        title: lightText,
        metadata: lightText,
        description: lightText,
      }),
      external: neutralExternalMedium,
    },
    "infrastructure-node": {
      internal: elementColors({
        fill: "#6C4BA0",
        border: "#4D3474",
        accent: "#C5B5E3",
        title: lightText,
        metadata: lightMetadata,
        description: lightText,
      }),
      external: neutralExternalDark,
    },
  },
  boundaries: {
    scope: boundaryColors("#EAF3F8", "#276E9C", "#173F5F", "#425B70"),
    group: boundaryColors("#F0EFF8", "#665AA8", "#322B61", "#5C5680"),
    deployment: boundaryColors("#EDF3FA", "#456F9A", "#173F5F", "#425B70"),
  },
  routes: {
    guided: "#244A64",
    automatic: "#5B6F7D",
    fixed: "#9A3D50",
    label: "#173F5F",
    technology: "#526A7B",
  },
};

const gardenInternal = elementColors({
  fill: "#FFFFFF",
  border: "#5B7774",
  accent: "#1F8A70",
  title: "#173A3A",
  metadata: "#526968",
  description: "#173A3A",
});
const gardenExternal = elementColors({
  fill: "#FFF3CC",
  border: "#B57900",
  accent: "#1F8A70",
  title: "#173A3A",
  metadata: "#526968",
  description: "#173A3A",
});
const gardenRoles = Object.fromEntries(
  sceneElementRoles.map((role) => [
    role,
    { internal: gardenInternal, external: gardenExternal },
  ]),
) as unknown as Readonly<Record<SceneElementRole, SceneElementRoleColors>>;

const c4mlGardenTheme: SceneTheme = {
  id: "c4ml-garden",
  canvas: {
    background: "#F7F9F7",
    foreground: "#173A3A",
    muted: "#526968",
  },
  elements: gardenRoles,
  boundaries: {
    scope: boundaryColors("#E8F3EF", "#277A70", "#173A3A", "#526968"),
    group: boundaryColors("#F2EDFA", "#7654A5", "#173A3A", "#526968"),
    deployment: boundaryColors("#E7F0FA", "#3B6F9F", "#173A3A", "#526968"),
  },
  routes: {
    guided: "#173A3A",
    automatic: "#526968",
    fixed: "#A13B3B",
    label: "#173A3A",
    technology: "#526968",
  },
};

const presets: Readonly<Record<SceneThemePresetId, SceneTheme>> = {
  "c4ml-blue": c4mlBlueTheme,
  "c4ml-garden": c4mlGardenTheme,
};

export const sceneThemePresetIds = Object.keys(
  presets,
) as readonly SceneThemePresetId[];

export function resolveSceneTheme(
  selection: SceneThemeSelection | string | undefined,
): SceneTheme {
  if (selection === undefined) {
    return cloneTheme(c4mlBlueTheme);
  }
  if (typeof selection === "string") {
    return cloneTheme(requiredPreset(selection));
  }

  const base = requiredPreset(selection.preset ?? "c4ml-blue");
  const resolved: SceneTheme = {
    id: selection.id ?? (hasThemeOverrides(selection) ? `${base.id}-custom` : base.id),
    canvas: { ...base.canvas, ...selection.canvas },
    elements: Object.fromEntries(
      sceneElementRoles.map((role) => [
        role,
        {
          internal: {
            ...base.elements[role].internal,
            ...selection.elements?.[role]?.internal,
          },
          external: {
            ...base.elements[role].external,
            ...selection.elements?.[role]?.external,
          },
        },
      ]),
    ) as unknown as Readonly<Record<SceneElementRole, SceneElementRoleColors>>,
    boundaries: {
      scope: { ...base.boundaries.scope, ...selection.boundaries?.scope },
      group: { ...base.boundaries.group, ...selection.boundaries?.group },
      deployment: {
        ...base.boundaries.deployment,
        ...selection.boundaries?.deployment,
      },
    },
    routes: { ...base.routes, ...selection.routes },
  };
  validateSceneTheme(resolved);
  return resolved;
}

export function contrastRatio(first: string, second: string): number {
  const brighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (brighter + 0.05) / (darker + 0.05);
}

function requiredPreset(id: string): SceneTheme {
  const preset = presets[id as SceneThemePresetId];
  if (preset === undefined) {
    throw new ContractError(
      "C4ML-THEME-001",
      `Unknown scene theme ${id}. Available presets: ${sceneThemePresetIds.join(", ")}.`,
    );
  }
  return preset;
}

export function validateSceneTheme(theme: SceneTheme): void {
  if (theme.id.trim().length === 0) {
    throw new ContractError("C4ML-THEME-002", "Scene theme identifier is empty.");
  }
  for (const [path, color] of themeColors(theme)) {
    if (!/^#[0-9a-f]{6}$/iu.test(color)) {
      throw new ContractError(
        "C4ML-THEME-003",
        `Scene theme color ${path} must be a six-digit hexadecimal value.`,
      );
    }
  }
}

function themeColors(theme: SceneTheme): Array<readonly [string, string]> {
  const colors: Array<readonly [string, string]> = [
    ["canvas.background", theme.canvas.background],
    ["canvas.foreground", theme.canvas.foreground],
    ["canvas.muted", theme.canvas.muted],
  ];
  for (const role of sceneElementRoles) {
    for (const state of ["internal", "external"] as const) {
      for (const [token, color] of Object.entries(theme.elements[role][state])) {
        colors.push([`elements.${role}.${state}.${token}`, color]);
      }
    }
  }
  for (const [kind, values] of Object.entries(theme.boundaries)) {
    for (const [token, color] of Object.entries(values)) {
      colors.push([`boundaries.${kind}.${token}`, color]);
    }
  }
  for (const [token, color] of Object.entries(theme.routes)) {
    colors.push([`routes.${token}`, color]);
  }
  return colors;
}

function cloneTheme(theme: SceneTheme): SceneTheme {
  return resolveSceneTheme({ preset: theme.id as SceneThemePresetId });
}

function hasThemeOverrides(selection: SceneThemeOverrides): boolean {
  return (
    selection.canvas !== undefined ||
    selection.elements !== undefined ||
    selection.boundaries !== undefined ||
    selection.routes !== undefined
  );
}

function elementColors(colors: SceneElementColors): SceneElementColors {
  return colors;
}

function boundaryColors(
  fill: string,
  border: string,
  title: string,
  metadata: string,
): SceneBoundaryColors {
  return { fill, border, title, metadata };
}

function relativeLuminance(color: string): number {
  if (!/^#[0-9a-f]{6}$/iu.test(color)) {
    throw new ContractError(
      "C4ML-THEME-003",
      `Contrast color ${color} must be a six-digit hexadecimal value.`,
    );
  }
  const channels = [1, 3, 5].map(
    (index) => Number.parseInt(color.slice(index, index + 2), 16) / 255,
  );
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return red! * 0.2126 + green! * 0.7152 + blue! * 0.0722;
}
