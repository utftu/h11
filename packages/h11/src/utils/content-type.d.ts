declare const exts: {
    js: string;
    html: string;
    json: string;
    css: string;
    svg: string;
    png: string;
    ico: string;
};
export declare const getContentType: (name: keyof typeof exts) => string;
export declare const getContentTypeHeaders: (name: keyof typeof exts) => {
    'content-type': string;
};
export declare const getContentTypeConfig: (name: keyof typeof exts) => {
    headers: {
        'content-type': string;
    };
};
export {};
