grammar C4mlDraft

entry C4mlDocument:
    'c4ml' version='draft-1'
    model=ModelBlock?
    relations=RelationsBlock?
    deployment=DeploymentsBlock?
    views+=ViewDeclaration*;

ModelBlock:
    'model' '{'
        elements+=ElementDeclaration*
    '}';

ElementDeclaration:
    PersonDeclaration
    | SoftwareSystemDeclaration
    | ContainerDeclaration
    | ComponentDeclaration
    | CodeElementDeclaration;

PersonDeclaration:
    'person' name=ID '{'
        properties+=ElementProperty*
    '}';

SoftwareSystemDeclaration:
    'system' name=ID '{'
        properties+=ElementProperty*
    '}';

ContainerDeclaration:
    'container' name=ID 'inside' owner=[SoftwareSystemDeclaration:ID] '{'
        properties+=ContainerProperty*
    '}';

ComponentDeclaration:
    'component' name=ID 'inside' owner=[ContainerDeclaration:ID] '{'
        properties+=ComponentProperty*
    '}';

CodeElementDeclaration:
    'code' name=ID 'inside' owner=[ComponentDeclaration:ID] '{'
        properties+=CodeElementProperty*
    '}';

ElementProperty:
    DisplayNameProperty | ResponsibilityProperty | ClassificationProperty;

ContainerProperty:
    DisplayNameProperty | ResponsibilityProperty | TechnologyProperty;

ComponentProperty:
    DisplayNameProperty | ResponsibilityProperty | TechnologyProperty;

CodeElementProperty:
    DisplayNameProperty
    | ResponsibilityProperty
    | CodeKindProperty
    | LanguageProperty;

DisplayNameProperty:
    'name' '=' value=STRING;

ResponsibilityProperty:
    'responsibility' '=' value=STRING;

ClassificationProperty:
    'classification' '=' value=('internal' | 'external');

CodeKindProperty:
    'code-kind' '=' value=ID;

LanguageProperty:
    'language' '=' value=STRING;

RelationsBlock:
    'relations' '{'
        relationships+=RelationshipDeclaration*
    '}';

RelationshipDeclaration:
    'relation' name=ID '{'
        properties+=RelationshipProperty*
    '}';

RelationshipProperty:
    RelationshipFromProperty
    | RelationshipToProperty
    | RelationshipIntentProperty
    | TechnologyProperty
    | ProtocolProperty;

RelationshipFromProperty:
    'from' '=' value=[ElementDeclaration:ID];

RelationshipToProperty:
    'to' '=' value=[ElementDeclaration:ID];

RelationshipIntentProperty:
    'intent' '=' value=STRING;

TechnologyProperty:
    'technology' '=' value=STRING;

ProtocolProperty:
    'protocol' '=' value=STRING;

DeploymentsBlock:
    'deployments' '{'
        environments+=EnvironmentDeclaration*
    '}';

EnvironmentDeclaration:
    'environment' name=ID '{'
        properties+=EnvironmentProperty*
        items+=EnvironmentItem*
    '}';

EnvironmentProperty:
    DisplayNameProperty | ResponsibilityProperty;

EnvironmentItem:
    DeploymentNodeDeclaration
    | DeploymentEndpointDeclaration
    | DeploymentRelationshipDeclaration;

DeploymentNodeDeclaration:
    'node' name=ID ('inside' parent=[DeploymentNodeDeclaration:ID])? '{'
        properties+=DeploymentItemProperty*
    '}';

DeploymentEndpointDeclaration:
    InfrastructureNodeDeclaration
    | SoftwareSystemInstanceDeclaration
    | ContainerInstanceDeclaration;

InfrastructureNodeDeclaration:
    'infrastructure' name=ID 'on' node=[DeploymentNodeDeclaration:ID] '{'
        properties+=DeploymentItemProperty*
    '}';

SoftwareSystemInstanceDeclaration:
    'system-instance' name=ID
    'of' system=[SoftwareSystemDeclaration:ID]
    'on' node=[DeploymentNodeDeclaration:ID];

