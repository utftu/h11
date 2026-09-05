import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Handler } from '../../../../types.ts';
type ConnectMiddleware = (req: IncomingMessage, res: ServerResponse, next: (err: any | void) => void) => void | Promise<void>;
export declare const createConnectAdapter: ({ connectMiddleware, prefixToRemove, }: {
    connectMiddleware: ConnectMiddleware;
    prefixToRemove?: string;
}) => Handler;
export {};
