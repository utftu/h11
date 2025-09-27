import type { IncomingMessage, ServerResponse } from 'node:http';
import { type Handler } from 'h11';
type ConnectMiddleware = (req: IncomingMessage, res: ServerResponse, next: (err: any | void) => void) => void | Promise<void>;
export declare const handleConnectMiddleware: ({ connectMiddleware, prefixToRemove, }: {
    connectMiddleware: ConnectMiddleware;
    prefixToRemove?: string;
}) => Handler;
export {};
