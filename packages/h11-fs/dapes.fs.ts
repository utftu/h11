import { Group, publishPackage, startIfMain, Task } from 'dapes';
import { groupH11 } from '../h11/dapes.h11.ts';
import { getAbsolutePath } from 'utftu';
import { build as esbuildBuild } from 'esbuild';
import { groupH11Node } from '../h11-node/dapes.node.ts';
import { groupH11Bun } from '../h11-bun/dapes.bun.ts';

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
    groupH11Node.getTaskControl('build'),
    groupH11Bun.getTaskControl('build'),
  ],
  children: [types],
  exec: async ({ prefix }) => {
    console.log(prefix + 'start');
    await esbuildBuild({
      entryPoints: [getAbsolutePath('./src/h11-fs.ts', import.meta)],
      outdir: getAbsolutePath('./dist', import.meta),
      bundle: true,
      splitting: true,
      format: 'esm',
      target: ['esnext'], // или ближе всего к "bun"
      external: ['h11', 'h11-bun', 'h11-node', 'node:*'],
    });
    console.log(prefix + 'finish');
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

export const groupH11Fs = new Group({
  name: 'fs',
  tasks: [build, publish],
});

startIfMain(groupH11Fs, import.meta);
