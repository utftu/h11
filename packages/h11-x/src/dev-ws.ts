import { createServer as createHttp } from 'node:http';
import type { Handler, Ws } from 'h11';

// Дальняя половина оборвалась — рвём и клиентскую, без рукопожатия. Вежливое
// close() тут ждёт ответного кадра, а ответить некому: сокет, из-за которого
// всё началось, уже мёртв. Bun такое соединение продолжает считать живым, и
// server.stop() не дожидается его никогда. Клиент vite на обрыв отвечает
// переподключением, так что терять нечего.
const closeClient = (ws: Ws) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.terminate();
  }
};

const closeTarget = (ws: WebSocket | undefined) => {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.close();
  }
};

// В middleware-режиме vite поднимает свой ws-сервер на 24678 и зашивает этот
// порт в клиента: браузер идёт мимо нашего origin, а за обратным прокси и
// https не доходит вовсе — порт наружу не проброшен, а ws:// со страницы по
// https браузер блокирует.
//
// Если дать vite любой свой сервер, зашитый порт становится null, и клиент
// соединяется туда же, откуда взял страницу: тот же хост, тот же порт, тот же
// протокол. Слушает этот сервер только 127.0.0.1 — наружу рукопожатие выдаёт
// h11, а сюда ходим мы сами. Рукопожатие по протоколу vite делает он же,
// поэтому реализовывать его нам не нужно.
export const createWsHost = async () => {
  const server = createHttp();

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  const address = server.address();
  const port =
    typeof address === 'object' && address !== null ? address.port : 0;

  return { server, port };
};

// Два сокета, склеенных замыканием: браузер говорит с нами, мы — с vite.
// Апгрейд «на другой адрес» невозможен, поэтому соединений именно два.
//
// Vite видит локального клиента с 127.0.0.1, поэтому не спрашивает ни
// allowedHosts, ни токен по Origin — проверки, которые иначе пришлось бы
// обходить руками.
export const createWsProxy = (port: number): Handler => {
  return ({ req, upgrade }) => {
    const url = new URL(req.url);
    // Путь и query уходят как есть: по пути vite узнаёт свой hmr-адрес (это
    // base со слэшем на конце), а в query лежит токен соединения.
    const target = `ws://127.0.0.1:${port}${url.pathname}${url.search}`;
    // Подпротокол повторяем: vite отвечает только на vite-hmr и vite-ping.
    const protocol = req.headers.get('sec-websocket-protocol') ?? undefined;

    let toVite: WebSocket | undefined;
    // Браузер успевает прислать сообщение раньше, чем откроется сокет к vite:
    // соединение с ним начинается только после удачного апгрейда.
    const queue: (string | Buffer)[] = [];

    // Запрос без апгрейда сюда тоже приходит — upgrade вернёт undefined, и
    // хендлер отдаст ход дальше, connect-адаптеру с http-мидлварями vite.
    return upgrade({
      open: (ws) => {
        toVite =
          protocol === undefined
            ? new WebSocket(target)
            : new WebSocket(target, protocol);
        toVite.binaryType = 'arraybuffer';

        toVite.onopen = () => {
          for (const message of queue) {
            toVite?.send(message);
          }
          queue.length = 0;
        };
        toVite.onmessage = (event) => ws.send(event.data);
        // Vite перезапустился или упал — клиентскую половину тоже рвём, иначе
        // браузер будет ждать событий от мёртвого канала.
        toVite.onclose = () => closeClient(ws);
        toVite.onerror = () => closeClient(ws);
      },
      message: (_, message) => {
        if (toVite?.readyState === WebSocket.OPEN) {
          toVite.send(message);
          return;
        }

        queue.push(message);
      },
      close: () => closeTarget(toVite),
    });
  };
};
