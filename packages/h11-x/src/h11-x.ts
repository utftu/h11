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
import { addHealth, pingPath, readyPath } from './health/health.ts';
import { getEnv } from './client/client.tsx';
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
  HealthChecks,
  HealthOptions,
  LogOptions,
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
  addHealth,
  pingPath,
  readyPath,
  getEnv,
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
  HealthChecks,
  HealthOptions,
  LogOptions,
};
