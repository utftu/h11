import type { Handler, HandlerContainer, Plugin } from "../h4.ts";

export class Radix {
  root = new Node({segment: ''})

  find(path: string) {
    // remove firt /
    const segments = path.split('/');

    const params: Record<string, string> = {}
    let lastWildcardHandler = this.root.wildHandler
    let currentNode = this.root;
    outer: for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      if (currentNode.segment[0] === ':') {
        params[currentNode.segment.slice(1)] = segment;
      }

      const isLastSegment = i + 1 === segments.length;

      if (isLastSegment) {
        break;
      }


      if (currentNode.children.length === 0) {
        // no node children in tree
        return null;
      }

      for (const child of currentNode.children) {
        const nextSegment = segments[i + 1]

        if (child.segment[0] === ':') {
          currentNode = child;
          continue outer
        }

        if (child.segment === nextSegment) {
          currentNode = child;
          continue outer
        }
      }

       // no children node with target name
       return null;
    }

    // handle last segment
    return {
      params,
      node: currentNode
    }
  }

  add(pattern: string) {
    const patternSegments = pattern.slice(1).split('/');

    let currentNode = this.root;
    outer: for (let i = 0; i < patternSegments.length; i++) {
      const segment = patternSegments[i];

      for (const child of currentNode.children) {
        if (child.segment === segment) {
          currentNode = child
          continue outer;
        }
      }

      const lastChild = currentNode.children[currentNode.children.length - 1];
      const isLastChildAnySegment = lastChild && lastChild.segment[0] === ':';

      const newNode = new Node({segment, parent: currentNode})

      if (isLastChildAnySegment) {
        currentNode.children.unshift(newNode)
      } else {
        currentNode.children.push(newNode)
      }


      // currentTreeNode.children.push(newNode)
      currentNode = newNode;
    }

    return currentNode
  }
}

export class Node {
  segment: string;

  // data
  plugins: Plugin[] = []
  handlers: HandlerContainer[] = [];

  children: {
    strict: Node[],
    named: Node[],
    wild: Node[]
  } = {
    strict: [],
    named: [],
    wild: []
  }
  parent?: Node

  constructor({segment, parent}: {segment: string, parent?: Node,}) {
    this.segment = segment;
    this.parent = parent
    // this.wildHandler = wildHandler
  }
}

export class NodeRoot extends Node {
  segment = '';
}