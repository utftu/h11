import { afterEach, describe, expect, it } from 'bun:test';
import { stringify } from 'regan';
import {
  Body,
  escapeJson,
  getEnv,
  getStorageHtml,
  Head,
  setEnvs,
  Template,
} from './client.tsx';

describe('escapeJson', () => {
  it('прячет символы, которыми можно выйти из <template>', () => {
    const json = JSON.stringify({ evil: '</template><script>x</script>' });

    expect(escapeJson(json)).not.toInclude('<');
  });

  it('оставляет json валидным и возвращает исходные символы', () => {
    const props = { text: 'a & b <b>bold</b>' };

    expect(JSON.parse(escapeJson(JSON.stringify(props)))).toEqual(props);
  });
});

describe('Template', () => {
  it('раскладывает Head и Body по местам и переносит их атрибуты', () => {
    const html = stringify(
      <Template>
        <Head>
          <title>Заголовок</title>
        </Head>
        <Body class="page">
          <div>тело</div>
        </Body>
      </Template>,
      { data: { envs: {}, props: {} } },
    );

    expect(html).toInclude('<title>Заголовок</title></head>');
    expect(html).toInclude('<body class="page">');
    expect(html).toInclude('<div>тело</div>');
  });

  it('видит Head сквозь фрагменты', () => {
    const html = stringify(
      <Template>
        <>
          <Head>
            <title>Заголовок</title>
          </Head>
          <div>тело</div>
        </>
      </Template>,
      { data: { envs: {}, props: {} } },
    );

    expect(html).toInclude('<title>Заголовок</title></head>');
    expect(html).toInclude('<div>тело</div></body>');
  });

  it('Head мимо Template падает, а не уезжает молча в body', () => {
    const render = () =>
      stringify(
        <div>
          <Head>
            <title>Заголовок</title>
          </Head>
        </div>,
        { data: { envs: {}, props: {} } },
      );

    expect(render).toThrow('Head works only as a child of Template');
  });
});

// Настоящего DOM в тестах нет, а getStorageHtml принимает окно параметром —
// поэтому подсовываем заглушку с тем же интерфейсом, что и <template>.
const makeWindow = (text: string | undefined) =>
  ({
    document: {
      getElementById: (id: string) =>
        id === 'h11x_storage_id' && text !== undefined
          ? { content: { textContent: text } }
          : null,
    },
  }) as unknown as Window;

describe('getStorageHtml', () => {
  it('читает то, что записал DataSet, включая экранированное', () => {
    const data = { envs: {}, props: { text: 'a & b </template>' } };
    const window = makeWindow(escapeJson(JSON.stringify(data)));

    expect(getStorageHtml(window)).toEqual(data);
  });

  it('без элемента бросает понятную ошибку', () => {
    expect(() => getStorageHtml(makeWindow(undefined))).toThrow(
      'No storage element',
    );
  });
});

describe('getEnv', () => {
  const name = 'PUBLIC_TEST_NAME';

  afterEach(() => {
    delete process.env[name];
    // @ts-expect-error окно в тестах подставное, его же и убираем
    delete globalThis.window;
  });

  it('на сервере читает окружение процесса', () => {
    process.env[name] = 'с сервера';

    expect(getEnv(name)).toBe('с сервера');
  });

  it('на сервере без переменной отдаёт undefined', () => {
    expect(getEnv(name)).toBeUndefined();
  });

  it('в браузере читает то, что сервер положил в разметку', () => {
    const data = { envs: { [name]: 'из разметки' }, props: {} };
    // @ts-expect-error подставное окно с тем же интерфейсом, что <template>
    globalThis.window = makeWindow(escapeJson(JSON.stringify(data)));

    expect(getEnv(name)).toBe('из разметки');
    // Прочитанное осело в store, а не перечитывается из разметки каждый раз.
    expect(window.h11x?.envs).toEqual(data.envs);
  });

  it('в браузере читает store, а не разметку', () => {
    // @ts-expect-error подставное окно
    globalThis.window = makeWindow(undefined);
    setEnvs({ [name]: 'из store' });

    // Разметки в этом окне нет вовсе — значит значение пришло из store.
    expect(getEnv(name)).toBe('из store');
  });

  it('store переживает чужие поля в window.h11x', () => {
    // @ts-expect-error подставное окно
    globalThis.window = makeWindow(undefined);
    window.h11x = { envs: {}, mine: 1 } as any;
    setEnvs({ [name]: 'новое' });

    expect((window.h11x as any).mine).toBe(1);
    expect(getEnv(name)).toBe('новое');
  });

  it('имя без префикса PUBLIC_ роняет вызов на обоих концах', () => {
    expect(() => getEnv('SECRET')).toThrow('getEnv reads only PUBLIC_');
  });
});

describe('Template', () => {
  it('props уезжают на <html> — там нужны lang и dir', async () => {
    const html = await stringify(
      <Template lang="ru" dir="rtl">
        <div>текст</div>
      </Template>,
      { data: { envs: {}, props: {} } },
    );

    expect(html).toContain('<html lang="ru" dir="rtl">');
    // Дети остались детьми, а не атрибутами.
    expect(html).toContain('<div>текст</div>');
  });
});
