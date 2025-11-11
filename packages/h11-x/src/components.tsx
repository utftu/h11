import { scriptKey } from './conts.ts';
import { Fragment, h, type Child, type FC } from 'regan';

// const getClientData = () => {
//   const el = window.document.getElementById('h11x_data');
//   const content = el!.textContent!;

//   return JSON.parse(content);
// };

export const Script: FC = () => {
  return h(Fragment, {}, [scriptKey]);
};

export const Data: FC<{ data: any }> = ({ data }) => {
  const dataStr = JSON.stringify(data);
  return <template id="h11x_data">{dataStr}</template>;
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

export const Template: FC<{ data: Record<string, any> }> = (
  { data },
  { children }
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
      <div>
        <div>hello!!</div>
        div1111
      </div>
      <html>
        <div>hello!!</div>
        <head {...headProps}>
          <Script />
          <Data data={data} />
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
