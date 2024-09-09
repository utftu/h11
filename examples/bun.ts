import { H11 } from '../src/h11.ts';

const h4 = new H11();

h4.get('/hello/world/sasha', () => {
  return new Response(`it is a super path`);
});

h4.get('/hello/world/:name', ({ params }) => {
  return new Response(`hello world mister ${params.name}`);
});

h4.get('/hello/**', ({ params }) => {
  return new Response(`it is a wild path ${params.wild}`);
});

Bun.serve({
  fetch(req) {
    return h4.exec(req);
  },
});
