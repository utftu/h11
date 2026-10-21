# Contributing

Issues and pull requests are welcome. The design calls are made by the maintainer, so for anything bigger than a bug fix open an issue first — it is cheaper than a rejected pull request.

## Getting the repo running

The runtime is Bun, in every package. There is no Node fallback.

```bash
bun install
bun run dapes.run.ts x build   # build first: see below
bun test                       # every package
```

The build before the tests is not optional on a fresh clone. The h11-x tests build real projects that import `h11` and `h11-x` by name, and those names resolve to `dist` — without it two tests fail on a missing entry point. [`dapes`](https://www.npmjs.com/package/dapes) keeps the order (`h11` → `h11-x`); a single package also builds on its own:

```bash
cd packages/h11 && bun run build
bun run dapes.run.ts example run    # the example on :3000
```

[`packages/h11-x-example`](./packages/h11-x-example) is the place to see a change working end to end.

## What a change should come with

- **A test next to the module it tests** (`log/log.ts` → `log/log.test.ts`), written with `bun:test`. A bug fix without a test that fails before it is hard to accept.
- **No new public API without a reason stated in the pull request.** Both packages aim to stay small.
- **A line in [`docs/decisions.md`](./docs/decisions.md)** if the change settles a question rather than just fixing code: what was decided, why, and what was rejected. That file is the project's memory.

## Style

The code is formatted by prettier with `singleQuote` (see `.prettierrc.json`); run it before committing.

The conventions the existing code follows: named exports only, no `index.ts` (a folder is named after its file — `utils/utils.ts`), the file extension is written in imports, types declared with `type` rather than `interface`, no `enum`. Read a neighbouring file and match it.

## Releasing

Publishing is done by the maintainer: bump the patch version, commit, `bun run build`, `npm publish` — `h11` before `h11-x`, which depends on it.

## Security

Do not open an issue for a vulnerability — see [SECURITY.md](./SECURITY.md).
