import {
  createDiagnostic,
  sortDiagnostics,
  type Diagnostic,
} from "./diagnostics.js";
import {
  prepareDiagram,
  type PreparedDiagram,
} from "./diagram-preparation.js";
import {
  ContractError,
  type LayoutAdapter,
  type LayoutResult,
} from "./layout.js";
import type { ArchitectureModel } from "./model.js";
import {
  routeDiagram,
  type DiagramRoutingOptions,
  type EffectiveRoute,
} from "./routing.js";
import {
  createDiagramScene,
  type DiagramScene,
  type SceneOptions,
} from "./scene.js";
import type { DiagramShapeOptions } from "./shapes.js";
import { sourceOf } from "./source.js";
import {
  renderDiagramSvg,
  type SvgRenderOptions,
} from "./svg-renderer.js";
import { resolveArchitectureView } from "./view-resolution.js";
import type { ArchitectureView, ResolvedView } from "./views.js";

export interface DiagramCompileRequest {
  readonly model: ArchitectureModel;
  readonly view: ArchitectureView;
  readonly layoutAdapter: LayoutAdapter;
  readonly routing?: DiagramRoutingOptions;
  readonly shapes?: DiagramShapeOptions;
  readonly scene?: SceneOptions;
  readonly svg?: SvgRenderOptions;
}

export interface DiagramCompileResult {
  readonly valid: boolean;
  readonly diagnostics: readonly Diagnostic[];
  readonly resolvedView?: ResolvedView;
  readonly preparedDiagram?: PreparedDiagram;
  readonly layout?: LayoutResult;
  readonly routes?: readonly EffectiveRoute[];
  readonly scene?: DiagramScene;
  readonly svg?: string;
}

export async function compileArchitectureDiagram(
  request: DiagramCompileRequest,
): Promise<DiagramCompileResult> {
  const resolution = resolveArchitectureView(request.model, request.view);
  if (!resolution.valid || resolution.views.length !== 1) {
    return {
      valid: false,
      diagnostics: resolution.diagnostics,
    };
  }

  const resolvedView = resolution.views[0]!;
  let preparedDiagram: PreparedDiagram | undefined;
  let layout: LayoutResult | undefined;
  let routes: readonly EffectiveRoute[] | undefined;
  let scene: DiagramScene | undefined;
  try {
    preparedDiagram = prepareDiagram(request.view, resolvedView, request.shapes);
    layout = await request.layoutAdapter.layout(preparedDiagram.layoutRequest);
    routes = routeDiagram(preparedDiagram, layout, request.routing);
    scene = createDiagramScene(preparedDiagram, layout, routes, request.scene);
    const svg = renderDiagramSvg(scene, request.svg);
    return {
      valid: true,
      diagnostics: resolution.diagnostics,
      resolvedView,
      preparedDiagram,
      layout,
      routes,
      scene,
      svg,
    };
  } catch (error) {
    const diagnostic = compilerStageDiagnostic(error, request);
    return {
      valid: false,
      diagnostics: sortDiagnostics([...resolution.diagnostics, diagnostic]),
      resolvedView,
      ...(preparedDiagram === undefined ? {} : { preparedDiagram }),
      ...(layout === undefined ? {} : { layout }),
      ...(routes === undefined ? {} : { routes }),
      ...(scene === undefined ? {} : { scene }),
    };
  }
}

function compilerStageDiagnostic(
  error: unknown,
  request: DiagramCompileRequest,
): Diagnostic {
  const contractError =
    error instanceof ContractError
      ? error
      : new ContractError(
          "C4ML-COMPILE-001",
          error instanceof Error ? error.message : "Unknown compiler-stage failure.",
        );
  const routeSource = request.routing?.controls?.find(
    (control) =>
      contractError.message.includes(control.relationshipId) &&
      control.source !== undefined,
  )?.source ?? request.routing?.corridors?.find(
    (corridor) =>
      contractError.message.includes(corridor.id) && corridor.source !== undefined,
  )?.source;
  return createDiagnostic({
    code: contractError.code,
    severity: "error",
    message: contractError.message,
    source: routeSource ?? sourceOf(request.view),
    correction:
      "Review the effective layout and route controls reported before rendering.",
  });
}
