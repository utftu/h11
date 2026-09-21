import { createPage } from 'h11-x';
import { Blog } from './blog.tsx';

const page = createPage(Blog);

export const pages = [
  { pathname: '/blog', html: page({}) },
  { pathname: '/blog/first', html: page({ slug: 'first' }) },
];
