import {
  buildH11X,
  makeRouteUniversal,
  defaultPrefix,
  defaultDevPrefix,
} from './build/build.ts';
import { makeSsr, renderSsr, createPage } from './ssr.tsx';
import { makeSsg } from './ssg/ssg.ts';
import { getAssets, readConfig } from './assets/assets.ts';
import { createApp, type App } from './app/app.ts';
import type {
  ConfigH11X,
  Route,
  RouteAsset,
  RouteClient,
  RouteClientOut,
  RouteConfig,
  RoutePage,
  RouteServer,
  SsgPage,
  SsgPages,
  EditViteConfig,
  EditViteConfigProps,
} from './types.ts';

export {
  createApp,
  buildH11X,
  makeRouteUniversal,
  makeSsr,
  makeSsg,
  renderSsr,
  createPage,
  readConfig,
  getAssets,
  defaultPrefix,
  defaultDevPrefix,
};

export type {
  App,
  ConfigH11X,
  Route,
  RouteAsset,
  RouteClient,
  RouteClientOut,
  RouteConfig,
  RoutePage,
  RouteServer,
  SsgPage,
  SsgPages,
  EditViteConfig,
  EditViteConfigProps,
};
