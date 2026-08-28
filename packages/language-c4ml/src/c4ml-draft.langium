grammar C4mlDraft

entry C4mlDocument:
    'c4ml' version='draft-1'
    model=ModelBlock
    relations=RelationsBlock
    deployment=DeploymentsBlock?
    views+=ViewDeclaration+;

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
    '}';

LayoutProperty:
    FlowProperty;

FlowProperty:
    'flow' '=' value=('down' | 'left' | 'right' | 'up');

hidden terminal WS: /\s+/;
hidden terminal LINE_COMMENT: /\/\/[^\n\r]*/;
terminal ID: /[_A-Za-z][\-_A-Za-z0-9]*/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"(\\.|[^"\\])*"/;
