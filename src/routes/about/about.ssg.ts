import { createHtml } from '../../h11x/html.ts';

export const getHtmls = () => {
  return [
    {
      pathname: '/about1',
      html: createHtml({ bodyApp: '<div>about1</div>', title: 'about2' }),
    },
    {
      pathname: '/about2',
      html: createHtml({ bodyApp: '<div>about2</div>', title: 'about2' }),
    },
    // {
    //   pathname: '/about1',
    //   html: '<div>about1</div>',
    // },
    // {
    //   pathname: '/about2',
    //   html: '<div>about2</div>',
    // },
  ];
};
