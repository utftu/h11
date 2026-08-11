import { Template } from 'h11-x/client';
import { Fragment, type FC } from 'regan';
import { createAtom } from 'strangelove';

export const About: FC = ({}: { text: string }, { globalCtx }) => {
  console.log(globalCtx.data.props);
  console.log(globalCtx.data.envs);
  const names = createAtom<any>(['aleksey']);
  return (
    <Template>
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
