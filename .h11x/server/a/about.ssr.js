const a = ({
  bodyApp: e,
  title: i,
  pathToJs: t,
  lang: d = "en"
}) => `<!DOCTYPE html>
<html lang="${d}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${i}</title>
  </head>
  <body>
    <div id="app">${e}</div>
    ${t ? `<script type="module" src="${t}"><\/script>` : ""}
  </body>
</html>`, l = () => a({
  bodyApp: "<div>about1</div>",
  title: "about2"
  // pathToJs: '/src/routes/about/about.client.ts',
});
export {
  l as getHtml
};
