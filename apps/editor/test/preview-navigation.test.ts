import { describe, expect, it } from "vitest";

import type {
  CompilerWorkerNavigation,
  CompilerWorkerNavigationTarget,
} from "../src/app/compiler-worker.protocol.js";
import {
  clientPointToScene,
  navigationTargetAtPoint,
  navigationTargetForOffset,
  svgWithNavigationHighlight,
} from "../src/app/preview-navigation.js";

const viewTarget: CompilerWorkerNavigationTarget = {
  sceneNodeId: "scene-node:view",
  svgElementId: "c4ml-scene-node-view",
  referenceId: "context",
  label: "Context",
  source: {
    file: "editor.c4ml",
    start: { offset: 100, line: 5, column: 0 },
    end: { offset: 400, line: 20, column: 1 },
  },
  bounds: { x: 20, y: 20, width: 700, height: 400 },
};

const elementTarget: CompilerWorkerNavigationTarget = {
  sceneNodeId: "scene-node:element:garden-pulse",
  svgElementId: "c4ml-scene-node-element-garden-pulse",
  referenceId: "garden-pulse",
  label: "Garden Pulse",
  source: {
    file: "editor.c4ml",
    start: { offset: 180, line: 9, column: 2 },
    end: { offset: 260, line: 13, column: 3 },
  },
  bounds: { x: 500, y: 80, width: 200, height: 120 },
};

describe("preview navigation", () => {
  it("selects the narrowest source range at the cursor", () => {
    expect(
      navigationTargetForOffset([viewTarget, elementTarget], 210)?.referenceId,
    ).toBe("garden-pulse");
    expect(navigationTargetForOffset([viewTarget, elementTarget], 50)).toBeUndefined();
  });

  it("selects the smallest geometry under a preview point", () => {
    expect(
      navigationTargetAtPoint([viewTarget, elementTarget], { x: 550, y: 120 })
        ?.referenceId,
    ).toBe("garden-pulse");
    expect(
      navigationTargetAtPoint([viewTarget, elementTarget], { x: 10, y: 10 }),
    ).toBeUndefined();
  });

  it("maps a letterboxed image click into scene coordinates", () => {
    const navigation: CompilerWorkerNavigation = {
      width: 800,
      height: 600,
      targets: [],
    };
    expect(
      clientPointToScene(
        { x: 500, y: 250 },
        { left: 0, top: 0, width: 1_000, height: 500 },
        navigation,
      ),
    ).toEqual({ x: 400, y: 300 });
    expect(
      clientPointToScene(
        { x: 50, y: 250 },
        { left: 0, top: 0, width: 1_000, height: 500 },
        navigation,
      ),
    ).toBeUndefined();
  });

  it("adds a preview-only highlight for the selected compiler node", () => {
    const svg = '<svg><g id="c4ml-scene-node-element-garden-pulse"></g></svg>';
    const highlighted = svgWithNavigationHighlight(svg, elementTarget);

    expect(highlighted).toContain('id="c4ml-editor-selection"');
    expect(highlighted).toContain(
      "#c4ml-scene-node-element-garden-pulse .element-surface",
    );
    expect(svg).not.toContain("c4ml-editor-selection");
  });
});
