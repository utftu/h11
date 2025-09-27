import type { Handler } from '../types.ts';
export declare const SIZE_1b = 1;
export declare const SIZE_1kb = 1;
export declare const SIZE_1mb: number;
export declare const createRateLimiterModule: (limit: number) => Handler;
