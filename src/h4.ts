import { Radix, Node } from "./radix/radix.ts";

abstract class RouterEngine {
  add() {}
}

type HandlerProps = {
  req: Request;
  params: Record<string, string>;
  data: Record<any, any>;
};

class Props implements HandlerProps {
  req: Request;
  params: Record<string, string>;
  data: Record<any, any>;
  constructor({ req, params, data }: HandlerProps) {
    this.req = req;
    this.params = params;
    this.data = data;
  }
}

const;

export type Handler = (props: Props) => Promise<Response>;
export type HandlerContainer = {
  handler: Handler;
  method: "GET" | "POST";
};

export type Plugin = (props: Props) => Promise<Response | null>;
type ErrorHandlerPath = (req: Request) => Promise<Response>;
type ErrorHandler = (props: { error: Error } & Props) => Promise<Response>;

class App {
  radix = new Radix();

  addNotFound(fn: () => Promise<Response>) {}

  errorHandler: ErrorHandler = (() => {}) as any;
  addErrorHandler(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
  }

  addPlugin(pattern: string, plugin: Plugin) {
    const node = this.radix.add(pattern);
    node.plugins.push(plugin);
  }

  async ex(req: Request) {
    const data = {};
    const url = new URL(req.url);
    const findResult = this.radix.find(url.pathname);

    if (!findResult) {
      return null;
    }
    const props = new Props({ req, params: findResult.params, data });

    // iterate over plugins
    const nodes = [];
    for (let currentNode: Node = findResult.node; ; ) {
      nodes.push(currentNode);
      if (!currentNode.parent) {
        break;
      }
      currentNode = currentNode.parent;
    }

    for (let i = nodes.length; i >= 0; i--) {
      const node = nodes[i];

      for (const plugin of node.plugins) {
        try {
          const pluginResponse = await plugin(new Props(props));

          if (pluginResponse) {
            return pluginResponse;
          }
        } catch (error) {
          this.errorHandler({ ...props, error: error as Error });
        }
      }
    }

    const handlerContainer = findResult.node.handlers.find(
      ({ method }) => method === req.method
    );

    if (!handlerContainer) {
      return null;
    }

    try {
      const response = handlerContainer.handler(props);
      return response;
    } catch (error) {}
  }
}
