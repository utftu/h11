import type { DataModule } from '../types.ts';
export declare const REQUEST_ID_HEADER = "x-request-id";
export type ReqIdData = {
    reqId: string;
};
export declare const createReqIdModule: (header?: string) => DataModule<ReqIdData>;
