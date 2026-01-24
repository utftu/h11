import { scriptKey } from '../conts.ts';
import { Fragment, h, type Child, type FC } from 'regan';

const storage_id = 'h11x_storage_id';

type H11XStorge = {
  envs: Record<string, string>;
  props: Record<string, string>;
};

export const createStorage = (storage: H11XStorge) => storage;

export const getStorageHtml = (localWindow?: Window) => {
  const finalWindow = localWindow || window;
  const element = finalWindow.document.getElementById(storage_id);
  const rawData = element?.innerHTML!;
  const data = JSON.parse(rawData) as H11XStorge;
  return data;
};

export const Script: FC = () => {
  return h(Fragment, {}, [scriptKey]);
};

export const DataSet: FC<{ data: Record<any, any> }> = (_, { globalCtx }) => {
  const dataStr = JSON.stringify(globalCtx.data);
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

export const Template: FC<{ data?: Record<string, any> | void }> = (
  { data = {} },
  { children },
) => {
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
