import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  compileArchitectureDiagram,
  type LayoutAdapter,
  type LayoutRequest,
  type LayoutResult,
} from "@c4ml/compiler-core";

import { parseC4mlDraft } from "../src/index.js";

const helloContextUrl = new URL(
  "../../../examples/draft/hello-context.c4ml",
  import.meta.url,
);

class RowLayoutAdapter implements LayoutAdapter {
  readonly adapterId = "test.language-row-layout";

  async layout(request: LayoutRequest): Promise<LayoutResult> {
    const nodes = request.nodes.map((node, index) => ({
      ...node,
      x: 40 + index * 330,
      y: 80,
    }));
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    return {
      requestId: request.id,
      width: 40 + nodes.length * 330,
      height: 320,
      nodes,
      edges: request.edges.map((edge) => {
        const source = nodeById.get(edge.sourceId)!;
        const target = nodeById.get(edge.targetId)!;
        return {
          id: edge.id,
          sections: [
            {
              start: {
                x: source.x + source.width / 2,
                y: source.y + source.height / 2,
              },
              bends: [],
              end: {
                x: target.x + target.width / 2,
                y: target.y + target.height / 2,
              },
            },
          ],
        };
      }),
    };
  }
}

async function helloContextSource(): Promise<string> {
  return readFile(helloContextUrl, "utf8");
}

describe("C4ML draft-1 language slice", () => {
  it("parses and lowers the original hello-context source", async () => {
    const source = await helloContextSource();
    const result = await parseC4mlDraft(source, {
      file: "examples/draft/hello-context.c4ml",
    });

    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.languageVersion).toBe("draft-1");
    expect(result.model?.elements.map(({ id }) => id)).toEqual([
      "caretaker",
      "garden-pulse",
      "sensor-post",
    ]);
    expect(result.model?.relationships.map(({ id }) => id)).toEqual([
      "caretaker-reviews-plan",
      "sensor-publishes-observations",
    ]);
    expect(result.views).toHaveLength(1);
    expect(result.views?.[0]).toMatchObject({
      id: "garden-pulse-context",
      kind: "system-context",
      softwareSystemId: "garden-pulse",
      layout: { direction: "right" },
      legend: { mode: "generated" },
    });
    expect(result.resolvedViews?.[0]?.elements).toHaveLength(3);
    const caretakerSource = result.model?.elements[0]?.source;
    expect(caretakerSource?.file).toBe("examples/draft/hello-context.c4ml");
    expect(caretakerSource?.range.start).toMatchObject({ line: 5, column: 2 });
    expect(caretakerSource?.range.end).toMatchObject({ line: 9, column: 3 });
    expect(
      source.slice(
        caretakerSource?.range.start.offset,
        caretakerSource?.range.end.offset,
      ),
    ).toBe(
      [
        "person caretaker {",
        '    name = "Garden Caretaker"',
        '    responsibility = "Reviews cultivation signals and schedules garden work."',
        "    classification = external",
        "  }",
      ].join("\n"),
    );
  });

  it("runs the parsed source through the shared compiler to deterministic SVG", async () => {
    const source = await helloContextSource();
    const parsed = await parseC4mlDraft(source, {
      file: "examples/draft/hello-context.c4ml",
    });
    const request = {
      model: parsed.model!,
      view: parsed.views![0]!,
      layoutAdapter: new RowLayoutAdapter(),
    };

    const first = await compileArchitectureDiagram(request);
    const second = await compileArchitectureDiagram(request);

    expect(first.valid).toBe(true);
    expect(first.svg).toBe(second.svg);
    expect(first.svg).toContain("System Context — Garden Pulse");
    expect(first.svg).toContain("Garden Caretaker");
    expect(first.svg).toContain("Sensor Post");
    expect(first.svg).toContain('data-c4ml-shape="c4ml-person"');
  });

  it("reports unresolved references with a stable source-located diagnostic", async () => {
    const source = (await helloContextSource()).replace(
      "to = garden-pulse",
      "to = absent-system",
    );
    const result = await parseC4mlDraft(source, {
      file: "broken-reference.c4ml",
    });
    const diagnostic = result.diagnostics.find(
      ({ code }) => code === "C4ML-LANG-003",
    );

    expect(result.valid).toBe(false);
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.message).toContain("absent-system");
    expect(diagnostic?.source.file).toBe("broken-reference.c4ml");
    expect(
      source.slice(
        diagnostic?.source.range.start.offset,
        diagnostic?.source.range.end.offset,
      ),
    ).toBe("absent-system");
    expect(diagnostic?.source.range.start).toMatchObject({
      line: 27,
      column: 9,
    });
    expect(diagnostic?.source.range.end).toMatchObject({
      line: 27,
      column: 22,
    });
  });

  it("rejects missing and duplicate required properties", async () => {
    const source = (await helloContextSource())
      .replace(/  purpose = .*\n/, "")
      .replace(
        '    name = "Garden Caretaker"',
        '    name = "Garden Caretaker"\n    name = "Duplicate"',
      );
    const result = await parseC4mlDraft(source);

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      "C4ML-LANG-102",
      "C4ML-LANG-101",
    ]);
    expect(result.diagnostics[0]?.related).toHaveLength(1);
  });

  it("keeps semantic content stable across comments and whitespace", async () => {
    const source = await helloContextSource();
    const variant = source.replace(
      "model {",
      "model {\n\n  // Formatting-only variant",
    );
    const first = await parseC4mlDraft(source);
    const second = await parseC4mlDraft(variant);

    expect(semanticSnapshot(first)).toEqual(semanticSnapshot(second));
  });
});

function semanticSnapshot(result: Awaited<ReturnType<typeof parseC4mlDraft>>) {
  return {
    elements: result.model?.elements.map(
      ({ id, kind, name, description, classification }) => ({
        id,
        kind,
        name,
        description,
        classification,
      }),
    ),
    relationships: result.model?.relationships.map(
      ({ id, sourceId, targetId, description }) => ({
        id,
        sourceId,
        targetId,
        description,
      }),
    ),
    views: result.views?.map(
      ({ id, kind, title, purpose, legend, layout }) => ({
        id,
        kind,
        title,
        purpose,
        legend,
        layout,
      }),
    ),
  };
}
