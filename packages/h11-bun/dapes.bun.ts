import { Group, startIfMain, Task } from 'dapes';
import { groupH11 } from 'h11/dapes.h11.ts';
import { getAbsolutePath } from 'utftu';
import { build as esbuildBuild } from 'esbuild';

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
  parents: [groupH11.getTaskControl('build')],
  children: [types],
  exec: async ({ command }) => {
    await command('npm run build', { cwd: getAbsolutePath('.', import.meta) });
  },
});

const build2 = new Task({
  name: 'build2',
  // parents: [groupH11.getTaskControl('build')],
  // children: [types],
  exec: async ({ command }) => {
    await esbuildBuild({
      entryPoints: ['./src/h11-bun.ts'],
      outdir: './dist',
      bundle: true,
      splitting: true,
      format: 'esm',
      target: ['esnext'], // или ближе всего к "bun"
      external: ['h11', 'node:*', 'bun'],
    });
  },
});

export const groupH11Bun = new Group({
  name: 'bun',
  tasks: [build, build2],
});

startIfMain(groupH11Bun, import.meta);
