# Contributing to C4thedral

Thank you for helping improve C4thedral and C4ML. The project is a public source
beta: useful functionality is implemented, but the language compatibility
promise and some frontend contracts are still deliberately provisional. See
`PROJECT-STATUS.md` for the current maturity and release boundaries.

## Before starting

Open an issue before investing in a broad language, architecture, dependency,
or user-interface change. `SPEC.md` defines accepted product behavior;
`TESTING.md` defines the evidence required for a change. Syntax shown in
`DOCUMENTATION.md` and `examples/draft` is a preview, not a compatibility
promise.

C4thedral must remain an original system. Describe outside products in terms of
general capabilities or limitations. Do not copy their code, grammar,
documentation, examples, themes, icons, fixtures, or interface layouts.

## Development setup

Use Node.js 24.15.0 or a newer 24.x release and pnpm 11.24.0. Follow
`SOURCE-RELEASE.md` for a clean checkout and build. Before opening a pull
request, run:

```shell
pnpm install --frozen-lockfile
pnpm run check
git diff --check
```

Rendering changes also require visual inspection of intentionally changed
output. Native packaging changes require the affected host-specific checks in
`PLATFORMS.md` and `TESTING.md`.

## Pull requests

Keep each pull request focused and explain:

- the user-visible or architectural problem;
- the accepted specification boundary;
- the implementation and adapter impact;
- automated and visual evidence; and
- intentionally deferred work.

Do not commit generated build output, credentials, private architecture source,
or local machine paths. Dependency changes must follow the update gate in
`DEPENDENCIES.md`; automated update pull requests are never merged solely
because their version number is newer.

By submitting a contribution for inclusion, you agree that it is licensed
under the repository's Apache License 2.0 according to its contribution terms.
