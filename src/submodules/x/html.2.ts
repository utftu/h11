const createInsertDataScript = (data: any) => {
  const jsonData = data ? JSON.stringify(data) : '';
};

export const createHtml = ({
  bodyApp,
  title,
  pathToJs,
  lang = 'en',
  data,
}: {
  pathToJs?: string;
  bodyApp: string;
  title: string;
  lang?: string;
  data?: any;
}) => {
  const jsonData = data ? JSON.stringify(data) : '';
  return `<!DOCTYPE html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="app">${bodyApp}</div>
    ${pathToJs ? `<script type="module" src="${pathToJs}"></script>` : ''}
  </body>
</html>`;
};
