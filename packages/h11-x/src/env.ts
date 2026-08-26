import { parseEnv } from 'node:util';
import { getFsApi } from 'h11';
import { convertStreamToString } from './utils.ts';

export const loadEnvFile = async (path?: string) => {
  const fsApi = await getFsApi();
  const envPath = path || `${process.cwd()}/.env`;

  const exists = await fsApi.checkExist(envPath);
  if (!exists) return;

  const text = await convertStreamToString(fsApi.getFileStream(envPath));
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
