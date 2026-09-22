import { describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { buildH11X } from './build.ts';
import type { EditViteConfigProps } from './types.ts';

describe('editViteConfig', () => {
  it('получает режим роута, цель сборки и сам роут', async () => {
    const root = await mkdtemp(`${tmpdir()}/h11x-hook-`);
    const dir = `${root}/about`;
    await mkdir(dir, { recursive: true });
    await writeFile(
      `${dir}/about.ssr.tsx`,
      `export const pages = [];\nexport const page = () => '';\n`,
    );
    await writeFile(`${dir}/about.client.tsx`, `export const client = 1;\n`);

    const calls: EditViteConfigProps[] = [];

    await buildH11X({
      baseDir: `${root}/.h11x`,
      routes: [dir],
      prod: true,
      editViteConfig: (props, config) => {
        calls.push(props);
        return config;
      },
    });

    expect(calls).toEqual([
      { mode: 'ssr', target: 'server', route: { dir, name: 'about' } },
      { mode: 'ssr', target: 'client', route: { dir, name: 'about' } },
    ]);

    await rm(root, { recursive: true, force: true });
  });
});
