import { Group, publishPackage, startIfMain, Task } from 'dapes';
import { groupH11 } from '../h11/dapes.h11.ts';
import { getAbsolutePath } from 'utftu';
import { groupH11Fs } from '../h11-fs/dapes.fs.ts';

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
  exec: async ({ command }) => {
    await command('npm run build', {
      cwd: getAbsolutePath('.', import.meta),
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
