import { describe, expect, it } from "vitest";

import { contextualConnectionCounterparts } from "../src/app/contextual-connection.js";

const context = {
  elements: [
    { id: "web", label: "Shop-Weboberfläche", kind: "container" as const },
    { id: "service", label: "Shop-Dienst", kind: "container" as const },
    { id: "database", label: "Shop-Datenbank", kind: "container" as const },
  ],
  connectionOptions: [
    { sourceId: "web", targetIds: ["service"] },
    { sourceId: "service", targetIds: ["database"] },
    { sourceId: "database", targetIds: ["service"] },
  ],
};

describe("contextual connection choices", () => {
  it("keeps the clicked element fixed while exposing both valid directions", () => {
    expect(
      contextualConnectionCounterparts(context, "service", "from-context").map(({ id }) => id),
    ).toEqual(["database"]);
    expect(
      contextualConnectionCounterparts(context, "service", "to-context").map(({ id }) => id),
    ).toEqual(["web", "database"]);
  });

  it("does not invent a counterpart for an unsupported direction", () => {
    expect(contextualConnectionCounterparts(context, "web", "to-context")).toEqual([]);
  });
});
