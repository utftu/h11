import { getPages } from './.h11x/ssg/about.js';

const { getHtml } = getPages()[0];

const html = getHtml();
console.log('-----', 'html', html);

// console.log('-----', 'getPages', getPages());
