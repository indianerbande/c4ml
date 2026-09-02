import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

interface SandboxStat {
  gid: number;
  mode: number;
  uid: number;
}

interface PackagedSmokePreparation {
  hasRequiredLinuxSandboxState(stat: SandboxStat): boolean;
  isPathInside(root: string, candidate: string): boolean;
}

const require = createRequire(import.meta.url);
const preparation = require(
  "../scripts/prepare-packaged-smoke.cjs",
) as PackagedSmokePreparation;

describe("packaged Linux smoke preparation", () => {
  it("accepts only the required root-owned setuid sandbox state", () => {
    expect(
      preparation.hasRequiredLinuxSandboxState({
        uid: 0,
        gid: 0,
        mode: 0o104755,
      }),
    ).toBe(true);
    expect(
      preparation.hasRequiredLinuxSandboxState({
        uid: 1000,
        gid: 1000,
        mode: 0o100755,
      }),
    ).toBe(false);
    expect(
      preparation.hasRequiredLinuxSandboxState({
        uid: 0,
        gid: 0,
        mode: 0o100755,
      }),
    ).toBe(false);
  });

  it("keeps permission changes inside the exact packaged application", () => {
    expect(
      preparation.isPathInside(
        "/work/build/desktop/C4thedral-linux-x64",
        "/work/build/desktop/C4thedral-linux-x64/chrome-sandbox",
      ),
    ).toBe(true);
    expect(
      preparation.isPathInside(
        "/work/build/desktop/C4thedral-linux-x64",
        "/work/build/desktop/chrome-sandbox",
      ),
    ).toBe(false);
    expect(
      preparation.isPathInside(
        "/work/build/desktop/C4thedral-linux-x64",
        "/work/build/desktop/C4thedral-linux-x64",
      ),
    ).toBe(false);
  });
});
