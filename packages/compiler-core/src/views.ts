import type {
  DeploymentEnvironment,
  DeploymentInstance,
  DeploymentNode,
  DeploymentRelationship,
  InfrastructureNode,
  Relationship,
  StaticElement,
} from "./model.js";
import type { SourceBacked } from "./source.js";

export type ViewKind =
  | "code"
  | "component"
  | "container"
  | "deployment"
  | "dynamic"
  | "system-context"
  | "system-landscape";

export interface ViewSelection {
  readonly includeElementIds?: readonly string[];
  readonly excludeElementIds?: readonly string[];
  readonly includeRelationshipIds?: readonly string[];
  readonly excludeRelationshipIds?: readonly string[];
}

export interface LegendEntry {
  readonly label: string;
  readonly description: string;
  readonly visualEncoding?: string;
}

export interface ViewLegend {
  readonly mode: "authored" | "generated";
  readonly title?: string;
  readonly entries?: readonly LegendEntry[];
}

export interface ViewPresentationSettings {
  readonly theme?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface ViewLayoutSettings {
  readonly direction?: "down" | "left" | "right" | "up";
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export type VisualGroupMemberKind =
  | "deployment-instance"
  | "deployment-node"
  | "element"
  | "group"
  | "infrastructure-node";

export interface VisualGroupMemberReference extends SourceBacked {
  readonly kind: VisualGroupMemberKind;
  readonly id: string;
}

export interface VisualGroupLayoutSettings {
  readonly keepTogether?: boolean;
  readonly padding?: number;
}

export interface VisualGroup extends SourceBacked {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly members: readonly VisualGroupMemberReference[];
  readonly presentation?: ViewPresentationSettings;
  readonly layout?: VisualGroupLayoutSettings;
}

/**
 * How a static View shows Relationships whose endpoints are more detailed
 * than the View's own abstraction level.
 *
 * - `implied` (default): a Relationship between two elements appears between
 *   the nearest visible ancestors of those elements, as the C4 model intends
 *   (a Container → Container Relationship implies a Software System →
 *   Software System Relationship in a System Context View). Several
 *   Relationships that project onto the same pair merge into one.
 * - `declared`: only Relationships declared directly between visible
 *   elements appear.
 */
export type ViewRelationshipProjection = "declared" | "implied";

/**
 * A Relationship as one View shows it. A declared Relationship keeps its
 * model identity; an implied one carries a View-scoped identity that no
 * source declaration can collide with (`implied:<source>:<target>`) and
 * lists the authored Relationships it stands for.
 */
export interface ResolvedRelationship extends Relationship {
  readonly implied: boolean;
  /** Authored Relationship identities this View-level Relationship represents. */
  readonly represents: readonly string[];
}

export interface ViewBase extends SourceBacked {
  readonly id: string;
  readonly kind: ViewKind;
  readonly title: string;
  readonly purpose: string;
  readonly audience?: readonly string[];
  readonly legend?: ViewLegend;
  readonly relationshipProjection?: ViewRelationshipProjection;
  readonly selection?: ViewSelection;
  readonly groups?: readonly VisualGroup[];
  readonly presentation?: ViewPresentationSettings;
  readonly layout?: ViewLayoutSettings;
}

export interface SystemLandscapeView extends ViewBase {
  readonly kind: "system-landscape";
  readonly scope: string;
}

export interface SystemContextView extends ViewBase {
  readonly kind: "system-context";
  readonly softwareSystemId: string;
}

export interface ContainerView extends ViewBase {
  readonly kind: "container";
  readonly softwareSystemId: string;
}

export interface ComponentView extends ViewBase {
  readonly kind: "component";
  readonly containerId: string;
}

export interface CodeView extends ViewBase {
  readonly kind: "code";
  readonly componentId: string;
}

export interface DynamicInteraction extends SourceBacked {
  readonly id: string;
  readonly order: number;
  readonly parallelGroup?: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly description: string;
  readonly relationshipId?: string;
}

export interface DynamicView extends ViewBase {
  readonly kind: "dynamic";
  readonly scenario: string;
  readonly interactions: readonly DynamicInteraction[];
  readonly display: "collaboration" | "sequence";
  readonly allowMixedLevels?: boolean;
}

export interface DeploymentView extends ViewBase {
  readonly kind: "deployment";
  readonly environmentId: string;
  readonly softwareSystemIds: readonly string[];
}

export type ArchitectureView =
  | SystemLandscapeView
  | SystemContextView
  | ContainerView
  | ComponentView
  | CodeView
  | DynamicView
  | DeploymentView;

export interface ViewGuidance {
  readonly audience: readonly string[];
  readonly recommendation: string;
}

export interface ResolvedDynamicInteraction extends DynamicInteraction {
  readonly relationship: Relationship;
}

export type ResolvedVisualGroupMember =
  | {
      readonly kind: "deployment-instance";
      readonly instance: DeploymentInstance;
    }
  | {
      readonly kind: "deployment-node";
      readonly node: DeploymentNode;
    }
  | {
      readonly kind: "element";
      readonly element: StaticElement;
    }
  | {
      readonly kind: "group";
      readonly groupId: string;
    }
  | {
      readonly kind: "infrastructure-node";
      readonly infrastructureNode: InfrastructureNode;
    };

export interface ResolvedVisualGroup extends SourceBacked {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly members: readonly ResolvedVisualGroupMember[];
  readonly presentation?: ViewPresentationSettings;
  readonly layout: Required<VisualGroupLayoutSettings>;
}

export interface ResolvedView {
  readonly id: string;
  readonly kind: ViewKind;
  readonly title: string;
  readonly purpose: string;
  readonly scope: string;
  readonly audience: readonly string[];
  readonly recommendation: string;
  readonly legend: ViewLegend;
  readonly elements: readonly StaticElement[];
  readonly relationships: readonly ResolvedRelationship[];
  readonly interactions: readonly ResolvedDynamicInteraction[];
  readonly groups: readonly ResolvedVisualGroup[];
  readonly dynamicDisplay?: DynamicView["display"];
  readonly deploymentEnvironment?: DeploymentEnvironment;
  readonly deploymentNodes: readonly DeploymentNode[];
  readonly infrastructureNodes: readonly InfrastructureNode[];
  readonly deploymentInstances: readonly DeploymentInstance[];
  readonly deploymentRelationships: readonly DeploymentRelationship[];
  readonly presentation?: ViewPresentationSettings;
  readonly layout?: ViewLayoutSettings;
}
