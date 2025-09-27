import type { HanlderEnt, Method } from '../types.ts';
import { Node } from './node.ts';
type Params = Record<string, string>;
type FindResult = {
    handlerEnt: HanlderEnt;
    params: Params;
    node: Node;
};
export declare class Radix {
    root: Node;
    find(path: string, method?: Method): FindResult | undefined;
    add(pattern: string, method: Method | undefined, handler: HanlderEnt): Node;
}
export {};
