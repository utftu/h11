import { createHtml } from '../../h11x/html.ts';

export const getHtmls = () => {
  return [
    {
      pathname: '/about1',
      html: createHtml({
        bodyApp: '<div>about1</div>',
        title: 'about2',
        pathToJs: '/src/routes/about/about.client.ts',
      }),
    },
    {
      pathname: '/about2',
      html: createHtml({
        bodyApp: '<div>about2</div>',
        title: 'about2',
        pathToJs: '/src/routes/about/about.client.ts',
      }),
    },
  ];
};
