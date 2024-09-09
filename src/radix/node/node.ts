import type { HandlerContainer, Method } from '../../h11.ts';

export class Node {
  segment: string;

  // data
  handlers: Partial<Record<Method, HandlerContainer>> = {};

  children: Node[] = [];
  wildParent: boolean = false;

  parent?: Node;

  constructor({ segment, parent }: { segment: string; parent?: Node }) {
    this.segment = segment;
    this.parent = parent;
  }
}

export const addNodeToChildren = (parent: Node, node: Node) => {
  const children = parent.children;

  if (children.length === 0) {
    children.push(node);
    return;
  }

  if (node.segment === '**') {
    children.push(node);
    return;
  } else if (node.segment[0] === ':') {
    for (let i = children.length - 1; i >= 0; i--) {
      const compareNode = children[i];

      if (compareNode.segment === '**') {
        continue;
      }

      children.splice(i + 1, 0, node);
      return;
    }

    children.unshift(node);
  } else {
    for (let i = children.length - 1; i >= 0; i--) {
      const compareNode = children[i];

      if (compareNode.segment === '**' || compareNode.segment[0] === ':') {
        continue;
      }

      children.splice(i + 1, 0, node);
      return;
    }

    children.unshift(node);
  }
};
