import { describe, expect, it } from "vitest";

import {
  ArchitectureMigrationError,
  createArchitectureMigrationStory,
  renderArchitectureMigrationHtml,
  resolveArchitectureSnapshot,
  serializeArchitectureMigrationStory,
  type ArchitectureMigrationState,
  type ArchitectureSnapshot,
  type SceneComparisonMode,
} from "../src/index.js";
import { signalGardenModel, signalGardenViews } from "./signal-garden.fixture.js";

function baseSnapshot(): ArchitectureSnapshot {
  return resolveArchitectureSnapshot(signalGardenModel, signalGardenViews).snapshot!;
}

function state(
  id: string,
  title: string,
  snapshot: ArchitectureSnapshot,
  reference: string,
): ArchitectureMigrationState {
  return {
    id,
    title,
    snapshot,
    provenance: { kind: "git", reference },
    review: { status: "reviewed" },
  };
}

function comparisonSvg(mode: SceneComparisonMode): string {
  return `<?xml version="1.0"?><svg data-c4ml-comparison-mode="${mode}"><metadata>C4ML</metadata><text>${mode}</text></svg>`;
}

describe("architecture migration stories", () => {
  it("composes reviewed states with deterministic change provenance", () => {
    const first = baseSnapshot();
    const second: ArchitectureSnapshot = {
      ...first,
      elements: first.elements.map((element) =>
        element.id === "cultivation-api"
          ? { ...element, name: "Cultivation Coordination API" }
          : element,
      ),
    };
    const third: ArchitectureSnapshot = {
      ...second,
      views: second.views.map((view) =>
        view.id === "signal-context"
          ? { ...view, layout: { direction: "down" } }
          : view,
      ),
    };
    const input = {
      id: "garden-evolution",
      title: "Garden evolution",
      description: "Two reviewed migration steps.",
      states: [
        state("baseline", "Baseline", first, "commit:a"),
        state("coordination", "Coordination", second, "commit:b"),
        state("layout-review", "Layout review", third, "commit:c"),
      ],
    };

    const story = createArchitectureMigrationStory(input);
    const again = createArchitectureMigrationStory(input);

    expect(story.transitions).toHaveLength(2);
    expect(story.transitions[0]).toMatchObject({
      id: "transition:baseline:coordination",
      sequence: 1,
      difference: { summary: { architecture: 1, layout: 0 } },
      changeProvenance: [{
        changeId: "model:renamed:element:cultivation-api",
        fromStateId: "baseline",
        toStateId: "coordination",
      }],
    });
    expect(story.transitions[1]).toMatchObject({
      sequence: 2,
      difference: { summary: { architecture: 0, layout: 1 } },
    });
    expect(serializeArchitectureMigrationStory(story)).toBe(
      serializeArchitectureMigrationStory(again),
    );
  });

  it("renders a self-contained navigable offline review", () => {
    const snapshot = baseSnapshot();
    const renamed: ArchitectureSnapshot = {
      ...snapshot,
      elements: snapshot.elements.map((element) =>
        element.id === "cultivation-api"
          ? { ...element, name: "Cultivation Coordination API" }
          : element,
      ),
    };
    const story = createArchitectureMigrationStory({
      id: "garden-evolution",
      title: "Garden <evolution>",
      description: "Offline review.",
      states: [
        state("baseline", "Baseline", snapshot, "main"),
        state("coordination", "Coordination", renamed, "feature/coordination"),
      ],
    });
    const html = renderArchitectureMigrationHtml(story, [{
      transitionId: story.transitions[0]!.id,
      views: [{
        viewId: "signal-containers",
        viewTitle: "Signal Garden Containers",
        svgByMode: {
          before: comparisonSvg("before"),
          after: comparisonSvg("after"),
          overlay: comparisonSvg("overlay"),
          "change-only": comparisonSvg("change-only"),
        },
      }],
    }]);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Garden &lt;evolution&gt;");
    expect(html).toContain('href="#migration-step-1"');
    expect(html).toContain('data-c4ml-comparison-mode="overlay"');
    expect(html).toContain("No network resources are required.");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("https://");
  });

  it("rejects unreviewed input and unsafe visual payloads", () => {
    const snapshot = baseSnapshot();
    expect(() => createArchitectureMigrationStory({
      id: "invalid",
      title: "Invalid",
      description: "Missing review.",
      states: [
        state("one", "One", snapshot, "a"),
        {
          ...state("two", "Two", snapshot, "b"),
          review: { status: "pending" } as never,
        },
      ],
    })).toThrowError(ArchitectureMigrationError);

    const story = createArchitectureMigrationStory({
      id: "safe",
      title: "Safe",
      description: "Safety test.",
      states: [state("one", "One", snapshot, "a"), state("two", "Two", snapshot, "b")],
    });
    expect(() => renderArchitectureMigrationHtml(story, [{
      transitionId: story.transitions[0]!.id,
      views: [{
        viewId: "view",
        viewTitle: "View",
        svgByMode: {
          before: comparisonSvg("before"),
          after: comparisonSvg("after"),
          overlay: comparisonSvg("overlay").replace("</svg>", "<script>alert(1)</script></svg>"),
          "change-only": comparisonSvg("change-only"),
        },
      }],
    }])).toThrowError(expect.objectContaining({ code: "C4ML-MIGRATION-006" }));

    expect(() => renderArchitectureMigrationHtml(story, [{
      transitionId: story.transitions[0]!.id,
      views: [{
        viewId: "view",
        viewTitle: "View",
        svgByMode: {
          before: comparisonSvg("before"),
          after: comparisonSvg("after"),
          overlay: comparisonSvg("overlay").replace(
            "</svg>",
            '<image href="file:///private/source.png" /></svg>',
          ),
          "change-only": comparisonSvg("change-only"),
        },
      }],
    }])).toThrowError(expect.objectContaining({ code: "C4ML-MIGRATION-006" }));
  });
});
