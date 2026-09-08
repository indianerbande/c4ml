import { defineConfig } from "vitest/config";

export default defineConfig({
  // TestBed imports decorated Angular production services directly. Vitest's
  // Oxc transform must therefore emit the legacy decorator form Angular uses.
  oxc: {
    decorator: {
      legacy: true,
    },
  },
});
