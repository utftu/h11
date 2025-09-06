import { Group, startIfMain } from 'dapes';
import { groupH11 } from './packages/h11/dapes.h11.ts';
import { groupH11Bun } from './packages/h11-bun/dapes.h11-bun.ts';
import { groupH11Node } from './packages/h11-node/dapes.h11-node.ts';

const group = new Group({
  tasks: [],
  subgroups: [groupH11, groupH11Bun, groupH11Node],
});

startIfMain(group, import.meta);
