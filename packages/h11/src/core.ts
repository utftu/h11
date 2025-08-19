import type { FsApi } from './fs-api/fs-api.ts';
import { Radix } from './radix/radix.ts';
import type { Context, Handler, Method } from './types.ts';

export type ExecProps = {
  req: Request;
  providers: Record<string, any>;
  data: Record<any, any>;
};

type NotFoundHandler = (req: Request) => Response | Promise<Response>;
type ErrorHandler = (
  props: { error: Error } & Context
) => Response | Promise<Response>;

const defaultOnNotFound: NotFoundHandler = (req) => {
  console.log(`h11: Not found ${req.url}`);
  return new Response('Not Found', {
    status: 404,
    statusText: 'Not Found 404',
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};

const defaultOnError: ErrorHandler = ({ req, error }) => {
  console.error(`h11: Error ${req.url} - ${error.message}`);
  return new Response(error.message || 'Error 500', {
    status: 500,
    statusText: 'System error 500',
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};

export class H11<TExecProps extends ExecProps = ExecProps> {
  types!: TExecProps;
  radix = new Radix();
  fsApi?: FsApi;

  onNotFound: NotFoundHandler = defaultOnNotFound;
  onError: ErrorHandler = defaultOnError;

  private addRoute(pattern: string, method: Method, handlers: Handler[]) {
    const preparedHandler = { handlers };
    this.radix.add(pattern, method, preparedHandler);
  }

  get(pattern: string, ...handlers: Handler[]) {
    this.addRoute(pattern, 'GET', handlers);
    return this;
  }

  post(pattern: string, ...handlers: Handler[]) {
    this.addRoute(pattern, 'POST', handlers);
    return this;
  }

  async exec({ req, data, providers }: TExecProps): Promise<Response> {
    const url = new URL(req.url);
    const findResult = this.radix.find(url.pathname, req.method as any);

    if (!findResult) {
      return this.onNotFound(req);
    }

    const props = {
      req,
      params: findResult.params,
      data,
      providers,
    };

    try {
      for (const handler of findResult.handlerEnt.handlers) {
        const response = await handler(props);
        if (response) {
          return response;
        }
      }
      return defaultOnNotFound(req);
      // const response = await findResult.handlerEnt.handler(props);
      // return response;
    } catch (error) {
      return this.onError({ ...props, error: error as Error });
    }
  }
}
