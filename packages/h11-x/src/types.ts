import type { UserConfig } from 'vite';

export type Route = {
  dir: string;
  name: string;
};

// Страница ssg: путь и её разметка. html может быть промисом — тогда ssg
// дождётся его, как и всего списка, если промисом отдан он сам.
export type SsgPage = {
  pathname: string;
  html: string | Promise<string>;
};

export type SsgPages = SsgPage[] | Promise<SsgPage[]>;

// Хук правки vite-конфига. Оси независимые: режим роута (ssr или ssg) и что
// сейчас собирается (серверный модуль или клиентский бандл). Роут передаётся
// целиком, чтобы можно было настроить конкретный, а не все сразу.
export type EditViteConfigProps = {
  mode: 'ssr' | 'ssg';
  target: 'server' | 'client';
  route: Route;
};

export type EditViteConfig = (
  props: EditViteConfigProps,
  config: UserConfig,
) => UserConfig;

// Файл ассета и его исходное имя до хеширования: по исходному имени страница
// находит нужный файл, потому что хеш меняется от сборки к сборке.
export type RouteAsset = {
  src: string;
  file: string;
};

// Всё, что vite выдал для клиентской сборки роута. Пути — относительно корня
// ассетов, URL из них собирается префиксом (getAssets).
export type RouteClientOut = {
  js: string[];
  chunks: string[];
  css: string[];
  assets: RouteAsset[];
};

export type RouteClient = {
  src: string;
  out: RouteClientOut;
};

// У сервера out — один собранный модуль, его импортирует renderSsr (ssr) или
// сборка страниц (ssg), поэтому путь абсолютный, а не относительно ассетов.
export type RouteServer = {
  src: string;
  out: string;
};

export type RoutePage = {
  pathname: string;
  file: string;
};

export type RouteConfig =
  | { mode: 'ssr'; client: RouteClient; server: RouteServer }
  | {
      mode: 'ssg';
      client: RouteClient;
      server: RouteServer;
      pages: RoutePage[];
    };

export type ConfigH11X = {
  prod: boolean;
  prefix: string;
  devPrefix: string;
  routes: Record<string, RouteConfig>;
};
