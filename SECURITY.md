# Security policy

[English](SECURITY.md) | [Deutsch](SECURITY.de.md)

## Supported source

C4thedral is currently beta software. Security corrections are made against the
latest source on `main`; older commits and self-built artifacts do not receive
separate maintenance guarantees. Publicly distributed signed binaries do not
exist yet.

## Reporting a vulnerability

Do not disclose a suspected vulnerability in a public issue. Use GitHub's
private vulnerability-reporting form for this repository:

https://github.com/indianerbande/c4ml/security/advisories/new

Include the affected commit or version, operating system, reproduction steps,
and expected impact. Remove architecture documents, access tokens, personal
paths, and other confidential data from the report unless they are essential
to reproducing the problem.

The maintainers will acknowledge a usable report, investigate it, and
coordinate disclosure according to severity and available evidence. Because
the project is pre-release, no fixed response or remediation deadline is
promised.

## Relevant boundaries

Reports are especially useful when they concern Electron preload or IPC
authority, local-file containment, project-resource hashes, SVG/Markdown
sanitization, packaged native resources, Git subprocess bounds, or ways that
authored source could be changed without explicit review.
