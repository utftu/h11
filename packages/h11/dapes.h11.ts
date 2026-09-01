import { Group, startIfMain, Task } from 'dapes';
import { getAbsolutePath } from 'utftu';

export const buildH11 = new Task({
  name: 'build',
  children: [],
  exec: async ({ command }) => {
    await command('npm run build', { cwd: getAbsolutePath('.', import.meta) });
  },
});

export const groupH11 = new Group({
  name: 'h11',
  tasks: [buildH11],
});

startIfMain(groupH11, import.meta);
