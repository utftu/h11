import type { Handler, Method } from '../types.ts';

export class Node {
  segment: string;
  handlers: Partial<Record<Method, Handler[]>> = {};
  wilds: Partial<Record<Method, Handler[]>> = {};
  middlewares: Handler[] = [];
  staticChildren: Map<string, Node> = new Map();
  paramChild?: Node;

  constructor({ segment }: { segment: string }) {
    this.segment = segment;
  }
}

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
    // Один элемент на каждый встреченный wildcard-узел, от корня к листу.
    // В точках возврата порядок групп переворачивается (не порядок внутри
    // группы!), так что exec() пробует самый глубокий (специфичный) /**
    // первым, а более общие — только как фолбэк, если тот не ответил.
    const wildcardGroups: Handler[][] = [];
    let wildcardParams: Params | undefined = undefined;
    let currentNode = this.root;

    for (let i = 0; i < segments.length; i++) {
      middlewares.push(...currentNode.middlewares);

      // Параметр узла записывается до снапшота wildcardParams, иначе
      // "/users/:id/**" отдал бы хендлеру только wild, потеряв id.
      if (currentNode.segment[0] === ':') {
        params[currentNode.segment.slice(1)] = segments[i];
      }

      const wildHandlers = currentNode.wilds[method];
      if (wildHandlers) {
        wildcardGroups.push(wildHandlers);
        wildcardParams = { ...params, wild: segments.slice(i + 1).join('/') };
      }

      if (i + 1 === segments.length) break;

      const nextSegment = segments[i + 1];

      const staticChild = currentNode.staticChildren.get(nextSegment);
      if (staticChild) {
        currentNode = staticChild;
        continue;
      }

      if (currentNode.paramChild && nextSegment !== '') {
        currentNode = currentNode.paramChild;
        continue;
      }

      if (wildcardGroups.length > 0) {
        return {
          params: wildcardParams!,
          handlers: [...middlewares, ...wildcardGroups.reverse().flat()],
        };
      }
      return { params, handlers: [] };
    }

    const routeHandlers = currentNode.handlers[method];
    if (routeHandlers) {
      return { params, handlers: [...middlewares, ...routeHandlers] };
    }

    if (wildcardGroups.length > 0) {
      return {
        params: wildcardParams!,
        handlers: [...middlewares, ...wildcardGroups.reverse().flat()],
      };
    }
    return { params, handlers: [...middlewares] };
  }

  private findOrCreateNode(pattern: string): Node {
    const patternSegments = pattern.slice(1).split('/');
    let currentNode = this.root;

    for (const segment of patternSegments) {
      if (segment[0] === ':') {
        if (!currentNode.paramChild) {
          currentNode.paramChild = new Node({ segment });
        }

        // Узел хранит одного параметрического ребёнка, поэтому два разных
        // имени на одном уровне молча слились бы в первое.
        if (currentNode.paramChild.segment !== segment) {
          throw new Error(
            `Param conflict in "${pattern}": "${currentNode.paramChild.segment}" is already used on this level`,
          );
        }

        currentNode = currentNode.paramChild;
      } else {
        let child = currentNode.staticChildren.get(segment);
        if (!child) {
          child = new Node({ segment });
          currentNode.staticChildren.set(segment, child);
        }
        currentNode = child;
      }
    }

    return currentNode;
  }

  add(pattern: string, method: Method = 'GET', handlers: Handler[]) {
    if (pattern.endsWith('/**')) {
      const prefix = pattern.slice(0, -3);
      const node = prefix ? this.findOrCreateNode(prefix) : this.root;
      node.wilds[method] = handlers;
      return node;
    }

    const node = this.findOrCreateNode(pattern);
    node.handlers[method] = handlers;
    return node;
  }

  // Миддлвари узла и так работают на всё поддерево, поэтому "/api/**" — это
  // тот же узел, что и "/api". Без этого "**" уехал бы в имя статического
  // сегмента и миддлварь молча не подключилась бы.
  addMiddleware(pattern: string, handlers: Handler[]) {
    const prefix = pattern.endsWith('/**') ? pattern.slice(0, -3) : pattern;
    const node =
      prefix === '' || prefix === '/'
        ? this.root
        : this.findOrCreateNode(prefix);
    node.middlewares.push(...handlers);
  }
}
