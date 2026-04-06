import { createLogger } from 'logw';
import { Radix } from './radix/radix.ts';
import type {
  Context,
  FsApi,
  Handler,
  HandlersProps,
  HanlderEnt,
  Method,
} from './types.ts';
import { createEventEmitter } from 'utftu';

type NotFoundHandler = (props: Context) => Response | Promise<Response>;
type ErrorHandler = (
  props: { error: Error } & Context,
) => Response | Promise<Response>;

const defaultOnNotFound: NotFoundHandler = ({ req, h11 }) => {
  h11.ee.emit('code', {
    code: 404,
    text: `Not found 123 ${req.url}`,
  });

  return new Response('Not Found', {
    status: 404,
    statusText: 'Not Found 404',
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};

const defaultOnError: ErrorHandler = ({ req, error, h11 }) => {
  h11.ee.emit('code', {
    code: 500,
    text: `h11: Error ${req.url} - ${error.message}\n${error.stack ?? ''}`,
  });

  return new Response('Internal Server Error', {
    status: 500,
    statusText: 'Internal Server Error',
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};

const getHandlerEntFromProps = (param: HandlersProps): HanlderEnt => {
  if (Array.isArray(param[0])) {
    return { handlers: param[0] };
  }

  if ((param[0] as any)?.handlers) {
    return param as any as HanlderEnt;
  }

  return { handlers: param as Handler[] };
};

export class H11<TExecProps extends Context = Context> {
  types!: TExecProps;
  radix = new Radix();
  fsApi?: FsApi;
  private globalHandlers: Handler[] = [];
  ee = createEventEmitter<
    {
      code: {
        code: number;
        text: string;
      };
    } & Record<string, any>
  >();
  data: Record<string, any> = {};

  startLogger() {
    const logger = createLogger({ prefix: 'h11' });
    const stopListen = this.ee.on('code', ({ code, text }) => {
      const message = `${code} ${text}`;
      if (code >= 500) {
        logger.error(message);
        return;
      }
      if (code < 500 && code >= 400) {
        logger.warn(message);
        return;
      }
      logger.log(message);
    });

    return stopListen;
  }

  onNotFound: NotFoundHandler = defaultOnNotFound;
  onError: ErrorHandler = defaultOnError;

  private addRoute(pattern: string, method: Method, handlers: HandlersProps) {
    const handlerEnt = getHandlerEntFromProps(handlers);
    this.radix.add(pattern, method, handlerEnt);
  }

  get(pattern: string, ...handlers: HandlersProps) {
    this.addRoute(pattern, 'GET', handlers);
    return this;
  }
  post(pattern: string, ...handlers: HandlersProps) {
    this.addRoute(pattern, 'POST', handlers);
    return this;
  }

  use(...handlers: Handler[]) {
    this.globalHandlers.push(...handlers);
    return this;
  }

  async exec({
    req,
    data,
    providers,
  }: {
    req: Request;
    data: Record<string, string>;
    providers: Record<string, any>;
  }): Promise<Response> {
    const url = new URL(req.url);
    const findResult = this.radix.find(url.pathname, req.method as any);

    if (!findResult) {
      return this.onNotFound({
        req,
        params: {},
        data,
        providers,
        h11: this,
      });
    }

    const props = {
      req,
      params: findResult.params,
      data,
      providers,
      h11: this,
    };

    try {
      for (const handler of [
        ...this.globalHandlers,
        ...findResult.handlerEnt.handlers,
      ]) {
        const response = await handler(props);
        if (response) {
          return response;
        }
      }
      return this.onNotFound(props);
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      return this.onError({ ...props, error: error as Error });
    }
  }
}
