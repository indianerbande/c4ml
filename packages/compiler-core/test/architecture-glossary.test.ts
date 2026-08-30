import { describe, expect, it } from "vitest";

import {
  findArchitectureGlossaryEntry,
  parseArchitectureGlossary,
} from "../src/index.js";

describe("portable architecture glossary", () => {
  it("normalizes entries and resolves terms, acronyms, and aliases", () => {
    const result = parseArchitectureGlossary(JSON.stringify({
      version: 1,
      id: "garden-terms",
      entries: [
        {
          id: "sensor",
          term: "Sensor Post",
          kind: "term",
          definition: "A local device that reports garden conditions.",
          aliases: ["Field Sensor"],
        },
        {
          id: "api",
          term: "API",
          kind: "acronym",
          expansion: "Application Programming Interface",
          definition: "The defined boundary used by software components.",
        },
      ],
    }));

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.glossary.entries.map(({ id }) => id)).toEqual(["api", "sensor"]);
    expect(findArchitectureGlossaryEntry(result.glossary, "api")?.expansion)
      .toBe("Application Programming Interface");
    expect(findArchitectureGlossaryEntry(result.glossary, "field sensor")?.id)
      .toBe("sensor");
  });

  it("rejects malformed entries and case-insensitive label collisions", () => {
    expect(parseArchitectureGlossary("{")).toMatchObject({
      valid: false,
      error: { code: "C4ML-GLOSSARY-001" },
    });
    expect(parseArchitectureGlossary(JSON.stringify({
      version: 1,
      id: "duplicate",
      entries: [
        { id: "one", term: "API", kind: "acronym", expansion: "One", definition: "One." },
        { id: "two", term: "api", kind: "term", definition: "Two." },
      ],
    }))).toMatchObject({
      valid: false,
      error: { code: "C4ML-GLOSSARY-002" },
    });
    expect(parseArchitectureGlossary(JSON.stringify({
      version: 1,
      id: "missing-expansion",
      entries: [{ id: "api", term: "API", kind: "acronym", definition: "Boundary." }],
    }))).toMatchObject({
      valid: false,
      error: { code: "C4ML-GLOSSARY-001" },
    });
  });
});
