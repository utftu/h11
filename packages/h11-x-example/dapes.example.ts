import { Group, startIfMain, Task } from 'dapes';
import { getAbsolutePath } from 'utftu';
import { groupH11X } from '../h11-x/dapes.x.ts';

const runFull = new Task({
  name: 'build',
  parents: [groupH11X.getTaskControl('build')],
  exec: async ({ command }) => {
    await command('bun run src/server.ts', {
      cwd: getAbsolutePath('.', import.meta),
    });
  },
});

const run = new Task({
  name: 'run',
  exec: async ({ command }) => {
    await command('bun run src/server.ts', {
      cwd: getAbsolutePath('.', import.meta),
    });
  },
});

export const groupH11Example = new Group({
  name: 'example',
  tasks: [runFull, run],
});

startIfMain(groupH11Example, import.meta);
