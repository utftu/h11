import type { Handler, Method } from '../types.ts';
export declare class Node {
    segment: string;
    handlers: Partial<Record<Method, Handler[]>>;
    wilds: Partial<Record<Method, Handler[]>>;
    middlewares: Handler[];
    staticChildren: Map<string, Node>;
    paramChild?: Node;
    parent?: Node;
    constructor({ segment, parent }: {
        segment: string;
        parent?: Node;
    });
}
