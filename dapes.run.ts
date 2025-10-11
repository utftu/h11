import { Group, startIfMain } from 'dapes';
import { groupH11 } from './packages/h11/dapes.h11.ts';
import { groupH11Bun } from './packages/h11-bun/dapes.bun.ts';
import { groupH11Node } from './packages/h11-node/dapes.node.ts';
import { groupH11Fs } from './packages/h11-fs/dapes.fs.ts';

const group = new Group({
  tasks: [],
  subgroups: [groupH11, groupH11Bun, groupH11Node, groupH11Fs],
});

startIfMain(group, import.meta);