ContainerInstanceDeclaration:
    'container-instance' name=ID
    'of' container=[ContainerDeclaration:ID]
    'on' node=[DeploymentNodeDeclaration:ID];

DeploymentItemProperty:
    DisplayNameProperty | ResponsibilityProperty | TechnologyProperty;

DeploymentRelationshipDeclaration:
    'deployment-relation' name=ID '{'
        properties+=DeploymentRelationshipProperty*
    '}';

DeploymentRelationshipProperty:
    DeploymentRelationshipFromProperty
    | DeploymentRelationshipToProperty
    | DeploymentRelationshipIntentProperty
    | DeploymentStaticRelationshipProperty
    | TechnologyProperty;

DeploymentRelationshipFromProperty:
    'from' '=' value=[DeploymentEndpointDeclaration:ID];

DeploymentRelationshipToProperty:
    'to' '=' value=[DeploymentEndpointDeclaration:ID];

DeploymentRelationshipIntentProperty:
    'intent' '=' value=STRING;

DeploymentStaticRelationshipProperty:
    'relation' '=' value=[RelationshipDeclaration:ID];

ViewDeclaration:
    'view' name=ID '{'
        properties+=ViewProperty*
        interactions+=InteractionDeclaration*
        layout=LayoutBlock?
    '}';

ViewProperty:
    ViewTypeProperty
    | ViewScopeProperty
    | ViewTitleProperty
    | ViewPurposeProperty
    | ViewAudienceProperty
    | ViewLegendProperty
    | ViewDisplayProperty
    | ViewAllowMixedLevelsProperty
    | ViewEnvironmentProperty
    | ViewSystemsProperty;

ViewTypeProperty:
    'type' '=' value=(
        'code'
        | 'component'
        | 'container'
        | 'deployment'
        | 'dynamic'
        | 'system-context'
        | 'system-landscape'
    );

ViewScopeProperty:
    'scope' '=' (element=[ElementDeclaration:ID] | text=STRING);

ViewTitleProperty:
    'title' '=' value=STRING;

ViewPurposeProperty:
    'purpose' '=' value=STRING;

ViewAudienceProperty:
    'audience' '=' value='default';

ViewLegendProperty:
    'legend' '=' value='generated';

ViewDisplayProperty:
    'display' '=' value=('collaboration' | 'sequence');

ViewAllowMixedLevelsProperty:
    'allow-mixed-levels' '=' value?='true';

ViewEnvironmentProperty:
    'environment' '=' value=[EnvironmentDeclaration:ID];

ViewSystemsProperty:
    'systems' '=' '[' values+=[SoftwareSystemDeclaration:ID]
        (',' values+=[SoftwareSystemDeclaration:ID])* ']';

InteractionDeclaration:
    'interaction' name=ID '{'
        properties+=InteractionProperty*
    '}';

InteractionProperty:
    InteractionOrderProperty
    | InteractionParallelProperty
    | InteractionFromProperty
    | InteractionToProperty
    | InteractionIntentProperty
    | InteractionRelationshipProperty;

InteractionOrderProperty:
    'order' '=' value=INT;

InteractionParallelProperty:
    'parallel' '=' value=ID;

InteractionFromProperty:
    'from' '=' value=[ElementDeclaration:ID];

InteractionToProperty:
    'to' '=' value=[ElementDeclaration:ID];

InteractionIntentProperty:
    'intent' '=' value=STRING;

InteractionRelationshipProperty:
    'relation' '=' value=[RelationshipDeclaration:ID];

LayoutBlock:
    'layout' '{'
        properties+=LayoutProperty*
        places+=PlacementPlaceDeclaration*
        alignments+=PlacementAlignDeclaration*
        distributions+=PlacementDistributeDeclaration*
        adjustments+=PlacementAdjustDeclaration*
        constraints+=PlacementConstraintDeclaration*
        pins+=PlacementPinDeclaration*
        avoidanceRegions+=RouteAvoidanceDeclaration*
        corridors+=RouteCorridorDeclaration*
        routes+=RouteDeclaration*
    '}';

