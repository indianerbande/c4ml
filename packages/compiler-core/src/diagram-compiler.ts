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
  type ContractSubject,
  type LayoutAdapter,
  type LayoutResult,
} from "./layout.js";
import type { ArchitectureModel } from "./model.js";
import {
  applyPlacementConstraints,
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
import { sourceOf, type SourceReference } from "./source.js";
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
  // Stage errors name the objects they are about; each subject is mapped to
  // the source that declared it. The message is never searched for
  // identifiers, so a short identifier cannot match unrelated text.
  const sources = contractError.subjects.flatMap((subject) => {
    const source = subjectSource(subject, request);
    return source === undefined ? [] : [{ subject, source }];
  });
  const primary = sources[0];
  const related = sources
    .slice(1)
    .filter(({ source }) => source !== primary?.source)
    .map(({ subject, source }) => ({
      message: `${subjectLabel(subject)} is declared here.`,
      source,
    }));
  return createDiagnostic({
    code: contractError.code,
    severity: "error",
    message: contractError.message,
    source: primary?.source ?? sourceOf(request.view),
    related,
    correction:
      "Review the effective placement, layout, and route controls reported before rendering.",
  });
}

function subjectSource(
  subject: ContractSubject,
  request: DiagramCompileRequest,
): SourceReference | undefined {
  switch (subject.kind) {
    case "relationship":
      return request.routing?.controls?.find(
        ({ relationshipId }) => relationshipId === subject.id,
      )?.source;
    case "avoidance-region":
      return request.routing?.avoidanceRegions?.find(({ id }) => id === subject.id)
        ?.source;
    case "corridor":
      return request.routing?.corridors?.find(({ id }) => id === subject.id)
        ?.source;
    case "placement-constraint":
      return request.placement?.constraints.find(({ id }) => id === subject.id)
        ?.source;
    case "node":
      return request.model.elements.find(({ id }) => id === subject.id)?.source;
  }
}

function subjectLabel(subject: ContractSubject): string {
  switch (subject.kind) {
    case "relationship":
      return `Route control for ${subject.id}`;
    case "avoidance-region":
      return `Avoidance region ${subject.id}`;
    case "corridor":
      return `Corridor ${subject.id}`;
    case "placement-constraint":
      return "Conflicting placement constraint";
    case "node":
      return `Element ${subject.id}`;
  }
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
