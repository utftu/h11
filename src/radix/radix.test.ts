import { describe, it, expect } from "bun:test";
import { Radix } from "./radix.ts";

describe("radix", () => {
  it("add", () => {
    const radix = new Radix();

    const node = radix.add("/hello/:name/world");

    expect(radix.root.children.length).toBe(1);
    const helloNode = radix.root.children[0];
    expect(helloNode.segment).toBe("hello");
    expect(helloNode.children.length).toBe(1);
    const nameNode = helloNode.children[0];
    expect(nameNode.segment).toBe(":name");
    expect(nameNode.children.length).toBe(1);
    const worldNode = nameNode.children[0];
    expect(worldNode.segment).toBe("world");
    expect(worldNode.children.length).toBe(0);
    expect(node).toBe(worldNode);

    radix.add("/hello/:name/world2");
    expect(nameNode.children.length).toBe(2);
    const world2Node = nameNode.children[1];
    expect(world2Node.segment).toBe("world2");
    expect(world2Node.children.length).toBe(0);
  });
  it("find", () => {
    const radix = new Radix();

    const worldNode = radix.add("/hello/:name/world");

    const findResult = radix.find("/hello/aleksey/world");
    expect(findResult).not.toBe(null);

    expect(findResult!.node).toBe(worldNode);
    expect(findResult!.params.name).toBe("aleksey");

    const cityNode = radix.add("/hello2/:name/:city");
    const findResult2 = radix.find("/hello2/aleksey/london");

    expect(findResult2).not.toBe(null);

    expect(findResult2!.node).toBe(cityNode);
    expect(findResult2!.params.name).toBe("aleksey");
    expect(findResult2!.params.city).toBe("london");

    const findResult3 = radix.find("/sdsdsdsdsds");

    expect(findResult3).toBe(null);
  });
});
