import type { IncomingMessage, ServerResponse } from 'node:http';
import { convertReqToNodeReq } from './req.ts';
import { Readable } from 'node:stream';
import { convertNodeResToRes, createNodeRes } from './res.ts';
import { createControlledPromise } from 'utftu';
import { copyReq, type Handler } from 'h11';

const deletePrefix = (url: string, prefix: string) => {
  const parsedUrl = new URL(url);
  parsedUrl.pathname = parsedUrl.pathname.slice(prefix.length);
  return parsedUrl.toString();
};

const makePath = (url: string) => {
  const parsedUrl = new URL(url);
  return parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
};

type ConnectMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (err: any | void) => void
) => void | Promise<void>;

export const createConnectAdapter = ({
  connectMiddleware,
  prefixToRemove,
}: {
  connectMiddleware: ConnectMiddleware;
  prefixToRemove?: string;
}): Handler => {
  return async (ctx) => {
    // req
    const nodeReq = convertReqToNodeReq({
      req: ctx.req,
      url: makePath(
        prefixToRemove ? deletePrefix(ctx.req.url, prefixToRemove) : ctx.req.url
      ),
    });

    let newBody;
    if (ctx.req.body) {
      const [stream1, stream2] = ctx.req.body.tee();
      newBody = stream1;

      Readable.fromWeb(stream2 as any).pipe(nodeReq);
    }

    const newRequest = copyReq(ctx.req, newBody);
    ctx.req = newRequest;

    // res
    const nodeRes = createNodeRes();

    const promiseEnt = createControlledPromise();

    // nodeRes.on('data', (chunk) => {
    //   console.log('data', chunk);
    // });

    // nodeRes.once('data', () => {
    //   promiseEnt.controls.resolve();
    // });

    nodeRes.once('finish', () => {
      promiseEnt.controls.resolve();
    });

    nodeRes.once('error', (error) => {
      promiseEnt.controls.reject(error);
    });

    let goNext = false;
    await connectMiddleware(
      nodeReq,
      nodeRes as any as ServerResponse<IncomingMessage>,
      (err) => {
        if (err) {
          promiseEnt.controls.reject(err);
          return;
        }
        goNext = true;
        promiseEnt.controls.resolve();
      }
    );

    await Promise.race([promiseEnt.promise, nodeRes.promiseEnt.promise]);

    if (goNext) {
      return;
    }

    // res
    const res = convertNodeResToRes(nodeRes);
    return res;
  };
};
