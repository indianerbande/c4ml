import ElkModule from "elkjs/lib/elk.bundled.js";

import {
  ElkLayoutAdapter,
  type ElkLayoutEngine,
} from "./index.js";

type ElkConstructor = new () => unknown;
const Elk = ElkModule as unknown as ElkConstructor;

/** Creates the Node.js-compatible adapter used by the CLI and deterministic tests. */
export function createBundledElkLayoutAdapter(): ElkLayoutAdapter {
  return new ElkLayoutAdapter(new Elk() as ElkLayoutEngine);
}
