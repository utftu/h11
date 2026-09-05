import type { Handler, Method } from '../types.ts';
import { Node } from './node.ts';
type Params = Record<string, string>;
export type FindResult = {
    params: Params;
    handlers: Handler[];
};
export declare class Radix {
    root: Node;
    find(path: string, method?: Method): FindResult;
    private findOrCreateNode;
    add(pattern: string, method: Method | undefined, handlers: Handler[]): Node;
    addMiddleware(pattern: string, handlers: Handler[]): void;
}
export {};
