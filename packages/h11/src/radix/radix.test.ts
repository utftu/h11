import { describe, it, expect } from 'bun:test';
import { Radix } from './radix.ts';

const handler = async () => new Response();
const handlerEnt = { handlers: [handler] };

describe('radix', () => {
  it('add', () => {
    const radix = new Radix();

    radix.add('/hello/:name/world', 'GET', handlerEnt);

    expect(radix.root.children.length).toBe(1);
    const helloNode = radix.root.children[0];
    expect(helloNode.segment).toBe('hello');
    expect(helloNode.children.length).toBe(1);
    const nameNode = helloNode.children[0];
    expect(nameNode.segment).toBe(':name');
    expect(nameNode.children.length).toBe(1);
    const worldNode = nameNode.children[0];
    expect(worldNode.segment).toBe('world');
    expect(worldNode.children.length).toBe(0);

    radix.add('/hello/:name/world2', 'GET', handlerEnt);
    expect(nameNode.children.length).toBe(2);
    expect(nameNode.children[1].segment).toBe('world2');
  });

  it('find', () => {
    const radix = new Radix();

    radix.add('/hello/:name/world', 'GET', handlerEnt);

    const result = radix.find('/hello/aleksey/world');
    expect(result.handlers).toContain(handler);
    expect(result.params.name).toBe('aleksey');

    radix.add('/hello2/:name/:city', 'GET', handlerEnt);
    const result2 = radix.find('/hello2/aleksey/london');
    expect(result2.handlers).toContain(handler);
    expect(result2.params.name).toBe('aleksey');
    expect(result2.params.city).toBe('london');

    const result3 = radix.find('/sdsdsdsdsds');
    expect(result3.handlers.length).toBe(0);
  });

  it('find wild', () => {
    const radix = new Radix();

    radix.add('/hello/world/:name', 'GET', handlerEnt);
    radix.add('/hello/**', 'GET', handlerEnt);

    let result = radix.find('/hello/world/', 'GET');
    expect(result.handlers).toContain(handler);

    result = radix.find('/hello/world/aleksey', 'GET');
    expect(result.handlers).toContain(handler);
    expect(result.params.name).toBe('aleksey');

    result = radix.find('/hello', 'GET');
    expect(result.handlers).toContain(handler);

    const resultEmpty = radix.find('/hello123', 'GET');
    expect(resultEmpty.handlers.length).toBe(0);
  });

  it('find named and regular', () => {
    const radix = new Radix();

    const specificHandler = async () => new Response();
    radix.add('/hello/world/:name', 'GET', handlerEnt);
    radix.add('/hello/world/aleksey', 'GET', { handlers: [specificHandler] });

    const result = radix.find('/hello/world/aleksey');
    expect(result.handlers).toContain(specificHandler);
    expect(result.handlers).not.toContain(handler);
  });

  it('find named and wild', () => {
    const radix = new Radix();

    radix.add('/hello/world/**', 'GET', handlerEnt);
    const namedHandler = async () => new Response();
    radix.add('/hello/world/:name', 'GET', { handlers: [namedHandler] });

    const result = radix.find('/hello/world/aleksey');
    expect(result.handlers).toContain(namedHandler);
  });

  it('middleware on prefix', () => {
    const radix = new Radix();
    const mw = async () => undefined;

    radix.addMiddleware('/api', [mw]);
    radix.add('/api/users', 'GET', handlerEnt);

    const result = radix.find('/api/users', 'GET');
    expect(result.handlers[0]).toBe(mw);
    expect(result.handlers[1]).toBe(handler);
  });

  it('wild params', () => {
    const radix = new Radix();
    radix.add('/files/**', 'GET', handlerEnt);

    const result = radix.find('/files/a/b/c', 'GET');
    expect(result.handlers).toContain(handler);
    expect(result.params.wild).toBe('a/b/c');
  });
});
