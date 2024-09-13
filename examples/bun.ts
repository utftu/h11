import { H11 } from '../src/h11.ts';
import { bunProviderFactory } from '../src/providers/bun.ts';

const h11 = new H11();

h11.get('/hello/world/sasha', () => {
  return new Response(`it is a super path`);
});

h11.get('/hello/world/:name', ({ params }) => {
  return new Response(`hello world mister ${params.name}`);
});

h11.get('/hello/**', ({ params }) => {
  return new Response(`it is a wild path ${params.wild}`);
});

const bunProvider = bunProviderFactory({ h11 });

// const server = Bun.serve({
//   // hostname: 'hello.world',
//   unix: '\0benchmark-h11-bun',
//   // port: '443',
//   async fetch(req, server) {
//     console.log('-----', 'req.url', req.url);
//     // console.log('-----', 'args', args);
//     // req.body.
//     const res = await bunProvider(req, server);
//     return res;
//   },
// });

// console.log('-----', 'server', server.url);

Bun.serve({
  unix: '/tmp/my-socket.sock', // abstract namespace socket
  fetch(req) {
    return new Response(`404!`);
  },
});
