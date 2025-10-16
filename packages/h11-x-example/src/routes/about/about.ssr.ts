import { stringify, h } from 'regan';
import { About } from './about.tsx';
import { ErrorLogger } from 'regan';

export const getHtml = () => {
  try {
    const about = h(About, { text: 1 }, []);
    const logger = h(ErrorLogger, { enabled: true }, [about]);
    const a = stringify(logger);
    return a;
  } catch (e) {}
};
