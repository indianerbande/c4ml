import { describe, expect, it } from "vitest";

import {
  type ArchitectureView,
  resolveArchitectureView,
} from "../src/index.js";
import {
  signalGardenModel,
  signalGardenViews,
} from "./signal-garden.fixture.js";

function viewOfKind<K extends ArchitectureView["kind"]>(
  kind: K,
): Extract<ArchitectureView, { kind: K }> {
  return signalGardenViews.find(
    (view): view is Extract<ArchitectureView, { kind: K }> =>
      view.kind === kind,
  )!;
}

describe("visual group resolution", () => {
  it("resolves deterministic nested groups without changing C4 identity", () => {
    const context = viewOfKind("system-context");
    const view: ArchitectureView = {
      ...context,
      groups: [
        {
          id: "context-participants",
          title: "Context Participants",
          members: [
            { kind: "element", id: "signal-garden" },
            { kind: "group", id: "external-participants" },
          ],
        },
        {
          id: "external-participants",
          title: "External Participants",
          description: "People and systems outside the focal system.",
          members: [
            { kind: "element", id: "weather-beacon" },
            { kind: "element", id: "grower" },
          ],
          layout: { keepTogether: true, padding: 32 },
        },
      ],
    };

    const result = resolveArchitectureView(signalGardenModel, view);
    const resolved = result.views[0]!;
    const baseline = resolveArchitectureView(signalGardenModel, context)
      .views[0]!;

    expect(result.valid).toBe(true);
    expect(resolved.elements).toEqual(baseline.elements);
    expect(resolved.relationships).toEqual(baseline.relationships);
    expect(resolved.groups.map(({ id }) => id)).toEqual([
      "context-participants",
      "external-participants",
    ]);
    expect(resolved.groups[0]?.members).toEqual([
      {
        kind: "element",
        element: signalGardenModel.elements.find(
          ({ id }) => id === "signal-garden",
        ),
      },
      { kind: "group", groupId: "external-participants" },
    ]);
    expect(resolved.groups[1]?.members).toEqual([
      {
        kind: "element",
        element: signalGardenModel.elements.find(({ id }) => id === "grower"),
      },
      {
        kind: "element",
        element: signalGardenModel.elements.find(
          ({ id }) => id === "weather-beacon",
        ),
      },
    ]);
    expect(resolved.groups[1]?.layout).toEqual({
      keepTogether: true,
      padding: 32,
    });
    expect(resolved.legend.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Visual Group" }),
      ]),
    );
  });

  it("does not let a group import an element outside the view scope", () => {
    const context = viewOfKind("system-context");
    const result = resolveArchitectureView(signalGardenModel, {
      ...context,
      groups: [
        {
          id: "illegal-detail",
          title: "Illegal Detail",
          members: [
            {
              kind: "element",
              id: "studio-ui",
              source: {
                file: "grouping.c4ml",
                range: {
                  start: { line: 8, column: 4, offset: 84 },
                  end: { line: 8, column: 13, offset: 93 },
                },
              },
            },
          ],
        },
      ],
    });

    const diagnostic = result.diagnostics.find(
      ({ code }) => code === "C4ML-GROUP-005",
    );
    expect(result.valid).toBe(false);
    expect(result.views).toEqual([]);
    expect(diagnostic?.source.file).toBe("grouping.c4ml");
    expect(diagnostic?.source.range.start.offset).toBe(84);
  });

  it("rejects cyclic nested groups", () => {
    const landscape = viewOfKind("system-landscape");
    const result = resolveArchitectureView(signalGardenModel, {
      ...landscape,
      groups: [
        {
          id: "first",
          title: "First",
          members: [{ kind: "group", id: "second" }],
        },
        {
          id: "second",
          title: "Second",
          members: [{ kind: "group", id: "first" }],
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "C4ML-GROUP-007" }),
      ]),
    );
  });

  it("rejects overlapping direct group membership", () => {
    const context = viewOfKind("system-context");
    const result = resolveArchitectureView(signalGardenModel, {
      ...context,
      groups: [
        {
          id: "first",
          title: "First",
          members: [{ kind: "element", id: "grower" }],
        },
        {
          id: "second",
          title: "Second",
          members: [{ kind: "element", id: "grower" }],
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "C4ML-GROUP-006" }),
      ]),
    );
  });

  it.each([
    {
      name: "empty identifier",
      code: "C4ML-GROUP-001",
      groups: [
        {
          id: "",
          title: "Empty Identifier",
          members: [{ kind: "element" as const, id: "grower" }],
        },
      ],
    },
    {
      name: "duplicate identifier",
      code: "C4ML-GROUP-002",
      groups: [
        {
          id: "duplicate",
          title: "First",
          members: [{ kind: "element" as const, id: "grower" }],
        },
        {
          id: "duplicate",
          title: "Second",
          members: [{ kind: "element" as const, id: "weather-beacon" }],
        },
      ],
    },
    {
      name: "empty title",
      code: "C4ML-GROUP-003",
      groups: [
        {
          id: "untitled",
          title: "",
          members: [{ kind: "element" as const, id: "grower" }],
        },
      ],
    },
    {
      name: "empty membership",
      code: "C4ML-GROUP-004",
      groups: [{ id: "empty", title: "Empty", members: [] }],
    },
    {
      name: "invalid padding",
      code: "C4ML-GROUP-008",
      groups: [
        {
          id: "invalid-padding",
          title: "Invalid Padding",
          members: [{ kind: "element" as const, id: "grower" }],
          layout: { padding: -1 },
        },
      ],
    },
  ])("rejects $name", ({ groups, code }) => {
    const context = viewOfKind("system-context");
    const result = resolveArchitectureView(signalGardenModel, {
      ...context,
      groups,
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code })]),
    );
  });

  it("groups visible Deployment Nodes, infrastructure, and instances", () => {
    const deployment = viewOfKind("deployment");
    const result = resolveArchitectureView(signalGardenModel, {
      ...deployment,
      groups: [
        {
          id: "application-runtime",
          title: "Application Runtime",
          members: [
            { kind: "deployment-instance", id: "prod-api" },
            { kind: "deployment-node", id: "prod-cluster" },
            { kind: "infrastructure-node", id: "prod-gateway" },
          ],
        },
      ],
    });

    const resolved = result.views[0]!;
    expect(result.valid).toBe(true);
    expect(resolved.groups[0]?.members.map(({ kind }) => kind)).toEqual([
      "deployment-instance",
      "deployment-node",
      "infrastructure-node",
    ]);
    const instanceMember = resolved.groups[0]?.members[0];
    expect(
      instanceMember?.kind === "deployment-instance"
        ? instanceMember.instance
        : undefined,
    ).toBe(
      signalGardenModel.deployment?.instances.find(
        ({ id }) => id === "prod-api",
      ),
    );
  });

  it("sorts groups and members independently of declaration order", () => {
    const context = viewOfKind("system-context");
    const forward = resolveArchitectureView(signalGardenModel, {
      ...context,
      groups: [
        {
          id: "external",
          title: "External",
          members: [
            { kind: "element", id: "weather-beacon" },
            { kind: "element", id: "grower" },
          ],
        },
      ],
    });
    const reversed = resolveArchitectureView(signalGardenModel, {
      ...context,
      groups: [
        {
          id: "external",
          title: "External",
          members: [
            { kind: "element", id: "grower" },
            { kind: "element", id: "weather-beacon" },
          ],
        },
      ],
    });

    expect(reversed.views[0]?.groups).toEqual(forward.views[0]?.groups);
  });
});
