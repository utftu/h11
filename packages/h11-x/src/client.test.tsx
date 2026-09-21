import { describe, expect, it } from 'bun:test';
import { stringify } from 'regan';
import { Body, escapeJson, Head, Template } from './client.tsx';

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
});
