// export type SsrRoute = {
//   // type: 'ssr';
//   dir: string;
//   name: string;
// };

// export type SsgRoute = {
//   // type: 'ssg';
//   dir: string;
//   name: string;
// };

export type Route = {
  dir: string;
  name: string;
};

// export type RouteAny = SsrRoute | SsgRoute;

export type GetHtml = (props: { req: Request }) => Promise<string>;
export type GetHtmlSsg = (props: { pathname: string }) => Promise<string>;

// export type Page = {
//   pathname: string;
//   html: string;
// };
