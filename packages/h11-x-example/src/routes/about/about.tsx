// export const SCRIPT_KEY = '<template id="H11X_SCRIPT_CLIENT"></template>';
// import { ScriptKey } from 'h11-x/client';

import { Template } from 'h11-x/client';
import { Fragment, type FC } from 'regan';
import { createAtom } from 'strangelove';

// const SCRIPT_H11X = () => {
//   return <template id="H11X_SCRIPT_CLIENT"></template>;
// };

const Component = () => {
  return (
    <Fragment>
      parent
      <div>div1</div>
      <div>
        div2
        <div>div2.1</div>
      </div>
      <div>div3 2323!!</div>
    </Fragment>
  );
};

export const About: FC = ({ text }: { text: string }, { globalCtx }) => {
  console.log(globalCtx.data.props);
  console.log(globalCtx.data.envs);
  const names = createAtom<any>(['aleksey']);
  return (
    <Template>
      <div
        click={() => {
          names.get().push(<div>'aleksey'</div>);
          names.update();
        }}
      >
        add
        <div>{names}</div>
      </div>{' '}
    </Template>
  );
};
