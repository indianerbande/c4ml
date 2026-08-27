import { describe, expect, it } from "vitest";

import { ContractError } from "@c4ml/compiler-core";

import { ResvgPngRenderer } from "./index.js";

const controlledSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90" viewBox="0 0 160 90">
  <rect x="0" y="0" width="160" height="90" fill="#f6f1df"/>
  <path d="M 20 45 H 140" fill="none" stroke="#25465f" stroke-width="6"/>
  <circle cx="80" cy="45" r="18" fill="#65a66f"/>
</svg>`;

describe("ResvgPngRenderer", () => {
  it("renders byte-stable PNG data with controlled dimensions", async () => {
    const renderer = new ResvgPngRenderer();

    const first = await renderer.render(controlledSvg);
    const second = await renderer.render(controlledSvg);

    expect(first.width).toBe(160);
    expect(first.height).toBe(90);
    expect(first.bytes).toEqual(second.bytes);
    expect([...first.bytes.slice(0, 8)]).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
  });

  it("applies scale without changing the SVG source", async () => {
    const renderer = new ResvgPngRenderer();
    const result = await renderer.render(controlledSvg, { scale: 2 });

    expect(result.width).toBe(320);
    expect(result.height).toBe(180);
  });

  it("rejects unresolved external image resources", async () => {
    const renderer = new ResvgPngRenderer();
    const externalSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><image href="https://invalid.example/image.png" width="10" height="10"/></svg>`;

    await expect(renderer.render(externalSvg)).rejects.toEqual(
      expect.objectContaining<Partial<ContractError>>({
        code: "C4ML-P0-PNG-003",
      }),
    );
  });
});
