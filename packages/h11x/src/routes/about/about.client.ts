import { hydrate, h } from 'regan';
import { About } from './about.tsx';

hydrate(document.getElementById('app')!, h(About, {}, []));
