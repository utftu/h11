import { Radix } from './radix/radix.ts';
import type { Handler, Method, Upgrade } from '../types.ts';
import type { DataModule } from '../data-module/data-module.ts';
import { createEventEmitter } from 'utftu';
import {
  defaultOnError,
  defaultOnNotFound,
  type ErrorHandler,
  type NotFoundHandler,
} from './errors.ts';

export const REQUEST_ID_HEADER = 'x-request-id';

export class H11<TData extends Record<any, any> = {}> {
  radix = new Radix();
  ee = createEventEmitter<
    {
      // text безопасно отдать наружу, error есть только у пятисотых и нужен
      // для логов: в нём стек.
      code: {
        code: number;
        text: string;
        error?: Error;
      };
    } & Record<string, any>
  >();
  onNotFound: NotFoundHandler = defaultOnNotFound;
  onError: ErrorHandler = defaultOnError;

  private addRoute(
    pattern: string,
    method: Method,
    handlers: Handler<TData>[],
  ) {
    this.radix.add(pattern, method, handlers as Handler[]);
  }

  get(pattern: string, ...handlers: Handler<TData>[]): this {
    this.addRoute(pattern, 'GET', handlers);
    return this;
  }

  post(pattern: string, ...handlers: Handler<TData>[]): this {
    this.addRoute(pattern, 'POST', handlers);
    return this;
  }

  put(pattern: string, ...handlers: Handler<TData>[]): this {
    this.addRoute(pattern, 'PUT', handlers);
    return this;
  }

  delete(pattern: string, ...handlers: Handler<TData>[]): this {
    this.addRoute(pattern, 'DELETE', handlers);
    return this;
  }

  patch(pattern: string, ...handlers: Handler<TData>[]): this {
    this.addRoute(pattern, 'PATCH', handlers);
    return this;
  }

  head(pattern: string, ...handlers: Handler<TData>[]): this {
    this.addRoute(pattern, 'HEAD', handlers);
    return this;
  }

  options(pattern: string, ...handlers: Handler<TData>[]): this {
    this.addRoute(pattern, 'OPTIONS', handlers);
    return this;
  }

  // Модуль, помеченный createDataModule, расширяет форму ctx.data: после
  // .use(authModule) инстанс знает про data.user. Обычный хендлер под эти
  // перегрузки не подходит — у него нет обязательного маркера, — и уезжает в
  // две нижние, оставляя TData как есть.
  use<TAdded extends Record<any, any>>(
    pattern: string,
    module: DataModule<TAdded>,
  ): H11<TData & TAdded>;
  use<TAdded extends Record<any, any>>(
    module: DataModule<TAdded>,
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

  // upgrade приходит от провайдера: апгрейд делает сам сервер, ядро о нём
  // ничего не знает и своего придумать не может. Параметр обязательный —
  // зовущий говорит прямо, умеет он вебсокеты или нет.
  async exec({
    req,
    data,
    providers,
    upgrade,
  }: {
    req: Request;
    data: Record<string, string>;
    providers: Record<string, any>;
    upgrade: Upgrade;
  }): Promise<Response> {
    const url = new URL(req.url);
    const { middlewares, matches } = this.radix.find(
      url.pathname,
      req.method as Method,
    );
    const reqId = req.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();

    // Параметры тут — от самого точного варианта, того, что пойдёт первым.
    // Своего набора у миддлварей нет: они подошли по пути, а не по маршруту,
    // и на момент их выполнения ещё неизвестно, кто в итоге ответит.
    const props = {
      req,
      params: matches[0]?.params ?? {},
      data,
      providers,
      h11: this,
      reqId,
      upgrade,
    };

    try {
      // Миддлвари проходят ровно один раз на весь запрос, до вариантов.
      // Если гонять их внутри каждого варианта, миддлварь, прочитавшая тело
      // запроса, на втором круге получила бы уже вычерпанный поток.
      // Вернула Response — на этом всё, до маршрутов дело не доходит.
      for (const middleware of middlewares) {
        const response = await middleware(props);
        if (response) {
          return response;
        }
      }

      // Варианты уже отсортированы по приоритету: точный путь,
      // параметрический, затем "/**" от глубокого к общему. Вариант, все
      // хендлеры которого вернули undefined, считается отказавшимся, и ход
      // переходит следующему — так статика может «пропустить» запрос
      // параметрическому маршруту, а тот дальше wildcard'у.
      for (const match of matches) {
        // У каждого варианта свои параметры: для "/users/new" точный путь не
        // даёт ничего, ":id" даёт {id: 'new'}, "/**" — {wild: 'new'}.
        const matchProps = { ...props, params: match.params };

        for (const handler of match.handlers) {
          const response = await handler(matchProps);
          if (response) {
            return response;
          }
        }
      }

      // Ни один вариант не ответил — либо их и не было, либо все отказались.
      return this.onNotFound(props);
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      return this.onError({ ...props, error: error as Error });
    }
  }
}
