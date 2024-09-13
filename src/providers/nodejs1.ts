// // import type { IncomingMessage, ServerResponse, Server } from 'node:http';
// import { Readable } from 'stream';
// // import type { H11 } from '../h11.ts';

// // const joinPaths = (elem1: string, elem2: string) => {
// //   if (elem1.at(-1) === '/') {
// //     if (elem2[0] === '/') {
// //       return `${elem1}${elem2.slice(1)}`;
// //     } else {
// //       return elem1 + elem2;
// //     }
// //   } else {
// //     if (elem2[0] === '/') {
// //       return elem1 + elem2;
// //     } else {
// //       return `${elem1}/${elem2}`;
// //     }
// //   }
// // };

// // export const getAddress = (server: Server) => {
// //   const address = server.address();
// //   if (typeof address !== 'object' || address === null) {
// //     return;
// //   }

// //   const protocol = 'http';
// //   const port = `:${address.port}`;

// //   let url: string;

// //   if (address.family === 'IPv6') {
// //     url = `[${address.address}]`;
// //   } else {
// //     url = address.address;
// //   }

// //   return `${protocol}://${url}${port}`;
// // };

// // const createReqFromNode = (req: IncomingMessage, origin: string) => {
// //   const method = req.method;
// //   const headers = new Headers(req.headers as Record<string, string>);

// //   const body =
// //     method === 'GET' || method === 'HEAD' ? null : Readable.toWeb(req);

// //   // const body =
// //   //   method === 'GET' || method === 'HEAD'
// //   //     ? null
// //   //     : (Readable.toWeb(req) as unknown as ReadableStream);

// //   // Создаем и возвращаем новый Request объект
// //   // return new Request(joinPaths(origin, req.url!), {
// //   //   method,
// //   //   headers,
// //   //   body,
// //   // });
// // };

// // // const createReqFromNode = (req: IncomingMessage, origin: string) => {
// // //   const method = req.method;
// // //   const headers = new Headers(req.headers as Record<string, string>);

// // //   const body =
// // //     method === 'GET' || method === 'HEAD'
// // //       ? null
// // //       : (Readable.toWeb(req) as any as ReadableStream);

// // //   // Создаем и возвращаем новый Request объект
// // //   return new Request(joinPaths(origin, req.url!), {
// // //     method,
// // //     headers,
// // //     body,
// // //   });
// // // };

// // // const sendNodeRes = (
// // //   responseNative: Response,
// // //   res: ServerResponse<IncomingMessage>
// // // ) => {
// // //   const headers: Record<string, string> = {};
// // //   responseNative.headers.forEach((value, key) => (headers[key] = value));

// // //   res.writeHead(responseNative.status, responseNative.statusText, headers);

// // //   if (responseNative.body) {
// // //     const resStream = Readable.fromWeb(responseNative.body as any);
// // //     resStream.pipe(res);
// // //   } else {
// // //     res.end();
// // //   }
// // // };

// // // export const nodeProviderFactory =
// // //   ({ h11 }: { h11: H11 }) =>
// // //   async ({
// // //     req,
// // //     res,
// // //     origin,
// // //   }: {
// // //     req: IncomingMessage;
// // //     res: ServerResponse<IncomingMessage>;
// // //     origin: string;
// // //   }) => {
// // //     const preapredOrigin = req.headers['host'] || origin;

// // //     const preparedRes = createReqFromNode(req, preapredOrigin);

// // //     const execRes = await h11.exec({
// // //       req: preparedRes,
// // //       data: {},
// // //       providers: {
// // //         node: {
// // //           req,
// // //           res,
// // //         },
// // //       },
// // //     });

// // //     sendNodeRes(execRes, res);
// // //   };

// export const hello = 'world';
// export const world = Readable.toWeb(null as any);
