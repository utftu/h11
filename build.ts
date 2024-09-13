// await Bun.build({
//   entrypoints: ['./src/h11.ts'],
//   outdir: './dist',
// });

await Bun.build({
  entrypoints: ['./src/provides/bun.ts'],
  outdir: './dist',
});

await Bun.build({
  entrypoints: ['./src/provides/node.ts'],
  outdir: './dist',
  external: ['node:stream', 'stream', 'node'],
});

// await Bun.build({
//   entrypoints: ['./src/provides/nodejs.ts'],
//   outdir: './ddd',
// });

// await Bun.build({
//   entrypoints: ['src/provides/node.ts'],
//   outdir: './dist',
// });

// './src/h11.ts',
