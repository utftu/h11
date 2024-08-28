import type { Handler, HandlerContainer, Plugin } from "../h4.ts";

export class Node {
  segment: string;

  // data
  plugins: Plugin[] = [];
  handlers: HandlerContainer[] = [];

  children: Node[] = [];
  // wild: boolean = false;
  wild: Method[] = [];
  wildParent: boolean = false;

  parent?: Node;

  constructor({ segment, parent }: { segment: string; parent?: Node }) {
    this.segment = segment;
    this.parent = parent;
  }
}

export class NodeRoot extends Node {
  segment = "";
}

type Method = "GET" | "POST";

const findWild = (node: Node, method: Method) => {
  if (!node.wild.includes(method)) {
    return;
  }

  if (!node.parent) {
    return;
  }

  for (let i = node.parent.children.length - 1; i <= 0; i--) {
    const compareNode = node.parent.children[i];

    if (compareNode.segment === "**") {
      for (const handlerContainer of compareNode.handlers) {
        if (handlerContainer.method === method) {
          return handlerContainer.handler;
        }
      }
    }
  }

  return findWild(node.parent, method);
};

const setWildToChildren = (node: Node, method: Method) => {
  node.wild.push(method);

  for (const child of node.children) {
    setWildToChildren(child, method);
  }
};

const addNodeToChildren = (parent: Node, node: Node) => {
  const children = parent.children;

  if (children.length === 0) {
    children.push(node);
    return;
  }

  if (node.segment === "**") {
    children.push(node);
    return;
  } else if (node.segment[0] === ":") {
    for (let i = children.length - 1; i >= 0; i--) {
      const compareNode = children[i];

      if (compareNode.segment === "**") {
        continue;
      }

      children.splice(i + 1, 0, node);
      return;
    }
  } else {
    for (let i = children.length - 1; i >= 0; i--) {
      const compareNode = children[i];

      if (compareNode.segment === "**" || compareNode.segment[0] === ":") {
        continue;
      }

      children.splice(i + 1, 0, node);
      return;
    }
  }
};

type Params = Record<string, string>;

export class Radix {
  root = new Node({ segment: "" });

  find(path: string) {
    const segments = path.split("/");

    const params: Params = {};
    let currentNode = this.root;
    let lastWild: { node: Node; params: Params } | null = null;

    outer: for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      if (currentNode.wildParent === true) {
        lastWild = {
          node: currentNode.children[currentNode.children.length - 1],
          params: { ...params },
        };
      }

      if (currentNode.segment[0] === ":") {
        params[currentNode.segment.slice(1)] = segment;
      }

      const isLastSegment = i + 1 === segments.length;

      if (isLastSegment) {
        break;
      }

      if (currentNode.children.length === 0) {
        // no node children in tree
        return lastWild;
      }

      for (const child of currentNode.children) {
        const nextSegment = segments[i + 1];

        if (child.segment[0] === ":") {
          currentNode = child;
          continue outer;
        }

        if (child.segment === nextSegment) {
          currentNode = child;
          continue outer;
        }
      }

      // no children node with target name
      return lastWild;
    }

    // handle last segment
    return {
      params,
      node: currentNode,
    };
  }

  add(pattern: string, method: Method = "GET") {
    const patternSegments = pattern.slice(1).split("/");

    let currentNode = this.root;
    outer: for (let i = 0; i < patternSegments.length; i++) {
      const segment = patternSegments[i];

      for (const child of currentNode.children) {
        if (child.segment === segment) {
          currentNode = child;
          continue outer;
        }
      }

      const newNode = new Node({ segment, parent: currentNode });

      addNodeToChildren(currentNode, newNode);

      if (segment === "**") {
        currentNode.wildParent = true;
        setWildToChildren(currentNode, method);
      }

      currentNode = newNode;
    }

    return currentNode;
  }
}
