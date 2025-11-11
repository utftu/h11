import { h, stringify } from 'regan';
import { About } from './about.tsx';

export const getPages = () => {
  return [
    {
      pathname: 'about1',
      getHtml: () => {
        const a = stringify(h(About, { text: 1 }, []));
        return a;
      },
    },
    {
      pathname: 'a/about1',
      getHtml: () => {
        const a = stringify(h(About, { text: 1 }, []));
        return a;
      },
    },
    // {
    //   pathname: '/about2',
    //   html: createHtml({
    //     bodyApp: '<div>about2</div>',
    //     title: 'about2',
    //     pathToJs: '/src/routes/about/about.client.ts',
    //   }),
    // },
  ];
};
