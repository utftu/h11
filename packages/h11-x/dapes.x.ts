import { Group, publishPackage, startIfMain, Task } from 'dapes';
import { groupH11 } from '../h11/dapes.h11.ts';
import { getAbsolutePath } from 'utftu';
import { groupH11Fs } from 'h11-fs/dapes.fs.ts';
import { build as buildEsBuild } from 'esbuild';

const types = new Task({
  name: 'types',
  exec: async ({ command }) => {
    await command('npm run types', {
      cwd: getAbsolutePath('.', import.meta),
    });
  },
});

const build = new Task({
  name: 'build',
  parents: [
    groupH11.getTaskControl('build'),
    groupH11Fs.getTaskControl('build'),
  ],
  children: [types],
  exec: async () => {
    await Bun.build({
      entrypoints: [getAbsolutePath('./src/h11-x.ts', import.meta)],
      target: 'node',
      format: 'esm',
      outdir: getAbsolutePath('./dist', import.meta),
      external: ['vite'],
    });
    await buildEsBuild({
      entryPoints: [getAbsolutePath('./src/h11-x.client.ts', import.meta)],
      target: 'es2018',
      external: ['regan'],
      bundle: true,
      format: 'esm',
      outdir: getAbsolutePath('./dist', import.meta),
      jsx: 'automatic',
      jsxImportSource: 'regan',
    });
  },
});

const publish = new Task({
  name: 'publish',
  parents: [build],
  exec: async ({ ctx }) => {
    publishPackage({
      pathToPackage: getAbsolutePath('./package.json', import.meta),
      ctx,
    });
  },
});

export const groupH11X = new Group({
  name: 'x',
  tasks: [build, publish],
});

startIfMain(groupH11X, import.meta);
