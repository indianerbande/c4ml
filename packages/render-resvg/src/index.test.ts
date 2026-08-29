import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { ContractError } from "@c4ml/compiler-core";

import { ResvgPngRenderer } from "./index.js";

const controlledSvg = await readFile(
  new URL("../fixtures/adapter-smoke.svg", import.meta.url),
  "utf8",
);

describe("ResvgPngRenderer", () => {
  it("identifies the accepted production adapter", () => {
    expect(new ResvgPngRenderer().rendererId).toBe("resvg-js-2.6");
  });

  it("renders byte-stable PNG data with controlled dimensions", async () => {
    const renderer = new ResvgPngRenderer();

    const first = await renderer.render(controlledSvg);
    const second = await renderer.render(controlledSvg);

    expect(first.width).toBe(640);
    expect(first.height).toBe(360);
    expect(first.bytes).toEqual(second.bytes);
    expect([...first.bytes.slice(0, 8)]).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
  });

  it("applies scale without changing the SVG source", async () => {
    const renderer = new ResvgPngRenderer();
    const result = await renderer.render(controlledSvg, { scale: 2 });

    expect(result.width).toBe(1280);
    expect(result.height).toBe(720);
  });

  it("rejects invalid input with stable production diagnostics", async () => {
    const renderer = new ResvgPngRenderer();

    await expect(renderer.render(" ")).rejects.toEqual(
      expect.objectContaining<Partial<ContractError>>({ code: "C4ML-PNG-001" }),
    );
    await expect(renderer.render(controlledSvg, { scale: 0 })).rejects.toEqual(
      expect.objectContaining<Partial<ContractError>>({ code: "C4ML-PNG-002" }),
    );
  });

  it("rejects unresolved external image resources", async () => {
    const renderer = new ResvgPngRenderer();
    const externalSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><image href="https://invalid.example/image.png" width="10" height="10"/></svg>`;

    await expect(renderer.render(externalSvg)).rejects.toEqual(
      expect.objectContaining<Partial<ContractError>>({ code: "C4ML-PNG-003" }),
    );
  });
});
