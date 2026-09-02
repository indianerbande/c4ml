# Sicherheitsrichtlinie

[English](SECURITY.md) | [Deutsch](SECURITY.de.md)

## Unterstützter Quellstand

C4thedral ist derzeit Beta-Software. Sicherheitskorrekturen erfolgen gegen den
neuesten Quellstand auf `main`; ältere Commits und selbst gebaute Artefakte
erhalten keine eigene Wartungszusage. Öffentlich verteilte signierte Binärpakete
gibt es noch nicht.

## Eine Schwachstelle melden

Veröffentliche einen vermuteten Sicherheitsfehler nicht in einem öffentlichen
Issue. Verwende das private Formular für Sicherheitsmeldungen dieses
Repositories:

https://github.com/indianerbande/c4ml/security/advisories/new

Nenne den betroffenen Commit oder die Version, das Betriebssystem,
Reproduktionsschritte und die erwartete Auswirkung. Entferne
Architekturdokumente, Zugangstoken, persönliche Pfade und andere vertrauliche
Daten aus der Meldung, sofern sie nicht zwingend zur Reproduktion nötig sind.

Die Maintainer bestätigen eine verwertbare Meldung, untersuchen sie und
koordinieren die Veröffentlichung entsprechend Schweregrad und Beweislage. Da
das Projekt eine Vorabversion ist, wird keine feste Reaktions- oder
Behebungsfrist zugesagt.

## Relevante Grenzen

Besonders hilfreich sind Meldungen zur Autorität von Electron-Preload oder IPC,
zur Begrenzung lokaler Dateizugriffe, zu Hashes von Projektressourcen, zur
Bereinigung von SVG oder Markdown, zu paketierten nativen Ressourcen, zu den
Grenzen der Git-Unterprozesse oder zu Wegen, auf denen verfasster Quelltext ohne
ausdrückliche Prüfung verändert werden könnte.

