import { createServer } from 'node:http';
import { H11 } from 'h11';
import { createNodeProvider } from 'h11-node';

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

h11.get('/**', ({ req }) => {
  return new Response(req.url);
});

const nodeProvider = createNodeProvider({ h11 });

const server = createServer((req, res) => {
  nodeProvider({
    req,
    res,
    origin: 'http://localhost:3000',
  });
});

server.listen(3000);
