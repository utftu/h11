import { describe, expect, it } from 'bun:test';
import { escapeJson } from './components.tsx';

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
