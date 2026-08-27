grammar PhaseZeroProbe

entry ProbeFile:
    'atlas' name=ID '{'
        (markers+=Marker | trails+=Trail)*
    '}';

Marker:
    'marker' name=ID 'caption' caption=STRING;

Trail:
    'trail' name=ID 'starts' source=[Marker:ID] 'arrives' target=[Marker:ID];

hidden terminal WS: /\s+/;
hidden terminal LINE_NOTE: /#[^\n\r]*/;
terminal ID: /[_A-Za-z][\-_A-Za-z0-9]*/;
terminal STRING: /"(\\.|[^"\\])*"/;
