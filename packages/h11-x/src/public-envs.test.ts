import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { getPublicEnvs } from './public-envs.ts';

const testKeys = ['PUBLIC_ONE', 'PUBLIC_TWO', 'SECRET_KEY'];

describe('getPublicEnvs', () => {
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
