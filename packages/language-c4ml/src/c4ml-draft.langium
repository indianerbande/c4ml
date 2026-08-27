grammar C4mlDraft

entry C4mlDocument:
    'c4ml' version='draft-1'
    model=ModelBlock
    relations=RelationsBlock
    views+=SystemContextView+;

ModelBlock:
    'model' '{'
        elements+=ElementDeclaration*
    '}';

ElementDeclaration:
    PersonDeclaration | SoftwareSystemDeclaration;

PersonDeclaration:
    'person' name=ID '{'
        properties+=ElementProperty*
    '}';

SoftwareSystemDeclaration:
    'system' name=ID '{'
        properties+=ElementProperty*
    '}';

ElementProperty:
    DisplayNameProperty | ResponsibilityProperty | ClassificationProperty;

DisplayNameProperty:
    'name' '=' value=STRING;

ResponsibilityProperty:
    'responsibility' '=' value=STRING;

ClassificationProperty:
    'classification' '=' value=('internal' | 'external');

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
    | RelationshipIntentProperty;

RelationshipFromProperty:
    'from' '=' value=[ElementDeclaration:ID];

RelationshipToProperty:
    'to' '=' value=[ElementDeclaration:ID];

RelationshipIntentProperty:
    'intent' '=' value=STRING;

SystemContextView:
    'view' name=ID '{'
        properties+=SystemContextViewProperty*
        layout=LayoutBlock?
    '}';

SystemContextViewProperty:
    ViewTypeProperty
    | ViewScopeProperty
    | ViewTitleProperty
    | ViewPurposeProperty
    | ViewAudienceProperty
    | ViewLegendProperty;

ViewTypeProperty:
    'type' '=' value='system-context';

ViewScopeProperty:
    'scope' '=' value=[SoftwareSystemDeclaration:ID];

ViewTitleProperty:
    'title' '=' value=STRING;

ViewPurposeProperty:
    'purpose' '=' value=STRING;

ViewAudienceProperty:
    'audience' '=' value='default';

ViewLegendProperty:
    'legend' '=' value='generated';

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
terminal STRING: /"(\\.|[^"\\])*"/;
