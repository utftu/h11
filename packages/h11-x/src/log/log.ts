import { getIp, type ResponseEvent } from 'h11';
import type { LogOptions } from '../types.ts';
import { pingPath, readyPath } from '../health/health.ts';

// Строка лога живёт тут, а не в h11, потому что интересна она только вместе с
// политикой «что печатать»: какие пути раздаёт статика и какой из ответов
// страница — знает h11-x, не ядро.

const checkHtml = (res: Response) => {
  const type = res.headers.get('content-type');

  if (type === null) {
    return false;
  }

  return type.startsWith('text/html');
};

export const createLogReq = ({
  prefix,
  devPrefix,
  static: showStatic = false,
  query: showQuery = false,
}: {
  prefix: string;
  devPrefix: string;
} & LogOptions) => {
  const prefixes = [`${prefix}/`, `${devPrefix}/`];
  const probes = [pingPath, readyPath];

  // Шум — это удачно отданный ассет: путь под префиксом раздачи, а в ответе
  // не страница. Ошибка на том же пути шумом не считается: пропавший или
  // упавший ассет надо видеть, иначе страница молча останется без стилей.
  const checkNoise = ({ res }: ResponseEvent, pathname: string) => {
    if (res.status >= 400) {
      return false;
    }

    // Удачная проба здоровья не несёт ничего: монитор, стучащий раз в пять
    // секунд, это 17 тысяч одинаковых строк в сутки. Отключать это нечем —
    // смотреть там не на что, а 503 печатается по правилу выше.
    if (probes.includes(pathname)) {
      return true;
    }

    if (checkHtml(res)) {
      return false;
    }

    for (const item of prefixes) {
      if (pathname.startsWith(item)) {
        return true;
      }
    }

    return false;
  };

  return (event: ResponseEvent) => {
    const { req, res, reqId, ms, error } = event;
    const { pathname, search } = new URL(req.url);

    if (!showStatic && checkNoise(event, pathname)) {
      return;
    }

    const path = showQuery ? `${pathname}${search}` : pathname;
    const ip = getIp(event) ?? '-';

    // От reqId хватает первых восьми символов, полный лежит в событии.
    console.log(
      `${req.method} ${res.status} ${path} ${ms.toFixed(1)}ms ${ip} ${reqId.slice(0, 8)}`,
    );

    // Стек — второй строкой и только когда хендлер кинул исключение: строка
    // запроса должна оставаться одной строкой.
    if (error) {
      console.log(error.stack ?? error.message);
    }
  };
};
