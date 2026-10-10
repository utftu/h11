import { Template, Head } from 'h11-x/client';
import { Fragment, type FC } from 'regan';
import { createAtom } from 'strangelove';

export const About: FC = ({}: { text: string }, { globalCtx }) => {
  console.log(globalCtx.data.props);
  console.log(globalCtx.data.envs);
  const names = createAtom<any>(['aleksey']);
  return (
    <Template>
      <Head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>about</title>
      </Head>
      <div
        click={() => {
          names.get().push(<div>aleksey</div>);
          names.update();
        }}
      >
        add
        <div>{names}</div>
      </div>{' '}
    </Template>
  );
};
