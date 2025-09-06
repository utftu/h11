import { Group, startIfMain } from 'dapes';
import { groupH11 } from './packages/h11/dapes.h11.ts';
import { groupH11Bun } from './packages/h11-bun/dapes.h11-bun.ts';

const group = new Group({
  tasks: [],
  subgroups: [groupH11, groupH11Bun],
});

startIfMain(group, import.meta);
