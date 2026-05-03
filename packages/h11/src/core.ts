import { createLogger } from 'logw';
import { Radix } from './radix/radix.ts';
import type {
  Context,
  DataModule,
  FsApi,
  Handler,
  HandlersProps,
  HanlderEnt,
  Method,
} from './types.ts';
import { createEventEmitter } from 'utftu';
import {
  defaultOnError,
  defaultOnNotFound,
  type ErrorHandler,
  type NotFoundHandler,
} from './errors.ts';

const getHandlerEntFromProps = (param: HandlersProps): HanlderEnt => {
  if (Array.isArray(param[0])) {
    return { handlers: param[0] };
  }

  if ((param[0] as any)?.handlers) {
    return param as any as HanlderEnt;
  }

  return { handlers: param as Handler[] };
};

export class H11<TData extends Record<any, any> = Record<any, any>> {
  radix = new Radix();
  fsApi?: FsApi;
  ee = createEventEmitter<
    {
      code: {
        code: number;
        text: string;
      };
    } & Record<string, any>
  >();
  data: Record<string, any> = {};

  onNotFound: NotFoundHandler = defaultOnNotFound;
  onError: ErrorHandler = defaultOnError;

  private addRoute(pattern: string, method: Method, handlers: HandlersProps) {
    const handlerEnt = getHandlerEntFromProps(handlers);
    this.radix.add(pattern, method, handlerEnt);
  }

  get(pattern: string, ...handlers: Handler<TData>[]): this {
    this.addRoute(pattern, 'GET', handlers);
    return this;
  }
  post(pattern: string, ...handlers: Handler<TData>[]): this {
    this.addRoute(pattern, 'POST', handlers);
    return this;
  }

  use<TAdded extends Record<any, any>>(
    pattern: string,
    handler: DataModule<TAdded>,
  ): H11<TData & TAdded>;
  use<TAdded extends Record<any, any>>(
    handler: DataModule<TAdded>,
  ): H11<TData & TAdded>;
  use(pattern: string, ...handlers: Handler<TData>[]): this;
  use(...handlers: Handler<TData>[]): this;
  use(...args: any[]): any {
    if (typeof args[0] === 'string') {
      const [pattern, ...handlers] = args;
      this.radix.addMiddleware(pattern, handlers);
    } else {
      this.radix.addMiddleware('/', args);
    }
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
    const { params, handlers } = this.radix.find(url.pathname, req.method as any);

    const props = {
      req,
      params,
      data,
      providers,
      h11: this,
    };
    try {
      for (const handler of handlers) {
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
