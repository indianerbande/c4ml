import { describe, expect, it } from "vitest";

import {
  ArchitecturePublicationError,
  parseArchitecturePublication,
  validateArchitecturePublicationViews,
} from "../src/index.js";

describe("portable architecture publication", () => {
  it("preserves View order and normalizes render profiles", () => {
    const result = parseArchitecturePublication(JSON.stringify({
      version: 1,
      id: "review",
      views: [
        { viewId: "context", caption: "System context" },
        { viewId: "containers" },
      ],
      profiles: [{ id: "review", formats: ["svg", "png"], scale: 2, background: "theme" }],
    }));
    expect(result).toMatchObject({ valid: true, publication: { id: "review" } });
    if (!result.valid) return;
    expect(result.publication.views.map(({ viewId }) => viewId)).toEqual(["context", "containers"]);
    validateArchitecturePublicationViews(result.publication, [
      { id: "context" }, { id: "containers" },
    ] as never);
  });

  it("rejects malformed profiles and unknown compiled Views", () => {
    expect(parseArchitecturePublication("{")).toMatchObject({
      valid: false, error: { code: "C4ML-PUBLICATION-001" },
    });
    const result = parseArchitecturePublication(JSON.stringify({
      version: 1,
      id: "review",
      views: [{ viewId: "missing" }],
      profiles: [{ id: "review", formats: ["svg"], scale: 1, background: "transparent" }],
    }));
    if (!result.valid) throw result.error;
    expect(() => validateArchitecturePublicationViews(result.publication, []))
      .toThrowError(expect.objectContaining<Partial<ArchitecturePublicationError>>({
        code: "C4ML-PUBLICATION-002",
      }));
  });
});
