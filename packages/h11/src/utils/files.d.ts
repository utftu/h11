type FileEnt = {
    filepath: string;
    headers: Record<string, string>;
};
export declare const getFileEnt: (filepath: string, formats: string[]) => Promise<FileEnt | undefined>;
export {};
