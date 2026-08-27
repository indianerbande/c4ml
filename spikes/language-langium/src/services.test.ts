import { describe, expect, it } from "vitest";
import { parseHelper } from "langium/test";

import type { ProbeFile } from "./generated/ast.js";
import { createPhaseZeroProbeServices } from "./services.js";

const originalProbe = `atlas signal-garden {
  # Original Phase 0 fixture; this is deliberately not C4ML syntax.
  marker seed-bank caption "Seed bank"
  marker signal-bloom caption "Signal bloom"
  trail germination starts seed-bank arrives signal-bloom
}`;

describe("Langium Phase 0 probe", () => {
  it("parses an original disposable grammar and resolves references", async () => {
    const services = createPhaseZeroProbeServices();
    const parse = parseHelper<ProbeFile>(services);

    const document = await parse(originalProbe, { validation: true });

    expect(document.parseResult.lexerErrors).toHaveLength(0);
    expect(document.parseResult.parserErrors).toHaveLength(0);
    expect(document.diagnostics ?? []).toHaveLength(0);
    expect(document.parseResult.value.trails[0]!.source.ref?.name).toBe(
      "seed-bank",
    );
    expect(document.parseResult.value.trails[0]!.target.ref?.name).toBe(
      "signal-bloom",
    );
  });

  it("reports an unresolved cross-reference with a source range", async () => {
    const services = createPhaseZeroProbeServices();
    const parse = parseHelper<ProbeFile>(services);
    const invalid = `atlas signal-garden {
  marker seed-bank caption "Seed bank"
  trail lost starts seed-bank arrives absent-bloom
}`;

    const document = await parse(invalid, { validation: true });
    const diagnostic = (document.diagnostics ?? []).find((item) =>
      typeof item.message === "string" && item.message.includes("absent-bloom"),
    );

    expect(diagnostic).toBeDefined();
    expect(diagnostic!.range.start.line).toBe(2);
    expect(diagnostic!.range.end.character).toBeGreaterThan(
      diagnostic!.range.start.character,
    );
  });
});
