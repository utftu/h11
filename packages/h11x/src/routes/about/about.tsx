export const About = ({ text }: { text: string }) => {
  return (
    <>
      {'<!DOCTYPE html>'}
      <html>
        <head></head>
        <body>
          <div>about {text}</div>

          <script type="module" src="H11X_SCRIPT_CLIENT" />
        </body>
      </html>
    </>
  );
};
