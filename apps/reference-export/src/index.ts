import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  compileArchitectureDiagram,
  type ArchitectureModel,
  type ArchitectureView,
} from "@c4ml/compiler-core";
import { ibmPlexSansFamily } from "@c4ml/font-ibm-plex";
import {
  ibmPlexSansTtfFontFiles,
  loadIbmPlexSansSvgFontFaces,
} from "@c4ml/font-ibm-plex/node";
import { createBundledElkLayoutAdapter } from "@c4ml/layout-elk/bundled";
import { ResvgPngRenderer } from "@c4ml/render-resvg";

const model: ArchitectureModel = {
  elements: [
    {
      id: "grower",
      kind: "person",
      name: "Grower",
      description: "Plans and supervises cultivation cycles.",
      classification: "external",
    },
    {
      id: "signal-garden",
      kind: "software-system",
      name: "Signal Garden",
      description: "Coordinates cultivation plans from environmental signals.",
      classification: "internal",
    },
    {
      id: "weather-beacon",
      kind: "software-system",
      name: "Weather Beacon",
      description: "Publishes local weather observations.",
      classification: "external",
    },
    {
      id: "message-relay",
      kind: "software-system",
      name: "Message Relay",
      description: "Delivers cultivation notices to subscribed channels.",
      classification: "external",
    },
    {
      id: "studio-ui",
      kind: "container",
      softwareSystemId: "signal-garden",
      name: "Cultivation Studio",
      description: "Presents plans and accepts cultivation changes.",
      technology: "TypeScript web application",
    },
    {
      id: "cultivation-api",
      kind: "container",
      softwareSystemId: "signal-garden",
      name: "Cultivation API",
      description: "Applies planning rules and coordinates observations.",
      technology: "TypeScript service",
    },
    {
      id: "notice-worker",
      kind: "container",
      softwareSystemId: "signal-garden",
      name: "Notice Worker",
      description: "Delivers time-sensitive cultivation notices.",
      technology: "TypeScript worker",
    },
    {
      id: "ledger",
      kind: "container",
      softwareSystemId: "signal-garden",
      name: "Cultivation Ledger",
      description: "Stores plans, readings, and recommendations.",
      technology: "PostgreSQL",
    },
  ],
  relationships: [
    {
      id: "grower-studio",
      sourceId: "grower",
      targetId: "studio-ui",
      description: "Edits cultivation plans",
    },
    {
      id: "weather-api",
      sourceId: "weather-beacon",
      targetId: "cultivation-api",
      description: "Supplies environmental observations",
    },
    {
      id: "studio-api",
      sourceId: "studio-ui",
      targetId: "cultivation-api",
      description: "Submits cultivation commands",
      technology: "HTTPS/JSON",
    },
    {
      id: "api-worker",
      sourceId: "cultivation-api",
      targetId: "notice-worker",
      description: "Enqueues cultivation notices",
      protocol: "AMQP",
    },
    {
      id: "api-ledger",
      sourceId: "cultivation-api",
      targetId: "ledger",
      description: "Stores plans and recommendations",
      protocol: "PostgreSQL wire protocol",
    },
    {
      id: "worker-relay",
      sourceId: "notice-worker",
      targetId: "message-relay",
      description: "Delivers cultivation notices",
      technology: "HTTPS",
    },
  ],
};

const view: ArchitectureView = {
  id: "signal-garden-containers",
  kind: "container",
  softwareSystemId: "signal-garden",
  title: "Container View — Signal Garden",
  purpose:
    "Shows a compiler-generated C4 Container View with a Visual Group and route controls.",
  layout: { direction: "right" },
  groups: [
    {
      id: "cultivation-core",
      title: "Cultivation Core",
      description: "Coordinates planning rules and asynchronous notices.",
      members: [
        { kind: "element", id: "cultivation-api" },
        { kind: "element", id: "notice-worker" },
      ],
      layout: { keepTogether: true, padding: 34 },
    },
  ],
};

const outputDirectory = resolve(
  process.cwd(),
  process.argv[2] ?? "build/reference",
);
const embeddedFontFaces = await loadIbmPlexSansSvgFontFaces();
const compilerResult = await compileArchitectureDiagram({
  model,
  view,
  layoutAdapter: createBundledElkLayoutAdapter(),
  routing: {
    corridors: [
      {
        id: "north-bus",
        orientation: "horizontal",
        coordinate: 70,
        lanes: 2,
        laneSpacing: 18,
      },
    ],
    controls: [
      {
        relationshipId: "studio-api",
        policy: "guided",
        style: "orthogonal",
        sourcePort: "east",
        targetPort: "west",
      },
      {
        relationshipId: "api-worker",
        policy: "guided",
        style: "orthogonal",
        sourcePort: "east",
        targetPort: "west",
      },
      {
        relationshipId: "api-ledger",
        policy: "guided",
        style: "orthogonal",
        sourcePort: "north",
        targetPort: "west",
        corridor: { corridorId: "north-bus", lane: 0 },
        labelSegment: 1,
      },
      {
        relationshipId: "worker-relay",
        policy: "automatic",
        labelOffset: { x: 0, y: 34 },
      },
      {
        relationshipId: "grower-studio",
        policy: "automatic",
        labelOffset: { x: 0, y: -30 },
      },
      {
        relationshipId: "weather-api",
        policy: "automatic",
        labelOffset: { x: 0, y: 28 },
      },
    ],
  },
  scene: { fontFamily: ibmPlexSansFamily, theme: "c4ml-blue" },
  svg: { embeddedFontFaces },
});

if (!compilerResult.valid || compilerResult.svg === undefined) {
  for (const diagnostic of compilerResult.diagnostics) {
    process.stderr.write(`${diagnostic.code}: ${diagnostic.message}\n`);
  }
  process.exitCode = 1;
} else {
  await mkdir(outputDirectory, { recursive: true });
  const svgPath = resolve(outputDirectory, "signal-garden-containers.svg");
  const pngPath = resolve(outputDirectory, "signal-garden-containers.png");
  await writeFile(svgPath, compilerResult.svg, "utf8");

  const pngRenderer = new ResvgPngRenderer();
  const png = await pngRenderer.render(compilerResult.svg, {
    background: compilerResult.scene!.theme.canvas.background,
    fontFiles: ibmPlexSansTtfFontFiles,
    loadSystemFonts: false,
    defaultFontFamily: ibmPlexSansFamily,
  });
  await writeFile(pngPath, png.bytes);

  process.stdout.write(
    [
      `SVG: ${svgPath}`,
      `PNG: ${pngPath}`,
      `Canvas: ${compilerResult.scene?.width} x ${compilerResult.scene?.height}`,
      `Routes: ${compilerResult.routes?.length}`,
    ].join("\n") + "\n",
  );
}
