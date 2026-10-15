import type { ServerWebSocket } from 'bun';
import type { H11 } from './core/core.ts';

export type Method =
  'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH' | 'HEAD' | 'OPTIONS';

// Коллбеки соединения. Своё состояние хендлер держит в замыкании — он же их
// и создаёт, на каждый апгрейд заново, — поэтому больше соединению ничего
// носить не нужно.
export type WsHandlers = {
  open?: (ws: Ws) => void;
  message?: (ws: Ws, message: string | Buffer) => void;
  close?: (ws: Ws, code: number, reason: string) => void;
};

export type WsData = { handlers: WsHandlers };

export type Ws = ServerWebSocket<WsData>;

export type Upgrade = (handlers: WsHandlers) => Response | undefined;

// События запроса, оба из ядра: request до обработки, response после. Два, а
// не одно: запрос, который завис или уронил процесс, в response не приедет
// никогда — видно его только в request.
//
// req, res и providers лежат сырыми: заранее ничего не выбрано, что печатать
// или считать — решает подписчик.
export type RequestEvent = {
  req: Request;
  reqId: string;
  providers: Record<string, any>;
};

// error есть только когда хендлер кинул исключение: пятисотая, отданная
// хендлером осознанно, и брошенный Response — обычные ответы.
export type ResponseEvent = RequestEvent & {
  res: Response;
  ms: number;
  error?: Error;
};

export type Context<TData extends Record<any, any> = {}> = {
  req: Request;
  h11: H11<TData>;
  providers: Record<string, any>;
  params: Record<string, string>;
  data: TData;
  reqId: string;
  upgrade: Upgrade;
};

export type HandlerResponse =
  | Promise<Response | undefined>
  | undefined
  | Promise<undefined>
  | void
  | Promise<void>
  | Response
  | Promise<Response>;

export type Handler<TData extends Record<any, any> = {}> = (
  props: Context<TData>,
) => HandlerResponse;

export type HandlerReturn = Handler | Handler[];
