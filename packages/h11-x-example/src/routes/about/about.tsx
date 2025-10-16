export const SCRIPT_KEY = '<template id="H11X_SCRIPT_CLIENT"></template>';

const SCRIPT_H11X = () => {
  return <template id="H11X_SCRIPT_CLIENT"></template>;
};

export const About = ({ text }: { text: string }) => {
  return (
    <>
      {'<!DOCTYPE html>'}
      <html>
        <head></head>
        <body>
          <div>about {text} 12322222222333</div>

          <SCRIPT_H11X />
          {/* <template id="1@"></template> */}
          {/* <script type="module" src="/@vite/client" /> */}
          {/* <script type="module" src="H11X_SCRIPT_CLIENT" /> */}
        </body>
      </html>
    </>
  );
};
