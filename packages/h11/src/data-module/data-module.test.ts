import { describe, expect, it } from 'bun:test';
import { createDataModule } from './data-module.ts';
import { H11 } from '../core/core.ts';

type User = { id: string; name: string };

const authModule = createDataModule<{ user: User }>(({ data }) => {
  data.user = { id: '1', name: 'aleksey' };
});

describe('createDataModule', () => {
  it('расширяет форму data для следующих хендлеров', async () => {
    const h11 = new H11().use(authModule);

    // Типизировано: data.user виден компилятору, без any и без каста.
    h11.get('/me', ({ data }) => new Response(data.user.name));

    const res = await h11.exec({
      req: new Request('http://x/me'),
      data: {},
      providers: {},
    });

    expect(await res.text()).toBe('aleksey');
  });

  it('работает и с путём', async () => {
    const h11 = new H11().use('/api', authModule);

    h11.get('/api/me', ({ data }) => new Response(data.user.id));

    const res = await h11.exec({
      req: new Request('http://x/api/me'),
      data: {},
      providers: {},
    });

    expect(await res.text()).toBe('1');
  });

  it('обычный хендлер форму data не меняет', async () => {
    const h11 = new H11<{ traceId: string }>().use(({ data }) => {
      data.traceId = 'abc';
    });

    // Инстанс остался H11<{traceId: string}> — если бы обычный хендлер
    // проходил как модуль, тут появилось бы Record<any, any>.
    h11.get('/trace', ({ data }) => new Response(data.traceId));

    const res = await h11.exec({
      req: new Request('http://x/trace'),
      data: {},
      providers: {},
    });

    expect(await res.text()).toBe('abc');
  });
});
