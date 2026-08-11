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
