# Contributing to C4thedral

[English](CONTRIBUTING.md) | [Deutsch](CONTRIBUTING.de.md)

Thank you for helping improve C4thedral and C4ML. The project is a public source
beta: useful functionality is implemented, but the language compatibility
promise and some frontend contracts are still deliberately provisional. See
[`docs/en/project-status.md`](docs/en/project-status.md) for the current
maturity and release boundaries.

## Before starting

Open an issue before investing in a broad language, architecture, dependency,
or user-interface change. [`docs/engineering/specification.md`](docs/engineering/specification.md)
defines accepted product behavior; [`docs/engineering/testing.md`](docs/engineering/testing.md)
defines the evidence required for a change. Syntax shown in
[`docs/en/user-guide.md`](docs/en/user-guide.md) and `examples/draft` is a
preview, not a compatibility promise.

C4thedral must remain an original system. Describe outside products in terms of
general capabilities or limitations. Do not copy their code, grammar,
documentation, examples, themes, icons, fixtures, or interface layouts.

## Development setup

Use Node.js 24.15.0 or a newer 24.x release and pnpm 11.24.0. Follow
[`docs/en/build-from-source.md`](docs/en/build-from-source.md) for a clean
checkout and build. Before opening a pull request, run:

```shell
pnpm install --frozen-lockfile
pnpm run check
git diff --check
```

Rendering changes also require visual inspection of intentionally changed
output. Native packaging changes require the affected host-specific checks in
[`docs/en/platforms.md`](docs/en/platforms.md) and
[`docs/engineering/testing.md`](docs/engineering/testing.md).

## Pull requests

Keep each pull request focused and explain:

- the user-visible or architectural problem;
- the accepted specification boundary;
- the implementation and adapter impact;
- automated and visual evidence; and
- intentionally deferred work.

Do not commit generated build output, credentials, private architecture source,
or local machine paths. Dependency changes must follow the update gate in
[`docs/engineering/dependencies.md`](docs/engineering/dependencies.md);
automated update pull requests are never merged solely because their version
number is newer.

AI-assisted contributions are welcome. The contributor remains responsible for
understanding the submitted code, protecting the project's architecture and
originality boundaries, reviewing the complete diff, and providing the same
evidence as for manually typed code. See the project's
[AI-assisted development statement](docs/en/ai-assisted-development.md).

By submitting a contribution for inclusion, you agree that it is licensed
under the repository's Apache License 2.0 according to its contribution terms.
