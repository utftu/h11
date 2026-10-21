# h11

[![test](https://github.com/utftu/h11/actions/workflows/test.yml/badge.svg)](https://github.com/utftu/h11/actions/workflows/test.yml)

A monorepo with a hand-rolled HTTP stack on Bun/TypeScript: a minimal router with static file serving (`h11`), and an SSR layer on top of Vite + [regan](https://www.npmjs.com/package/regan) (`h11-x`).

## Packages

| Package | What it does |
|---|---|
| [`packages/h11`](./packages/h11) | The core — the `H11` class with a radix router, middlewares, error handling, static file serving and an adapter for `Bun.serve`. Bun-only runtime |
| [`packages/h11-x`](./packages/h11-x) | SSR/hydration on top of `h11` + Vite + regan |
| [`packages/h11-x-example`](./packages/h11-x-example) | A working example that wires everything together |

## Development

```bash
bun install
bun run dapes.run.ts x build   # the h11-x tests need the built dist
bun test                       # tests of every package
```

The runtime is Bun only, in every package.

Each package builds on its own:

```bash
cd packages/h11 && bun run build
```

Or through the task orchestrator [`dapes`](https://www.npmjs.com/package/dapes), which knows the dependencies between packages (`h11` → `h11-x` → `h11-x-example`):

```bash
bun run dapes.run.ts x build        # builds h11 → h11-x in order
bun run dapes.run.ts example run    # starts the example on :3000
```

## Releasing to npm

1. Bump the version in `packages/<pkg>/package.json`, commit.
2. Build and publish the package by hand: `cd packages/<pkg> && bun run build && npm publish`.

Order matters: `h11` is published before `h11-x`, which depends on it.

## Status

Maintained: both packages are used in the author's own projects, and the latest release of each is the supported one — see [SECURITY.md](./SECURITY.md).

`h11` has settled down: it is covered by tests and grows by addition. `h11-x` is still `0.0.x` — an SSR layer whose API does change, and a breaking change can land in a patch release, so pin the version if that matters to you.

## License

MIT — see [LICENSE](./LICENSE). Copyright 2026 Aleksey Malyuta.

## Security

Found a vulnerability? Report it privately, not in an issue — see [SECURITY.md](./SECURITY.md).

Maintainer: Aleksey Malyuta (@utftu)
