import { parseEnv } from 'node:util';
import { publicPrefix } from '../consts.ts';

// Режим либо передан явно, либо берётся из NODE_ENV — но только если там одно
// из двух понятных значений. Молчаливого «ничего не сказали, значит дев» быть
// не должно: в прод-образе это означает стереть готовую сборку и поднять
// dev-сервер, и ровно так оно один раз и случилось.
//
// Bun.env, а не process.env.NODE_ENV: второе bun build схлопывает в константу
// при сборке пакета, и в опубликованном dist оказывалось зашитое false.
export const getProd = (prod?: boolean) => {
  if (prod !== undefined) {
    return prod;
  }

  const env = Bun.env.NODE_ENV;

  if (env === 'production') {
    return true;
  }

  if (env === 'development') {
    return false;
  }

  throw new Error(
    `No mode: pass prod explicitly or set NODE_ENV to production or development (now: ${env ?? 'empty'})`,
  );
};

export const loadEnvFile = async (path?: string) => {
  const envPath = path || `${process.cwd()}/.env`;

  const file = Bun.file(envPath);
  if (!(await file.exists())) return;

  const text = await file.text();
  const parsed = parseEnv(text);

  for (const [key, value] of Object.entries(parsed)) {
    // Не перезаписываем уже выставленные снаружи переменные — окружение
    // деплоя должно иметь приоритет над файлом .env.
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

export const getPublicEnvs = (): Record<string, string> => {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(publicPrefix) && value !== undefined) {
      result[key] = value;
    }
  }

  return result;
};
