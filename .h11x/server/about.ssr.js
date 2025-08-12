const d = ({
  bodyApp: t,
  title: e,
  pathToJs: i,
  lang: a = "en"
}) => `<!DOCTYPE html>
<html lang="${a}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${e}</title>
  </head>
  <body>
    <div id="app">${t}</div>
    ${`<script type="module" src="${i}"><\/script>`}
  </body>
</html>`, o = () => d({
  bodyApp: "<div>1111123452323)))0)</div>",
  title: "about2",
  pathToJs: "/src/routes/about/about.client.ts"
});
export {
  o as getHtml
};
