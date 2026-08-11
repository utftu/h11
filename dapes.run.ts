import { Group, startIfMain } from 'dapes';
import { groupH11 } from './packages/h11/dapes.h11.ts';
import { groupH11Fs } from './packages/h11-fs/dapes.fs.ts';
import { groupH11X } from './packages/h11-x/dapes.x.ts';
import { groupH11Example } from './packages/h11-x-example/dapes.example.ts';

const group = new Group({
  tasks: [],
  subgroups: [groupH11, groupH11Fs, groupH11X, groupH11Example],
});

startIfMain(group, import.meta);