LayoutProperty:
    FlowProperty;

FlowProperty:
    'flow' '=' value=('down' | 'left' | 'right' | 'up');

PlacementConstraintDeclaration:
    'constraint'
    relation=(
        'above'
        | 'align-center-x'
        | 'align-center-y'
        | 'below'
        | 'left-of'
        | 'right-of'
    )
    '(' subject=[ElementDeclaration:ID] ',' target=[ElementDeclaration:ID] ')'
    '{'
        properties+=PlacementConstraintProperty*
    '}';

PlacementConstraintProperty:
    PlacementStrengthProperty | PlacementGapProperty;

PlacementStrengthProperty:
    'strength' '=' value=('hard' | 'soft');

PlacementGapProperty:
    'gap' '=' value=INT;

PlacementPlaceDeclaration:
    'place' subject=[ElementDeclaration:ID]
    relation=('above' | 'below' | 'left-of' | 'right-of')
    target=[ElementDeclaration:ID] '{'
        properties+=PlacementPlaceProperty*
    '}';

PlacementPlaceProperty:
    PlacementStrengthProperty | PlacementIntentGapProperty;

PlacementIntentGapProperty:
    'gap' '=' value=PlacementDistance;

PlacementAlignDeclaration:
    'align' alignment=('bottom' | 'center-x' | 'center-y' | 'left' | 'right' | 'top')
    '[' items+=[ElementDeclaration:ID] (',' items+=[ElementDeclaration:ID])* ']'
    '{' properties+=PlacementAlignProperty* '}';

PlacementAlignProperty:
    PlacementAnchorProperty | PlacementStrengthProperty;

PlacementAnchorProperty:
    'anchor' '=' value=[ElementDeclaration:ID];

PlacementDistributeDeclaration:
    'distribute' orientation=('horizontal' | 'vertical')
    '[' items+=[ElementDeclaration:ID] (',' items+=[ElementDeclaration:ID])* ']'
    '{' properties+=PlacementDistributeProperty* '}';

PlacementDistributeProperty:
    PlacementIntentGapProperty | PlacementStrengthProperty;

PlacementAdjustDeclaration:
    'adjust' target=[ElementDeclaration:ID] '{'
        properties+=PlacementAdjustProperty*
    '}';

PlacementAdjustProperty:
    PlacementRelativeToProperty
    | PlacementMoveProperty
    | PlacementMoveXProperty
    | PlacementMoveYProperty
    | PlacementStrengthProperty;

PlacementRelativeToProperty:
    'relative-to' '=' value='automatic';

PlacementMoveProperty:
    'move' '=' direction=('down' | 'left' | 'right' | 'up') value=PlacementDistance;

PlacementMoveXProperty:
    'move-x' '=' value=SignedPlacementDistance;

PlacementMoveYProperty:
    'move-y' '=' value=SignedPlacementDistance;

PlacementDistance:
    preset=('tiny' | 'small' | 'normal' | 'large')
    | amount=INT unit=('step' | 'du');

SignedPlacementDistance:
    negative?='-' value=PlacementDistance;

PlacementPinDeclaration:
    'pin' target=[ElementDeclaration:ID] '{'
        properties+=PlacementPinProperty*
    '}';

PlacementPinProperty:
    PlacementXProperty | PlacementYProperty | PlacementStrengthProperty;

PlacementXProperty:
    'x' '=' value=INT 'du';

PlacementYProperty:
    'y' '=' value=INT 'du';

RouteAvoidanceDeclaration:
    'avoidance' name=ID '{'
        properties+=RouteAvoidanceSetting*
    '}';

RouteAvoidanceSetting:
    AvoidanceStrengthProperty
    | AvoidanceBoundsProperty
    | AvoidanceAroundProperty
    | AvoidancePaddingProperty;

AvoidanceStrengthProperty:
    'strength' '=' value=('hard' | 'soft');

AvoidanceBoundsProperty:
    'bounds' '=' value=BoundsLiteral;

