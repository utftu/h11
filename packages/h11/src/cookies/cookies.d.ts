export type CookieOptions = {
    maxAge?: number;
    expires?: Date;
    path?: string;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
};
export declare const parseCookies: (req: Request) => Record<string, string>;
export declare const getCookie: (req: Request, name: string) => string | undefined;
export declare const serializeCookie: (name: string, value: string, options?: CookieOptions) => string;
export declare const setCookie: (res: Response, name: string, value: string, options?: CookieOptions) => void;
export declare const deleteCookie: (res: Response, name: string, options?: Pick<CookieOptions, "path" | "domain">) => void;
