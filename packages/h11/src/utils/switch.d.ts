import type { HandlerReturn } from '../types.ts';
export type SwitchParam = {
    check: (req: Request) => boolean | Promise<boolean>;
    handler: (req: Request) => HandlerReturn | Promise<HandlerReturn>;
};
export declare const switchFunc: (conditions: SwitchParam[], req: Request) => Promise<HandlerReturn>;
