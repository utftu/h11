import type { Server } from 'bun';
import type { H11 } from 'h11';
export declare const createBunProvider: ({ h11 }: {
    h11: H11;
}) => (req: Request, server: Server) => Promise<Response>;
