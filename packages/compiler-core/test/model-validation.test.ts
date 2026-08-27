import { describe, expect, it } from "vitest";

import {
  type ArchitectureModel,
  validateArchitectureModel,
} from "../src/index.js";
import { signalGardenModel } from "./signal-garden.fixture.js";

describe("validateArchitectureModel", () => {
  it("accepts an original model containing the complete C4 element family", () => {
    const result = validateArchitectureModel(signalGardenModel);

    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(new Set(signalGardenModel.elements.map((element) => element.kind))).toEqual(
      new Set([
        "person",
        "software-system",
        "container",
        "component",
        "code-element",
      ]),
    );
  });

  it("reports a duplicate identifier at the later source with the first source related", () => {
    const first = signalGardenModel.elements[0]!;
    const duplicate = {
      ...first,
      source: {
        file: "duplicate.c4ml",
        range: {
          start: { line: 17, column: 2, offset: 172 },
          end: { line: 17, column: 8, offset: 178 },
        },
      },
    };
    const model: ArchitectureModel = {
      ...signalGardenModel,
      elements: [...signalGardenModel.elements, duplicate],
    };

    const diagnostic = validateArchitectureModel(model).diagnostics.find(
      ({ code }) => code === "C4ML-SEM-002",
    );

    expect(diagnostic?.source.file).toBe("duplicate.c4ml");
    expect(diagnostic?.source.range.start).toEqual({
      line: 17,
      column: 2,
      offset: 172,
    });
    expect(diagnostic?.related[0]?.source.file).toBe("signal-garden.c4ml");
  });

  it("rejects ownership that skips a C4 containment level", () => {
    const model: ArchitectureModel = {
      ...signalGardenModel,
      elements: signalGardenModel.elements.map((element) =>
        element.id === "request-mapper"
          ? { ...element, componentId: "signal-garden" }
          : element,
      ),
    };

    const result = validateArchitectureModel(model);

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "C4ML-SEM-008" }),
      ]),
    );
  });

  it("rejects a deployment instance that does not resolve to its static kind", () => {
    const deployment = signalGardenModel.deployment!;
    const model: ArchitectureModel = {
      ...signalGardenModel,
      deployment: {
        ...deployment,
        instances: [
          ...deployment.instances,
          {
            id: "invalid-container-instance",
            kind: "container-instance",
            environmentId: "production",
            nodeId: "prod-cluster",
            containerId: "weather-beacon",
          },
        ],
      },
    };

    const result = validateArchitectureModel(model);

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "C4ML-DEP-010" }),
      ]),
    );
  });

  it("keeps diagnostics deterministic when declarations are reordered", () => {
    const relationship = signalGardenModel.relationships[0]!;
    const model: ArchitectureModel = {
      ...signalGardenModel,
      relationships: [
        { ...relationship, description: "Uses" },
        ...signalGardenModel.relationships.slice(1),
      ],
    };
    const deployment = model.deployment!;
    const reordered: ArchitectureModel = {
      elements: [...model.elements].reverse(),
      relationships: [...model.relationships].reverse(),
      deployment: {
        environments: [...deployment.environments].reverse(),
        nodes: [...deployment.nodes].reverse(),
        infrastructureNodes: [...deployment.infrastructureNodes].reverse(),
        instances: [...deployment.instances].reverse(),
        relationships: [...deployment.relationships].reverse(),
      },
    };

    expect(validateArchitectureModel(reordered).diagnostics).toEqual(
      validateArchitectureModel(model).diagnostics,
    );
  });
});
