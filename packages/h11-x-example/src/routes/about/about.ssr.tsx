import { stringify, h } from 'regan';
import { About } from './about.tsx';

// const createPage = () => {
//   return;
// };

export const getHtml = () => {
  const str = stringify(<About />, {
    data: { envs: {}, props: { hello: 'world' } },
  });
  return str;
};
