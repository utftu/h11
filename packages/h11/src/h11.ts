import { H11, REQUEST_ID_HEADER } from './core/core.ts';
import { Radix, Node, type FindResult } from './core/radix/radix.ts';
import {
  defaultOnError,
  defaultOnNotFound,
  type ErrorHandler,
  type NotFoundHandler,
} from './core/errors.ts';
import {
  createSizeLimitModule,
  BodyTooLargeError,
  SIZE_1b,
  SIZE_1kb,
  SIZE_1mb,
} from './modules/size-limit/size-limit.ts';
import { proxyReq } from './modules/proxy/proxy.ts';
import type {
  Handler,
  HandlerResponse,
  HandlerReturn,
  Context,
  Method,
  Upgrade,
  Ws,
  WsData,
  WsHandlers,
} from './types.ts';
import {
  createDataModule,
  type DataModule,
} from './data-module/data-module.ts';
import { joinUserPath, joinPath } from './utils/join/join.ts';
import { copyReq } from './utils/req/req.ts';
import { type SwitchParam, switchFunc } from './utils/switch/switch.ts';
import {
  getMime,
  getMimeHeaders,
  getInit,
  type Mime,
  type InitProps,
} from './utils/content-type/content-type.ts';
import {
  parseCookies,
  getCookie,
  serializeCookie,
  setCookie,
  deleteCookie,
  type CookieOptions,
} from './cookies/cookies.ts';
import { serveFiles, getFileEnt } from './static/static.ts';
import { createServer } from './server/server.ts';
import { createConnectAdapter } from './connect/connect.ts';
import { compressRecursive } from './compress/compress.ts';

export {
  H11,
  REQUEST_ID_HEADER,
  Radix,
  Node,
  type FindResult,
  defaultOnError,
  defaultOnNotFound,
  type ErrorHandler,
  type NotFoundHandler,
  createSizeLimitModule,
  BodyTooLargeError,
  SIZE_1b,
  SIZE_1kb,
  SIZE_1mb,
  proxyReq,
  type Handler,
  type HandlerResponse,
  type HandlerReturn,
  type Context,
  type Method,
  type Upgrade,
  type Ws,
  type WsData,
  type WsHandlers,
  createDataModule,
  type DataModule,
  joinUserPath,
  joinPath,
  copyReq,
  switchFunc,
  type SwitchParam,
  getMime,
  getMimeHeaders,
  getInit,
  type Mime,
  type InitProps,
  parseCookies,
  getCookie,
  serializeCookie,
  setCookie,
  deleteCookie,
  type CookieOptions,
  serveFiles,
  getFileEnt,
  createServer,
  createConnectAdapter,
  compressRecursive,
};
