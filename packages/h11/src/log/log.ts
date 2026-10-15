import type { ResponseEvent } from '../types.ts';
import { getIp } from '../utils/ip/ip.ts';

// Логгер — это одна функция поверх события response, а не слой с уровнями и
// транспортами. Нужен свой формат — пишется свой подписчик, этот не
// настраивается ничем.
//
// Порядок полей: что спросили, чем ответили, куда, за сколько, кому и по
// какому id искать. Статус сразу за методом — по нему строку и просматривают
// глазами, а путь бывает любой длины.
export const logReq = (event: ResponseEvent) => {
  const { req, res, reqId, ms } = event;
  const { pathname, search } = new URL(req.url);
  const ip = getIp(event) ?? '-';

  // От reqId хватает первой части uuid: столько символов уже уникальны в
  // пределах логов одного дня, а полный id лежит в самом событии.
  console.log(
    `${req.method} ${res.status} ${pathname}${search} ${ms.toFixed(1)}ms ${ip} ${reqId.slice(0, 8)}`,
  );

  // Стек — второй строкой и только когда хендлер кинул исключение: строка
  // запроса должна оставаться одной строкой.
  if (event.error) {
    console.log(event.error.stack ?? event.error.message);
  }
};
