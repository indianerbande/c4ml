import { describe, expect, it } from "vitest";

import {
  assertArchitectureAssetHash,
  parseArchitectureAssetManifest,
} from "../src/index.js";

const asset = {
  id: "review-note",
  uri: "assets/review.txt",
  mediaType: "text/plain",
  purpose: "reference",
  sha256: "a".repeat(64),
  license: "Apache-2.0",
  attribution: "Original C4ML material",
};

describe("portable licensed asset manifest", () => {
  it("normalizes passive assets with license, attribution, and integrity", () => {
    const result = parseArchitectureAssetManifest(JSON.stringify({ version: 1, id: "assets", assets: [asset] }));
    expect(result).toMatchObject({ valid: true, manifest: { assets: [asset] } });
    if (result.valid) expect(() => assertArchitectureAssetHash(result.manifest.assets[0]!, "a".repeat(64))).not.toThrow();
  });

  it("rejects active media, malformed hashes, collisions, and mismatched content", () => {
    expect(parseArchitectureAssetManifest(JSON.stringify({
      version: 1, id: "assets", assets: [{ ...asset, mediaType: "image/svg+xml" }],
    }))).toMatchObject({ valid: false, error: { code: "C4ML-ASSET-001" } });
    expect(parseArchitectureAssetManifest(JSON.stringify({
      version: 1, id: "assets", assets: [{ ...asset, sha256: "bad" }],
    }))).toMatchObject({ valid: false, error: { code: "C4ML-ASSET-001" } });
    const parsed = parseArchitectureAssetManifest(JSON.stringify({ version: 1, id: "assets", assets: [asset] }));
    if (parsed.valid) expect(() => assertArchitectureAssetHash(parsed.manifest.assets[0]!, "b".repeat(64)))
      .toThrowError(expect.objectContaining({ code: "C4ML-ASSET-002" }));
  });
});
