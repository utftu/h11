import { Radix } from './radix/radix.ts';

export type Method = 'GET' | 'POST' | 'DELET' | 'PUT' | 'PATCH';

type HandlerResponse = Promise<Response> | Response;
type PluginReponse = HandlerResponse | Promise<void> | void;

export type HandlerPure = (props: Props) => HandlerResponse;
export type HandlerContainer = {
  handler: HandlerPure;
  plugins: Plugin[];
};

type Props = {
  req: Request;
  params: Record<string, string>;
  data: Record<any, any>;
};

type Handler = HandlerPure | HandlerContainer;

export type Plugin = (props: Props) => HandlerResponse;

type NotFoundHandler = (req: Request) => HandlerResponse;
type ErrorHandler = (props: { error: Error } & Props) => HandlerResponse;

const defaultOnNotFound: NotFoundHandler = (req) => {
  console.log(`h9: Not found ${req.url}`);
  return new Response('Not Found', {
    status: 404,
    statusText: 'Not Found 404',
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};

const defaultOnError: ErrorHandler = ({ req, error }) => {
  console.error(`h9: Error ${req.url} - ${error.message}`);
  return new Response('Error 500', {
    status: 500,
    statusText: 'System error 500',
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};

export class H9 {
  radix = new Radix();

  onNotFound: NotFoundHandler = defaultOnNotFound;
  onError: ErrorHandler = defaultOnError;

  private addRoute(pattern: string, method: Method, handler: Handler) {
    const preparedHandler =
      typeof handler === 'function' ? { handler, plugins: [] } : handler;
    this.radix.add(pattern, method, preparedHandler);
  }

  get(pattern: string, handler: Handler) {
    this.addRoute(pattern, 'GET', handler);
    return this;
  }

  post(pattern: string, handler: Handler) {
    this.addRoute(pattern, 'POST', handler);
    return this;
  }

  async exec(req: Request) {
    const url = new URL(req.url);
    const findResult = this.radix.find(url.pathname, req.method as any);

    if (!findResult) {
      return this.onNotFound(req);
    }

    const data = {};
    const props = { req, params: findResult.params, data };

    try {
      for (const plugin of findResult.handler.plugins) {
        const response = await plugin(props);
        if (response) {
          return response;
        }
      }
      const response = await findResult.handler.handler(props);
      return response;
    } catch (error) {
      return this.onError({ ...props, error: error as Error });
    }
  }
}
