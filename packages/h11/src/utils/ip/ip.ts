// Адрес сокета за обратным прокси всегда один и тот же — сам прокси
// (127.0.0.1 за Caddy), поэтому настоящего клиента берём из
// x-forwarded-for: первый хоп это он, дальше идут прокси.
//
// Заголовок приходит от клиента, то есть подделывается, если приложение
// доступно напрямую, а не только через прокси, который его перезаписывает.
// Для лога это терпимо, для доверия — нет: решения по этому ip принимать
// нельзя.
export const getIp = ({
  req,
  providers,
}: {
  req: Request;
  providers: Record<string, any>;
}) => {
  const forwarded = req.headers.get('x-forwarded-for');

  if (forwarded) {
    // Длину режем по максимуму ipv6: значение чужое, и в строке лога ему
    // делать нечего.
    return forwarded.split(',')[0].trim().slice(0, 45);
  }

  const address = providers.bun?.server?.requestIP(req)?.address;

  if (address === undefined) {
    return;
  }

  // Слушатель двустековый, и клиент, пришедший по ipv4, выглядит как
  // ::ffff:127.0.0.1 — тот же адрес в форме ipv6 (RFC 4291). В логе и в
  // сравнениях нужен обычный ipv4.
  if (address.startsWith('::ffff:')) {
    return address.slice('::ffff:'.length);
  }

  return address;
};
