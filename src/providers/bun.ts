import type { Server } from 'bun';
import type { H11 } from '../h11.ts';
import { fsApiBun } from '../h11-bun.ts';

export const createBunProvider = ({ h11 }: { h11: H11 }) => {
  return async (req: Request, server: Server) => {
    const res = await h11.exec({
      req,
      providers: {
        bun: {
          req,
          server,
        },
      },
      data: {},
    });
    return res;
  };
};
