// export const SCRIPT_KEY = '<template id="H11X_SCRIPT_CLIENT"></template>';
import { ScriptKey } from '../../../../h11-x/dist/h11-x.client';

// const SCRIPT_H11X = () => {
//   return <template id="H11X_SCRIPT_CLIENT"></template>;
// };

export const About = ({ text }: { text: string }) => {
  return (
    <>
      {'<!DOCTYPE html>'}
      <html>
        <head>
          <ScriptKey />
          {/* <SCRIPT_H11X /> */}
        </head>
        <body>
          <div>about {text} 1232</div>

          {/* <SCRIPT_H11X /> */}
        </body>
      </html>
    </>
  );
};
