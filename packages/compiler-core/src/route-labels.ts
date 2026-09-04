/**
 * Deterministic, font-metric-free sizing of relationship labels.
 *
 * The same estimate feeds the layout request (so the engine reserves room
 * between layers) and the scene (so the renderer breaks the route line
 * around the label). Keeping both in one place guarantees they agree.
 */

const labelLineHeight = 13;
const technologyLineHeight = 12;
const labelCharacterWidth = 6.4;
const technologyCharacterWidth = 5.8;
const minimumTextWidth = 48;
const horizontalPadding = 12;
const verticalPadding = 8;

export interface RouteLabelSize {
  readonly width: number;
  readonly height: number;
}

export interface RouteLabelLines {
  readonly labelLines: readonly string[];
  readonly technologyLines: readonly string[];
}

export function wrapRouteLabel(
  label: string,
  technology: string | undefined,
): RouteLabelLines {
  return {
    labelLines: wrapText(label, 24, 3),
    technologyLines: technology === undefined ? [] : wrapText(technology, 28, 2),
  };
}

export function routeLabelSize(lines: RouteLabelLines): RouteLabelSize {
  const widestLabel = Math.max(0, ...lines.labelLines.map((line) => line.length));
  const widestTechnology = Math.max(
    0,
    ...lines.technologyLines.map((line) => line.length),
  );
  const textWidth = Math.max(
    minimumTextWidth,
    widestLabel * labelCharacterWidth,
    widestTechnology * technologyCharacterWidth,
  );
  return {
    width: textWidth + horizontalPadding,
    height:
      Math.max(1, lines.labelLines.length) * labelLineHeight +
      lines.technologyLines.length * technologyLineHeight +
      verticalPadding,
  };
}

export function estimateRouteLabelSize(
  label: string,
  technology: string | undefined,
): RouteLabelSize {
  return routeLabelSize(wrapRouteLabel(label, technology));
}

export function wrapText(
  text: string,
  maximumCharacters: number,
  maximumLines: number,
): string[] {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) {
    return [];
  }
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (candidate.length <= maximumCharacters || current.length === 0) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maximumLines - 1) {
      break;
    }
  }
  if (lines.length < maximumLines && current.length > 0) {
    const consumed = lines.join(" ").split(/\s+/u).filter(Boolean).length;
    const remaining = words.slice(consumed).join(" ");
    lines.push(
      remaining.length <= maximumCharacters
        ? remaining
        : `${remaining.slice(0, Math.max(1, maximumCharacters - 1)).trimEnd()}…`,
    );
  }
  return lines.slice(0, maximumLines);
}
