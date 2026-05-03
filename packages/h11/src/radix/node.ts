import type { Handler, Method } from '../types.ts';

export class Node {
  segment: string;
  handlers: Partial<Record<Method, Handler[]>> = {};
  wilds: Partial<Record<Method, Handler[]>> = {};
  middlewares: Handler[] = [];
  staticChildren: Map<string, Node> = new Map();
  paramChild?: Node;
  parent?: Node;

  constructor({ segment, parent }: { segment: string; parent?: Node }) {
    this.segment = segment;
    this.parent = parent;
  }
}
