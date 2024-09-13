import { $ } from 'bun';

await $`rm -rf ./dist`;

await Promise.all([
  Bun.build({
    entrypoints: ['./src/h11.ts'],
    outdir: './dist',
  }),
  $`tsc --project tsconfig.types.json`,
  Bun.build({
    entrypoints: ['./src/providers/bun.ts'],
    outdir: './dist',
  }),
  $`tsc --project tsconfig.types.bun.json`,
  Bun.build({
    entrypoints: ['./src/providers/node.ts'],
    outdir: './dist',
    external: ['*'],
  }),
  $`tsc --project tsconfig.types.node.json`,
]);
