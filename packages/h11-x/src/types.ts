export type SsrRoute = {
  type: 'ssr';
  dir: string;
  pathname: string;
};

export type SsgRoute = {
  type: 'ssg';
  dir: string;
  name: string;
};

export type Route = SsrRoute | SsgRoute;

export type GetHtml = (props: { req: Request }) => Promise<string>;
export type GetHtmlSsg = (props: { pathname: string }) => Promise<string>;

// export type Page = {
//   pathname: string;
//   html: string;
// };
