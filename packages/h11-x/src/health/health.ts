import { getInit, type H11 } from 'h11';
import type { HealthChecks, HealthOptions } from '../types.ts';

// Два пути, по одному на вопрос: жив ли процесс и готов ли он обслуживать.
// Имена говорят сами за себя — поэтому не healthz: конвенцию Kubernetes с
// несловарной буквой z держат его собственные компоненты, а поды ею никто не
// опрашивает, так что объяснять имя было бы дороже, чем назвать прямо.
//
// Занять такие пути легко, поэтому регистрацию можно отключить целиком
// (health: false у createApp).
export const pingPath = '/ping';
export const readyPath = '/ready';

// Асинхронная обёртка, чтобы синхронный throw внутри проверки стал обычным
// отказом промиса и его поймал тот же .catch.
const runCheck = async (check: HealthChecks[string]) => check();

// Проверки идут параллельно: они независимы, а проба должна успеть до
// таймаута монитора. Своего таймаута у нас нет — он есть у того, кто
// опрашивает, и зависшая проверка для него такой же отказ.
const runChecks = async (checks: HealthChecks) => {
  const results = await Promise.all(
    Object.entries(checks).map(async ([name, check]) => {
      const result = await runCheck(check).catch((error: Error) => {
        // Текст ошибки уходит в stdout, а не в тело ответа: /ready открыт
        // всем, кто дошёл до приложения, а в сообщении драйвера приезжает
        // строка подключения. Печатается он и при log: false — это отказ, а
        // не трафик, и терять его нельзя.
        console.log(`ready: ${name} — ${error.message}`);
        return false;
      });

      return { name, ok: result !== false };
    }),
  );

  // Порядок — как объявлены проверки: Promise.all его сохраняет, и в теле
  // ответа имена стоят предсказуемо.
  const failed: string[] = [];
  for (const { name, ok } of results) {
    if (!ok) {
      failed.push(name);
    }
  }

  return failed;
};

// Оба метода: мониторы и балансировщики ходят и GET, и HEAD, а в h11 HEAD на
// GET-роут не попадает — у каждого метода своя таблица, и ответом был бы 404.
// Тело для HEAD отрезает сам Bun, заголовки остаются.
export const addHealth = (h11: H11, { checks = {} }: HealthOptions = {}) => {
  // ping — живость: процесс жив и отвечает, никуда не ходит. ready —
  // готовность: зависимости на месте. Без проверок готовность сводится к
  // живости, и это нормально.
  const pong = () => new Response('pong', getInit('txt'));

  // Тело одной формы в обоих случаях — json-список имён, которые не готовы.
  // Пустой список значит «всё готово», и разбирать два разных ответа на
  // стороне монитора не надо: достаточно прочитать список.
  const ready = async () => {
    const failed = await runChecks(checks);
    const status = failed.length > 0 ? 503 : 200;

    return Response.json(failed, { status });
  };

  h11.get(pingPath, pong);
  h11.head(pingPath, pong);

  h11.get(readyPath, ready);
  h11.head(readyPath, ready);
};
