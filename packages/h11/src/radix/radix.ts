import type { Handler, HanlderEnt, Method } from '../types.ts';
import { Node, addNodeToChildren } from './node.ts';

type Params = Record<string, string>;

export type FindResult = {
  params: Params;
  handlers: Handler[];
};

export class Radix {
  root = new Node({ segment: '' });

  find(path: string, method: Method = 'GET'): FindResult {
    const segments = path.split('/');

    const params: Params = {};
    const middlewares: Handler[] = [];
    let lastWild: FindResult | undefined = undefined;
    let currentNode = this.root;

    outer: for (let i = 0; i < segments.length; i++) {
      for (const middleware of currentNode.middlewares) {
        if (!middleware.method || middleware.method === method) {
          middlewares.push(middleware.handler);
        }
      }

      const wildEnt = currentNode.wilds[method];
      if (wildEnt) {
        lastWild = {
          params: { ...params, wild: segments.slice(i + 1).join('/') },
          handlers: [...middlewares, ...wildEnt.handlers],
        };
      }

      if (currentNode.segment[0] === ':') {
        const paramName = currentNode.segment.slice(1);
        params[paramName] = segments[i];
      }

      if (i + 1 === segments.length) break;

      const nextSegment = segments[i + 1];

      for (const child of currentNode.children) {
        if (
          child.segment === nextSegment ||
          (child.segment[0] === ':' && nextSegment !== '')
        ) {
          currentNode = child;
          continue outer;
        }
      }

      return lastWild ?? { params, handlers: [] };
    }

    const handlerEnt = currentNode.handlers[method];
    if (handlerEnt) {
      return { params, handlers: [...middlewares, ...handlerEnt.handlers] };
    }

    return lastWild ?? { params, handlers: [...middlewares] };
  }

  private findOrCreateNode(pattern: string): Node {
    const patternSegments = pattern.slice(1).split('/');
    let currentNode = this.root;

    outer: for (const segment of patternSegments) {
      for (const child of currentNode.children) {
        if (child.segment === segment) {
          currentNode = child;
          continue outer;
        }
      }

      const newNode = new Node({ segment, parent: currentNode });
      addNodeToChildren(currentNode, newNode);
      currentNode = newNode;
    }

    return currentNode;
  }

  add(pattern: string, method: Method = 'GET', handlerEnt: HanlderEnt) {
    if (pattern.endsWith('/**')) {
      const prefix = pattern.slice(0, -3);
      const node = prefix ? this.findOrCreateNode(prefix) : this.root;
      node.wilds[method] = handlerEnt;
      return node;
    }

    const node = this.findOrCreateNode(pattern);
    node.handlers[method] = handlerEnt;
    return node;
  }

  addMiddleware(pattern: string, handlers: Handler[], method?: Method) {
    const node = pattern === '/' ? this.root : this.findOrCreateNode(pattern);
    for (const handler of handlers) {
      node.middlewares.push({ method, handler });
    }
  }
}
