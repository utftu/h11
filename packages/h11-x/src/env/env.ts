import { parseEnv } from 'node:util';

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

const PUBLIC_PREFIX = 'PUBLIC_';

export const getPublicEnvs = (): Record<string, string> => {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(PUBLIC_PREFIX) && value !== undefined) {
      result[key] = value;
    }
  }

  return result;
};
