export type SsrRoute = {
  type: 'ssr';
  dir: string;
  pathname: string;
};

export type SsgRoute = {
  type: 'ssg';
  dir: string;
};

export type Route = SsrRoute | SsgRoute;

export type Page = {
  pathname: string;
  html: string;
};
