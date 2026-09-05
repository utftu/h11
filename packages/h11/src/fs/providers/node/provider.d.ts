import type { H11 } from '../../../core.ts';
import type { IncomingMessage, ServerResponse } from 'node:http';
export declare const createNodeProvider: ({ h11 }: {
    h11: H11;
}) => ({ req, res, origin, }: {
    req: IncomingMessage;
    res: ServerResponse<IncomingMessage>;
    origin: string;
}) => Promise<void>;
