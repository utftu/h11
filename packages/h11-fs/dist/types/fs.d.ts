import type { FsApi } from 'h11';
export declare function getRuntime(): "unknown" | "bun" | "node" | "deno" | "vercel-edge" | "cloudflare-worker" | "aws-lambda" | "netlify" | "browser" | "service-worker";
export declare const getFsApi: () => Promise<FsApi>;
export declare const fsApi: FsApi;
