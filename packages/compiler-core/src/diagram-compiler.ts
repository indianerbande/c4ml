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
  applyPlacementConstraints,
  PlacementConflictError,
  type DiagramPlacementOptions,
  type PlacementResult,
} from "./placement.js";
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
  readonly placement?: DiagramPlacementOptions;
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
  readonly candidateLayout?: LayoutResult;
  readonly placement?: PlacementResult;
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
  let candidateLayout: LayoutResult | undefined;
  let placement: PlacementResult | undefined;
  let layout: LayoutResult | undefined;
  let routes: readonly EffectiveRoute[] | undefined;
  let scene: DiagramScene | undefined;
  try {
    preparedDiagram = prepareDiagram(request.view, resolvedView, request.shapes);
    candidateLayout = await request.layoutAdapter.layout(
      preparedDiagram.layoutRequest,
    );
    placement = applyPlacementConstraints(
      preparedDiagram,
      candidateLayout,
      request.placement,
    );
    layout = placement.layout;
    routes = routeDiagram(preparedDiagram, layout, request.routing);
    scene = createDiagramScene(preparedDiagram, layout, routes, request.scene);
    const svg = renderDiagramSvg(scene, request.svg);
    const routeDiagnostics = relaxedAvoidanceDiagnostics(routes, request);
    const placementDiagnostics = relaxedPlacementDiagnostics(
      placement,
      request,
    );
    return {
      valid: true,
      diagnostics: sortDiagnostics([
        ...resolution.diagnostics,
        ...placementDiagnostics,
        ...routeDiagnostics,
      ]),
      resolvedView,
      preparedDiagram,
      candidateLayout,
      placement,
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
      ...(candidateLayout === undefined ? {} : { candidateLayout }),
      ...(placement === undefined ? {} : { placement }),
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
  const routeControl = request.routing?.controls?.find(
    (control) =>
      contractError.message.includes(control.relationshipId) &&
      control.source !== undefined,
  );
  const routeRegion = request.routing?.avoidanceRegions?.find(
    (region) =>
      contractError.message.includes(region.id) && region.source !== undefined,
  );
  const routeSource =
    routeControl?.source ??
    routeRegion?.source ??
    request.routing?.corridors?.find(
      (corridor) =>
        contractError.message.includes(corridor.id) &&
        corridor.source !== undefined,
    )?.source;
  const placementSources =
    error instanceof PlacementConflictError
      ? error.constraintIds.flatMap((id) => {
          const constraint = request.placement?.constraints.find(
            (candidate) => candidate.id === id,
          );
          return constraint?.source === undefined ? [] : [constraint.source];
        })
      : [];
  const placementControl = request.placement?.constraints.find((constraint) =>
    contractError.message.includes(constraint.id),
  );
  const placementSource = placementSources[0] ?? placementControl?.source;
  return createDiagnostic({
    code: contractError.code,
    severity: "error",
    message: contractError.message,
    source: placementSource ?? routeSource ?? sourceOf(request.view),
    related:
      placementSources.length > 1
        ? placementSources.slice(1).map((source) => ({
            message: "Conflicting placement constraint is declared here.",
            source,
          }))
        : routeControl?.source !== undefined &&
            routeRegion?.source !== undefined &&
            routeControl.source !== routeRegion.source
          ? [
              {
                message: `Avoidance region ${routeRegion.id} is declared here.`,
                source: routeRegion.source,
              },
            ]
          : [],
    correction:
      "Review the effective placement, layout, and route controls reported before rendering.",
  });
}

function relaxedPlacementDiagnostics(
  placement: PlacementResult,
  request: DiagramCompileRequest,
): Diagnostic[] {
  return placement.constraints
    .filter(({ relaxed }) => relaxed)
    .map((effective) => {
      const constraint = request.placement?.constraints.find(
        ({ id }) => id === effective.id,
      );
      return createDiagnostic({
        code: "C4ML-PLACEMENT-020",
        severity: "warning",
        message: `Soft placement constraint ${effective.id} was relaxed.`,
        source: constraint?.source ?? sourceOf(request.view),
        correction:
          "Remove the conflicting preference or change the relevant hard placement rule.",
      });
    });
}

function relaxedAvoidanceDiagnostics(
  routes: readonly EffectiveRoute[],
  request: DiagramCompileRequest,
): Diagnostic[] {
  return routes.flatMap((route) => {
    const control = request.routing?.controls?.find(
      ({ relationshipId }) => relationshipId === route.relationshipId,
    );
    return route.avoidanceRegions
      .filter(({ relaxed }) => relaxed)
      .map((effectiveRegion) => {
        const region = request.routing?.avoidanceRegions?.find(
          ({ id }) => id === effectiveRegion.id,
        );
        return createDiagnostic({
          code: "C4ML-ROUTE-030",
          severity: "warning",
          message: `Route ${route.relationshipId} relaxed soft avoidance region ${effectiveRegion.id}.`,
          source:
            control?.source ?? region?.source ?? sourceOf(request.view),
          related:
            control?.source !== undefined && region?.source !== undefined
              ? [
                  {
                    message: `Soft avoidance region ${region.id} is declared here.`,
                    source: region.source,
                  },
                ]
              : [],
          correction:
            "Adjust the route guidance or avoidance bounds if crossing the region is not acceptable.",
        });
      });
  });
}
