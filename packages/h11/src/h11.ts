import { H11 } from './core.ts';
import {
  createReqIdModule,
  REQUEST_ID_HEADER,
  type ReqIdData,
} from './modules/req-id.ts';
import type { Handler, FsApi, Context, Method } from './types.ts';
import { joinUserPath, joinPath } from './utils/join.ts';
import { copyReq } from './utils/req.ts';
import { type SwitchParam, switchFunc } from './utils/switch.ts';
import {
  getContentType,
  getContentTypeHeaders,
  getContentTypeConfig,
} from './utils/content-type.ts';

export {
  H11,
  createReqIdModule,
  REQUEST_ID_HEADER,
  type ReqIdData,
  type Handler,
  type FsApi,
  type Context,
  type Method,
  joinUserPath,
  joinPath,
  copyReq,
  switchFunc,
  type SwitchParam,
  getContentType,
  getContentTypeHeaders,
  getContentTypeConfig,
};
