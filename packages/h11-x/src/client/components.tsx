import { scriptKey } from '../conts.ts';
import { Fragment, h, hydrate, type Child, type FC } from 'regan';

const storage_id = 'h11x_storage_id';

type H11XStorge = {
  envs: Record<string, string>;
  props: Record<string, any>;
};

export const createStorage = (storage: H11XStorge) => storage;

// Regan не экранирует текстовых детей, поэтому JSON уезжает в разметку как
// есть: строка "</template>" в пропсах закрыла бы шаблон, и всё после неё
// браузер разобрал бы как html. Экранируем сами — \u-последовательности
// остаются валидным JSON и парсятся обратно в исходные символы.
export const escapeJson = (json: string) => {
  return json.replaceAll('&', '\\u0026').replaceAll('<', '\\u003c');
};

export const getStorageHtml = (localWindow?: Window) => {
  const finalWindow = localWindow || window;
  const element = finalWindow.document.getElementById(
    storage_id,
  ) as HTMLTemplateElement | null;

  if (element === null) {
    throw new Error(`No storage element #${storage_id} in document`);
  }

  // Дети <template> лежат в content, а не в childNodes, поэтому textContent
  // самого элемента всегда пустой.
  const data = JSON.parse(element.content.textContent ?? '') as H11XStorge;
  return data;
};

export const hydratePage = (Component: FC<any>) => {
  hydrate(document, <Component />, { data: getStorageHtml() });
};

export const Script: FC = () => {
  return h(Fragment, {}, [scriptKey]);
};

export const DataSet: FC<{ data: Record<any, any> }> = (_, { globalCtx }) => {
  const dataStr = escapeJson(JSON.stringify(globalCtx.data));
  return <template id={storage_id}>{dataStr}</template>;
};

const h11x_head = 'h11x_head';
export const Head: FC = (props, { children }) => {
  const newChildren = [...children];
  // @ts-ignore
  newChildren[h11x_head] = props;
  return children;
};

const h11x_body = 'h11x_body';
export const Body: FC = (props, { children }) => {
  const newChildren = [...children];
  // @ts-ignore
  newChildren[h11x_body] = props;
  return children;
};

export const Template: FC<{
  data?: Record<string, any> | void;
  children?: Child;
}> = ({ data = {} }, { children }) => {
  let heads: Child[] = [];
  let headProps = {};
  let bodies: Child[] = [];
  let bodyProps = {};

  const realChildren = children.filter((child) => {
    if (Array.isArray(child) && h11x_head in child) {
      heads.push(...child);
      headProps = child[h11x_head] as any;
      return false;
    }
    if (Array.isArray(child) && h11x_body in child) {
      bodies.push(...child);
      bodyProps = child[h11x_body] as any;
      return false;
    }
    return true;
  });

  return (
    <Fragment>
      {'<!DOCTYPE html>'}
      <html>
        <head {...headProps}>
          <Script />
          <DataSet data={data} />
          {heads}
        </head>
        <body {...bodyProps}>
          {realChildren}
          {bodies}
        </body>
      </html>
    </Fragment>
  );
};
