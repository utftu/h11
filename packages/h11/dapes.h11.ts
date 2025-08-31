import { Group, startIfMain, Task } from 'dapes';
import { getAbsolutePath } from 'utftu';

const build = new Task({
  name: 'build',
  exec: async ({ command }) => {
    await command('npm run build', { cwd: getAbsolutePath('', import.meta) });
  },
});

const group = new Group({
  tasks: [build],
});

startIfMain(group, import.meta);
