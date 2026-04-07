import type { Handler, HanlderEnt, Method } from '../types.ts';

export type MiddlewareEnt = {
  method?: Method;
  handler: Handler;
};

export class Node {
  segment: string;
  handlers: Partial<Record<Method, HanlderEnt>> = {};
  wilds: Partial<Record<Method, HanlderEnt>> = {};
  middlewares: MiddlewareEnt[] = [];
  children: Node[] = [];
  parent?: Node;

  constructor({ segment, parent }: { segment: string; parent?: Node }) {
    this.segment = segment;
    this.parent = parent;
  }
}

export const addNodeToChildren = (parent: Node, node: Node) => {
  const children = parent.children;

  if (node.segment[0] === ':') {
    children.push(node);
    return;
  }

  const firstParamIdx = children.findIndex((c) => c.segment[0] === ':');
  if (firstParamIdx === -1) {
    children.push(node);
  } else {
    children.splice(firstParamIdx, 0, node);
  }
};
