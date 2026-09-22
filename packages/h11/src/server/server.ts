import type { Server } from 'bun';
import type { H11 } from '../core/core.ts';
import type { Upgrade, Ws, WsData, WsHandlers } from '../types.ts';

// Апгрейд уже случился — Bun ждёт от fetch undefined, а не ответ. Но хендлеру
// надо что-то вернуть, иначе ядро посчитает его отказавшимся и передаст ход
// дальше по цепочке. Поэтому договорённость: upgrade отдаёт ответ со статусом
// 101, а fetch ниже переводит его в undefined. Обе стороны договорённости
// лежат в этом файле, наружу она не течёт.
const upgradedStatus = 101;

// Таблица для Bun.serve. Состояния у неё нет: коллбеки конкретного соединения
// положил upgrade, и лежат они в ws.data.
const websocket = {
  open: (ws: Ws) => ws.data.handlers.open?.(ws),
  message: (ws: Ws, message: string | Buffer) =>
    ws.data.handlers.message?.(ws, message),
  close: (ws: Ws, code: number, reason: string) =>
    ws.data.handlers.close?.(ws, code, reason),
};

export const createServer = ({ h11 }: { h11: H11 }) => {
  const fetch = async (req: Request, server: Server<WsData>) => {
    // Подпротокол Bun выбирает сам, повторяя запрошенный клиентом. Если
    // задать Sec-WebSocket-Protocol ещё и тут, заголовок уедет дважды и
    // браузер закроет соединение с кодом 1002.
    const upgrade: Upgrade = (handlers: WsHandlers) => {
      const upgraded = server.upgrade(req, { data: { handlers } });

      if (!upgraded) {
        return;
      }

      return new Response(null, { status: upgradedStatus });
    };

    const res = await h11.exec({
      req,
      providers: {
        bun: {
          req,
          server,
        },
      },
      data: {},
      upgrade,
    });

    if (res.status === upgradedStatus) {
      return;
    }

    return res;
  };

  return { fetch, websocket };
};
