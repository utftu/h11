import type { HandlerContainer, Method } from '../h11.ts';
import { Node, addNodeToChildren } from './node/node.ts';

type Params = Record<string, string>;

// /hello/world/:name/:family
export class Radix {
  root = new Node({ segment: '' });

  find(path: string, method: Method = 'GET') {
    const segments = path.split('/');

    const params: Params = {};
    let currentNode = this.root;
    let lastWild: {
      handler: HandlerContainer;
      params: Params;
      node: Node;
    } | null = null;

    outer: for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      if (currentNode.wildParent === true) {
        const wild = currentNode.children[currentNode.children.length - 1];

        const wildHandlerContainer = wild.handlers[method];

        if (wildHandlerContainer) {
          lastWild = {
            node: wild,
            handler: wildHandlerContainer,
            params: { ...params, wild: segments.slice(i).join('/') },
          };
        }
      }

      if (currentNode.segment[0] === ':') {
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

        if (child.segment === nextSegment) {
          currentNode = child;
          continue outer;
        }

        if (child.segment[0] === ':' && nextSegment !== '') {
          currentNode = child;
          continue outer;
        }
      }

      // no children node with target name
      return lastWild;
    }

    const handlerContainer = currentNode.handlers[method];

    if (!handlerContainer) {
      return lastWild;
    }

    // handle last segment
    return {
      node: currentNode,
      params,
      handler: handlerContainer,
    };
  }

  // hello/world/:name
  add(pattern: string, method: Method = 'GET', handler: HandlerContainer) {
    const patternSegments = pattern.slice(1).split('/');

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

      if (segment === '**') {
        currentNode.wildParent = true;
        // setWildToChildren(currentNode, method, );
      }

      currentNode = newNode;
    }

    currentNode.handlers[method] = handler;
    return currentNode;
  }
}
