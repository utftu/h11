import { parseEnv } from 'node:util';
import { getFsApi } from 'h11-fs';
import { convertStreamToString } from './utils.ts';

export const loadEnvFile = async (path?: string) => {
  const fsApi = await getFsApi();
  const envPath = path || `${process.cwd()}/.env`;

  const exists = await fsApi.checkExist(envPath);
  if (!exists) return;

  const text = await convertStreamToString(fsApi.getFileStream(envPath));
  const parsed = parseEnv(text);

  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};
