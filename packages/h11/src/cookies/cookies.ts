export type CookieOptions = {
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
};

export const parseCookies = (req: Request): Record<string, string> => {
  const header = req.headers.get('cookie');
  if (!header) return {};

  const cookies: Record<string, string> = {};

  for (const pair of header.split(';')) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) continue;

    const key = pair.slice(0, eqIndex).trim();
    const value = pair.slice(eqIndex + 1).trim();
    if (!key) continue;

    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }

  return cookies;
};

export const getCookie = (req: Request, name: string): string | undefined => {
  return parseCookies(req)[name];
};

export const serializeCookie = (
  name: string,
  value: string,
  options: CookieOptions = {},
): string => {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.trunc(options.maxAge)}`);
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }
  parts.push(`Path=${options.path ?? '/'}`);
  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }
  // SameSite=None без Secure браузеры молча отбрасывают целиком — если
  // вызывающий код явно не передал secure: false, подстраховываемся.
  const secure = options.secure ?? options.sameSite === 'None';
  if (secure) {
    parts.push('Secure');
  }
  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  return parts.join('; ');
};

export const setCookie = (
  res: Response,
  name: string,
  value: string,
  options?: CookieOptions,
): void => {
  // Set-Cookie может повторяться — append, а не set (иначе перезапишет
  // предыдущую куку вместо добавления новой).
  res.headers.append('Set-Cookie', serializeCookie(name, value, options));
};

export const deleteCookie = (
  res: Response,
  name: string,
  options?: Pick<CookieOptions, 'path' | 'domain'>,
): void => {
  setCookie(res, name, '', { ...options, maxAge: 0, expires: new Date(0) });
};
