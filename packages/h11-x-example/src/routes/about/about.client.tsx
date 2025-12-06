import { hydrate } from 'regan/jsx-runtime';
import './about.tsx';
import { About } from './about.tsx';
import { getStorageHtml } from 'h11-x/client';

hydrate(document, <About />, {
  data: getStorageHtml(),
  window,
});
