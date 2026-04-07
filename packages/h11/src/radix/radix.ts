import type { Handler, HanlderEnt, Method } from '../types.ts';
import { Node, addNodeToChildren } from './node.ts';

type Params = Record<string, string>;

type FindResult = {
  handlerEnt: HanlderEnt;
  params: Params;
  node: Node;
  middlewares: Handler[];
};

// /hello/world/:name/:family
export class Radix {
  root = new Node({ segment: '' });

  find(path: string, method: Method = 'GET'): FindResult | undefined {
    const segments = path.split('/');

    const params: Params = {};
    const middlewares: Handler[] = [...this.root.middlewares];
    let currentNode = this.root;
    let lastWild: FindResult | undefined = undefined;

    outer: for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      if (currentNode.wildParent === true) {
        const wild = currentNode.children[currentNode.children.length - 1];

        const wildHandlerContainer = wild.handlers[method];

        if (wildHandlerContainer) {
          lastWild = {
            node: wild,
            handlerEnt: wildHandlerContainer,
            params: { ...params, wild: segments.slice(i).join('/') },
            middlewares: [...middlewares, ...wild.middlewares],
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
          middlewares.push(...child.middlewares);
          continue outer;
        }

        if (child.segment[0] === ':' && nextSegment !== '') {
          currentNode = child;
          middlewares.push(...child.middlewares);
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
      handlerEnt: handlerContainer,
      middlewares,
    };
  }

  private findOrCreateNode(pattern: string): Node {
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
      }

      currentNode = newNode;
    }

    return currentNode;
  }

  // hello/world/:name
  add(pattern: string, method: Method = 'GET', handler: HanlderEnt) {
    const node = this.findOrCreateNode(pattern);
    node.handlers[method] = handler;
    return node;
  }

  addMiddleware(pattern: string, handlers: Handler[]) {
    const node = pattern === '/' ? this.root : this.findOrCreateNode(pattern);
    node.middlewares.push(...handlers);
  }
}
