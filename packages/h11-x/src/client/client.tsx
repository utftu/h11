import { publicPrefix, scriptKey } from '../consts.ts';
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

// Публичные переменные на клиенте живут в window.h11x.envs: видно одним
// выражением в консоли, доступно не только нашему коду, и рядом есть куда
// положить следующее.
declare global {
  interface Window {
    h11x?: { envs: Record<string, string> };
  }
}

export const setEnvs = (envs: Record<string, string>) => {
  window.h11x = { ...window.h11x, envs };
  return envs;
};

const readEnvs = () => {
  const store = window.h11x?.envs;

  if (store !== undefined) {
    return store;
  }

  // Гидрация ещё не прошла, а значения в разметке уже лежат — читаем их
  // сами. Иначе getEnv на верхнем уровне модуля вернул бы undefined там,
  // где сервер вернул значение, и дерево разъехалось бы молча.
  return setEnvs(getStorageHtml().envs);
};

// Одна функция на оба конца: на сервере читает окружение процесса, в браузере
// — то, что сервер положил в разметку. Нужна именно одна, потому что общий
// компонент рендерится и там, и там.
//
// Bun.env, а не process.env: второе vite схлопывает в литерал при сборке
// клиента — измерено, process.env.NODE_ENV превращается в "production".
export const getEnv = (name: string) => {
  // Имя без префикса — server-only переменная: на сервере она есть, в
  // браузере её нет, и общий компонент отрендерил бы два разных дерева.
  // Молча разойтись хуже, чем упасть на первом вызове.
  if (!name.startsWith(publicPrefix)) {
    throw new Error(
      `getEnv reads only ${publicPrefix}* variables (got ${name}) — server-only values are in Bun.env`,
    );
  }

  if (typeof window === 'undefined') {
    return Bun.env[name];
  }

  return readEnvs()[name];
};

// Пропсы берутся из того же data, что записал сервер: без них клиент
// отрендерил бы другое дерево, и гидрация разъехалась бы с разметкой.
export const hydratePage = (Component: FC<any>) => {
  const data = getStorageHtml();

  // Store заполняется до рендера: компоненты читают getEnv уже при гидрации.
  setEnvs(data.envs);

  hydrate(document, <Component {...data.props} />, { data });
};

export const Script: FC = () => {
  return h(Fragment, {}, [scriptKey]);
};

// Данные берутся из globalCtx — туда их кладёт createPage при рендере. Своего
// пропа у DataSet нет: два источника одних и тех же данных разъехались бы, а
// гидрация читает ровно то, что сериализовано здесь.
export const DataSet: FC = (_, { globalCtx }) => {
  const dataStr = escapeJson(JSON.stringify(globalCtx.data));
  return <template id={storage_id}>{dataStr}</template>;
};

// Head и Body ничего не рендерят сами: Template забирает их содержимое, не
// выполняя сами компоненты. Значит выполниться они могут только в одном
// случае — их поставили туда, где Template их не видит. Раньше содержимое
// такого Head молча уезжало в <body>: title браузер ещё терпит, а, скажем,
// viewport там уже не работает. Поэтому падаем.
const createLostError = (name: string) => {
  return new Error(
    `${name} works only as a child of Template — fragments in between are fine, components are not`,
  );
};

export const Head: FC = () => {
  throw createLostError('Head');
};

export const Body: FC = () => {
  throw createLostError('Body');
};

// Фрагменты прозрачны: оборачивать детей во <> приходится по самым разным
// причинам, и Head внутри фрагмента — это тот же Head. Рекурсивно, потому что
// фрагмент может быть не один.
const flatChildren = (children: any[]): any[] => {
  const store: any[] = [];

  for (const child of children) {
    if (child?.component === Fragment) {
      store.push(...flatChildren(child.children));
      continue;
    }

    store.push(child);
  }

  return store;
};

export const Template: FC = (_, { children }) => {
  let heads: Child[] = [];
  let headProps = {};
  let bodies: Child[] = [];
  let bodyProps = {};

  // Дети приезжают сюда неразвёрнутыми узлами, поэтому Head и Body узнаются
  // по самому компоненту, а их содержимое и атрибуты берутся из узла.
  const realChildren = flatChildren(children).filter((child: any) => {
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
          <DataSet />
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
