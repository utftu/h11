import { Group, publishPackage, startIfMain, Task } from 'dapes';
import { groupH11 } from 'h11/dapes.h11.ts';
import { getAbsolutePath } from 'utftu';

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

export const groupH11Node = new Group({
  name: 'h11-node',
  tasks: [build, publish],
});

startIfMain(groupH11Node, import.meta);
