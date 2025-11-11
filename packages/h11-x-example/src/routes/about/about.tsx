// export const SCRIPT_KEY = '<template id="H11X_SCRIPT_CLIENT"></template>';
// import { ScriptKey } from 'h11-x/client';

import { Template } from 'h11-x/client';
import { Fragment, type FC } from 'regan';

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
      <div>div3</div>
    </Fragment>
  );
};

export const About: FC = ({ text }: { text: string }) => {
  // return <Component />;
  return <Template>1212</Template>;
};