AvoidanceAroundProperty:
    'around' '=' value=[ElementDeclaration:ID];

AvoidancePaddingProperty:
    'padding' '=' value=INT;

RouteCorridorDeclaration:
    'corridor' name=ID '{'
        properties+=RouteCorridorSetting*
    '}';

RouteCorridorSetting:
    CorridorOrientationProperty
    | CorridorCoordinateProperty
    | CorridorLanesProperty
    | CorridorLaneGapProperty;

CorridorOrientationProperty:
    'orientation' '=' value=('horizontal' | 'vertical');

CorridorCoordinateProperty:
    'coordinate' '=' value=SignedInteger;

CorridorLanesProperty:
    'lanes' '=' value=INT;

CorridorLaneGapProperty:
    'lane-gap' '=' value=INT;

RouteDeclaration:
    'route' relationship=[RelationshipDeclaration:ID] '{'
        properties+=RouteProperty*
    '}';

RouteProperty:
    RoutePolicyProperty
    | RouteStyleProperty
    | RouteSourcePortProperty
    | RouteTargetPortProperty
    | RouteViaProperty
    | RouteGuideProperty
    | RouteAvoidProperty
    | RouteCorridorSelectionProperty
    | RouteLaneProperty
    | RoutePointsProperty
    | RouteLabelSegmentProperty
    | RouteLabelShiftProperty;

RoutePolicyProperty:
    'policy' '=' value=('automatic' | 'guided' | 'fixed');

RouteStyleProperty:
    'style' '=' value=('direct' | 'orthogonal');

RouteSourcePortProperty:
    'source-port' '=' value=('automatic' | 'north' | 'east' | 'south' | 'west');

RouteTargetPortProperty:
    'target-port' '=' value=('automatic' | 'north' | 'east' | 'south' | 'west');

RouteViaProperty:
    'via' '=' value=PointList;

RouteGuideProperty:
    'guide' '=' '[' items+=RouteGuideItem (',' items+=RouteGuideItem)* ']';

RouteGuideItem:
    RouteWaypointGuide | RouteLockedSegmentGuide;

RouteWaypointGuide:
    'via' anchor=RouteAnchorLiteral;

RouteLockedSegmentGuide:
    'lock' start=RouteAnchorLiteral 'to' end=RouteAnchorLiteral;

RouteAnchorLiteral:
    RoutePortAnchor | RouteElementAnchor | RouteCanvasAnchor;

RoutePortAnchor:
    kind=('source-port' | 'target-port') ('shift' offset=PointLiteral)?;

RouteElementAnchor:
    'element' element=[ElementDeclaration:ID]
    side=('north' | 'east' | 'south' | 'west')
    ('shift' offset=PointLiteral)?;

RouteCanvasAnchor:
    'canvas' 'at' point=PointLiteral;

RouteAvoidProperty:
    'avoid' '=' '[' regions+=[RouteAvoidanceDeclaration:ID]
        (',' regions+=[RouteAvoidanceDeclaration:ID])* ']';

RouteCorridorSelectionProperty:
    'corridor' '=' value=[RouteCorridorDeclaration:ID];

RouteLaneProperty:
    'lane' '=' value=INT;

RoutePointsProperty:
    'points' '=' value=PointList;

RouteLabelSegmentProperty:
    'label-segment' '=' value=INT;

RouteLabelShiftProperty:
    'label-shift' '=' value=PointLiteral;

PointList:
    '[' points+=PointLiteral (',' points+=PointLiteral)* ']';

PointLiteral:
    '(' x=SignedInteger ',' y=SignedInteger ')';

BoundsLiteral:
    '(' x=SignedInteger ',' y=SignedInteger ',' width=INT ',' height=INT ')';

SignedInteger:
    (negative?='-')? value=INT;

hidden terminal WS: /\s+/;
hidden terminal LINE_COMMENT: /\/\/[^\n\r]*/;
terminal ID: /[_A-Za-z][\-_A-Za-z0-9]*/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"(\\.|[^"\\])*"/;
