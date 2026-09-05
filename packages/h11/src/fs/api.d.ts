export declare function getRuntime(): "bun" | "node" | "unknown";
export declare const getFsApi: () => Promise<import("../types.ts").FsApi>;
export declare const fsApi: import("../types.ts").FsApi;
