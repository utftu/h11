import { createHtml } from '../../h11x/html.ts';

type GetHtmlProps = {};

export const getHtml = () => {
  return createHtml({
    bodyApp: '<div>1111123452323)))0)</div>',
    title: 'about2',
    pathToJs: '/src/routes/about/about.client.ts',
  });
};
