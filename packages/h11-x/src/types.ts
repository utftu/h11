import type { UserConfig } from 'vite';

export type Route = {
  dir: string;
  name: string;
};

export type GetHtmlSsg = (props: { pathname: string }) => Promise<string>;

export type EditViteConfig = (
  stage: 'ssr_server' | 'ssr_client',
  config: UserConfig
) => UserConfig;
