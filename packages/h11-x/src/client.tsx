import { scriptKey } from './consts.ts';
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

// Пропсы берутся из того же data, что записал сервер: без них клиент
// отрендерил бы другое дерево, и гидрация разъехалась бы с разметкой.
export const hydratePage = (Component: FC<any>) => {
  const data = getStorageHtml();

  hydrate(document, <Component {...data.props} />, { data });
};

export const Script: FC = () => {
  return h(Fragment, {}, [scriptKey]);
};

export const DataSet: FC<{ data: Record<any, any> }> = (_, { globalCtx }) => {
  const dataStr = escapeJson(JSON.stringify(globalCtx.data));
  return <template id={storage_id}>{dataStr}</template>;
};

// Head и Body сами ничего не рендерят — Template вынимает их детей и кладёт
// в <head> и <body>. Собственный рендер случается, только если их поставили
// мимо Template.
export const Head: FC = (_, { children }) => {
  return children;
};

export const Body: FC = (_, { children }) => {
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

  // Дети приезжают сюда неразвёрнутыми узлами, поэтому Head и Body узнаются
  // по самому компоненту, а их содержимое и атрибуты берутся из узла.
  const realChildren = children.filter((child: any) => {
    if (child?.component === Head) {
      heads.push(...child.children);
      headProps = child.props;
      return false;
    }

    if (child?.component === Body) {
      bodies.push(...child.children);
      bodyProps = child.props;
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
