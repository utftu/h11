import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, writeFile } from 'node:fs/promises';
import { getProd, loadEnvFile, getPublicEnvs } from './env.ts';

describe('loadEnvFile', () => {
  const envPath = join(tmpdir(), `h11x-env-test-${Date.now()}.env`);
  const testKeys = ['ENV_TEST_A', 'ENV_TEST_B', 'ENV_TEST_EXISTING'];
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

describe('getPublicEnvs', () => {
  const testKeys = ['PUBLIC_ONE', 'PUBLIC_TWO', 'SECRET_KEY'];
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of testKeys) {
      original[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const key of testKeys) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  });

  it('оставляет только переменные с префиксом PUBLIC_', () => {
    process.env.PUBLIC_ONE = 'one';
    process.env.PUBLIC_TWO = 'two';
    process.env.SECRET_KEY = 'should-not-leak';

    const envs = getPublicEnvs();

    expect(envs.PUBLIC_ONE).toBe('one');
    expect(envs.PUBLIC_TWO).toBe('two');
    expect(envs.SECRET_KEY).toBeUndefined();
  });

  it('не падает, если PUBLIC_-переменных нет', () => {
    delete process.env.PUBLIC_ONE;
    delete process.env.PUBLIC_TWO;

    const envs = getPublicEnvs();

    expect(envs.PUBLIC_ONE).toBeUndefined();
    expect(envs.PUBLIC_TWO).toBeUndefined();
  });
});

describe('getProd', () => {
  const withNodeEnv = (value: string | undefined, run: () => void) => {
    const before = Bun.env.NODE_ENV;
    if (value === undefined) {
      delete Bun.env.NODE_ENV;
    } else {
      Bun.env.NODE_ENV = value;
    }

    try {
      run();
    } finally {
      if (before === undefined) {
        delete Bun.env.NODE_ENV;
      } else {
        Bun.env.NODE_ENV = before;
      }
    }
  };

  it('переданное значение главнее окружения', () => {
    withNodeEnv('production', () => {
      expect(getProd(false)).toBe(false);
    });
  });

  it('читает NODE_ENV, когда не передано', () => {
    withNodeEnv('production', () => expect(getProd()).toBe(true));
    withNodeEnv('development', () => expect(getProd()).toBe(false));
  });

  it('на пустом и непонятном NODE_ENV падает, а не считает это девом', () => {
    withNodeEnv(undefined, () => expect(() => getProd()).toThrow('No mode'));
    withNodeEnv('test', () => expect(() => getProd()).toThrow('No mode'));
  });
});
