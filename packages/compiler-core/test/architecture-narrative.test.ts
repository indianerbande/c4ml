import { describe, expect, it } from "vitest";

import { parseArchitectureNarrative } from "../src/index.js";

describe("portable architecture narratives", () => {
  it("parses deterministic metadata, Markdown body, and local links", () => {
    const result = parseArchitectureNarrative(`---
c4ml-narrative: 1
id: garden-overview
title: Garden overview
---
## Purpose

Garden Pulse helps growers. See the [glossary](knowledge/garden.c4ml-glossary.json#sensor-post).
`);

    expect(result).toMatchObject({
      valid: true,
      narrative: {
        version: 1,
        id: "garden-overview",
        title: "Garden overview",
        localLinks: ["knowledge/garden.c4ml-glossary.json#sensor-post"],
      },
    });
  });

  it("rejects malformed metadata and unsafe active or remote content", () => {
    expect(parseArchitectureNarrative("# No metadata")).toMatchObject({
      valid: false,
      error: { code: "C4ML-NARRATIVE-001" },
    });
    expect(parseArchitectureNarrative(`---
c4ml-narrative: 1
id: unsafe
title: Unsafe
---
<script>alert(1)</script>
`)).toMatchObject({ valid: false, error: { code: "C4ML-NARRATIVE-002" } });
    expect(parseArchitectureNarrative(`---
c4ml-narrative: 1
id: remote
title: Remote
---
[remote](https://example.com)
`)).toMatchObject({ valid: false, error: { code: "C4ML-NARRATIVE-002" } });
  });
});
