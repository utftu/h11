import { makeSsg } from './ssg.ts';
import { makeSsr } from './ssr.ts';
type BuildProps = {
    baseDir?: string;
    routes: string[];
    prod?: boolean;
};
export declare const buildH11X: ({ baseDir, prod, routes, }: BuildProps) => Promise<void>;
export { makeSsg, makeSsr };
