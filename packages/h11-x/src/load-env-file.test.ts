import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, writeFile } from 'node:fs/promises';
import { loadEnvFile } from './load-env-file.ts';

const envPath = join(tmpdir(), `h11x-env-test-${Date.now()}.env`);
const testKeys = ['ENV_TEST_A', 'ENV_TEST_B', 'ENV_TEST_EXISTING'];

describe('loadEnvFile', () => {
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of testKeys) {
      original[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(async () => {
    for (const key of testKeys) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
    await rm(envPath, { force: true });
  });

  it('загружает переменные из файла в process.env', async () => {
    await writeFile(envPath, 'ENV_TEST_A=1\nENV_TEST_B="hello world"\n');

    await loadEnvFile(envPath);

    expect(process.env.ENV_TEST_A).toBe('1');
    expect(process.env.ENV_TEST_B).toBe('hello world');
  });

  it('не перезаписывает уже выставленные переменные', async () => {
    process.env.ENV_TEST_EXISTING = 'from-shell';
    await writeFile(envPath, 'ENV_TEST_EXISTING=from-env-file\n');

    await loadEnvFile(envPath);

    expect(process.env.ENV_TEST_EXISTING).toBe('from-shell');
  });

  it('ничего не делает, если файла нет', async () => {
    await rm(envPath, { force: true });

    await expect(loadEnvFile(envPath)).resolves.toBeUndefined();
    expect(process.env.ENV_TEST_A).toBeUndefined();
  });
});
