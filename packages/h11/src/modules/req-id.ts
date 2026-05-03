import type { DataModule } from '../types.ts';

export const REQUEST_ID_HEADER = 'x-request-id';

export type ReqIdData = { reqId: string };

export const createReqIdModule = (
  header = REQUEST_ID_HEADER,
): DataModule<ReqIdData> => {
  return ({ req, data }) => {
    data.reqId = req.headers.get(header) ?? crypto.randomUUID();
  };
};
