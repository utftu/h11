import { waitTime } from 'utftu';
// import { H4 } from './h4.ts';

// const h4 = new H4();

// h4.get('/hello/world/sasha', () => {
//   return new Response(`it is a super path`);
// });

// h4.get('/hello/world/:name', ({ params }) => {
//   return new Response(`hello world mister ${params.name}`);
// });

// h4.get('/hello/**', ({ params }) => {
//   return new Response(`it is a wild path ${params.wild}`);
// });

// // hello/word/sasha

// h4.get('/test', () => {
//   const stream = new ReadableStream({
//     async start(controller) {
//       // Генерация данных
//       const encoder = new TextEncoder();
//       const data = ['<body>', 'World', 'Streamed', 'Response'];

//       for (const chunk of data) {
//         controller.enqueue(encoder.encode(chunk + '\n'));
//         await new Promise((resolve) => {
//           setTimeout(resolve, 1000);
//         });
//       }

//       controller.close();
//     },
//   });

//   const response = new Response(stream, {
//     headers: {
//       'Content-Type': 'text/plain',
//     },
//   });

//   return response;
// });

const firstPart = `
<!DOCTYPE html>
<html lang="en">
  <head>
  </head>
  <body>
    ${'<div>1111</div>'.repeat(20)}
`;
const firstPart1 = `
<!DOCTYPE html>
<html lang="en">
  <head>
  </head>
  <body>
    ${'<div>1111</div>'.repeat(100)}
`;
const secondPart = `
  <div>${'222'.repeat(1000)}</div>
  </body>
  </html>
  `;

const headers = {
  // Vary: 'RSC, Next-Router-State-Tree, Next-Router-Prefetch, Accept-Encoding',
  // link: '</_next/static/media/a34f9d1faa5f3315-s.p.woff2>; rel=preload; as="font"; crossorigin=""; type="font/woff2"',
  // 'Cache-Control': 'no-store, must-revalidate',
  // 'X-Powered-By': 'Next.js',
  'Content-Type': 'text/html; charset=utf-8',
  // 'Content-Encoding': 'gzip',
  // Date: 'Thu, 29 Aug 2024 20:52:08 GMT',
  // Connection: 'keep-alive',
  // 'Keep-Alive': 'timeout=5',
  // 'Transfer-Encoding': 'chunked',
};

console.log('-----', 'header', headers);

Bun.serve({
  fetch(req) {
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(firstPart);
        await waitTime(4000);
        controller.enqueue(secondPart);
        controller.close();
      },
    });
    return new Response(stream, {
      headers: headers,
    });
  },
});
