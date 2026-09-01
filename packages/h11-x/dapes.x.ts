import { Group, startIfMain, Task } from 'dapes';
import { groupH11 } from '../h11/dapes.h11.ts';
import { getAbsolutePath } from 'utftu';

const build = new Task({
  name: 'build',
  parents: [groupH11.getTaskControl('build')],
  children: [],
  exec: async ({ command }) => {
    await command('npm run build', {
      cwd: getAbsolutePath('.', import.meta),
    });
  },
});

export const groupH11X = new Group({
  name: 'x',
  tasks: [build],
});

startIfMain(groupH11X, import.meta);
