import type { HanlderEnt, Method } from '../types.ts';
export declare class Node {
    segment: string;
    handlers: Partial<Record<Method, HanlderEnt>>;
    children: Node[];
    wildParent: boolean;
    parent?: Node;
    constructor({ segment, parent }: {
        segment: string;
        parent?: Node;
    });
}
export declare const addNodeToChildren: (parent: Node, node: Node) => void;
