export type Route = {
    dir: string;
    name: string;
};
export type GetHtml = (props: {
    req: Request;
}) => Promise<string>;
export type GetHtmlSsg = (props: {
    pathname: string;
}) => Promise<string>;
