import { Group, startIfMain, Task } from 'dapes';
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

export const groupH11Bun = new Group({
  name: 'h11-bun',
  tasks: [build],
});

startIfMain(groupH11Bun, import.meta);
