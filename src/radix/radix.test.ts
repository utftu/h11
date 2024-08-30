import { describe, it, expect } from 'bun:test';
import { Radix } from './radix.ts';

const handlerContainer = {
  handler: async () => new Response(),
  plugins: [],
};

describe('radix', () => {
  it('add', () => {
    const radix = new Radix();

    const node = radix.add('/hello/:name/world', 'GET', handlerContainer);
    // node.handlers.push(handler);

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
    expect(node).toBe(worldNode);

    radix.add('/hello/:name/world2', 'GET', handlerContainer);
    expect(nameNode.children.length).toBe(2);
    const world2Node = nameNode.children[1];
    expect(world2Node.segment).toBe('world2');
    expect(world2Node.children.length).toBe(0);
  });
  it('find', () => {
    const radix = new Radix();

    const worldNode = radix.add('/hello/:name/world', 'GET', handlerContainer);

    const findResult = radix.find('/hello/aleksey/world');
    expect(findResult).not.toBe(null);

    expect(findResult!.node).toBe(worldNode);
    expect(findResult!.params.name).toBe('aleksey');

    const cityNode = radix.add('/hello2/:name/:city', 'GET', handlerContainer);
    const findResult2 = radix.find('/hello2/aleksey/london');

    expect(findResult2).not.toBe(null);

    expect(findResult2!.node).toBe(cityNode);
    expect(findResult2!.params.name).toBe('aleksey');
    expect(findResult2!.params.city).toBe('london');

    const findResult3 = radix.find('/sdsdsdsdsds');

    expect(findResult3).toBe(null);
  });
  it('find wild', () => {
    const radix = new Radix();

    radix.add('/hello/world/:name', 'GET', handlerContainer);
    radix.add('/hello/**', 'GET', handlerContainer);

    let result = radix.find('/hello/world/', 'GET')!;
    expect(result.node.segment).toBe('**');
    result = radix.find('/hello/world/aleksey', 'GET')!;
    expect(result.node.segment[0]).toBe(':');
    result = radix.find('/hello', 'GET')!;
    expect(result.node.segment).toBe('**');
    const resultNull = radix.find('/hello123', 'GET');
    expect(resultNull).toBe(null);
  });
  it('find named and regular', () => {
    const radix = new Radix();

    radix.add('/hello/world/:name', 'GET', handlerContainer);
    radix.add('/hello/world/aleksey', 'GET', handlerContainer);

    let result = radix.find('/hello/world/aleksey')!;

    expect(result.node.segment).toBe('aleksey');
  });
  it('find named and wild', () => {
    const radix = new Radix();

    radix.add('/hello/world/**', 'GET', handlerContainer);
    radix.add('/hello/world/:name', 'GET', handlerContainer);

    let result = radix.find('/hello/world/aleksey')!;

    expect(result.node.segment).toBe(':name');
  });
});
