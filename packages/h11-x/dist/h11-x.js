// @bun
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);

// ../h11-bun/dist/h11-bun.js
var exports_h11_bun = {};
__export(exports_h11_bun, {
  fsApiBun: () => fsApiBun,
  createBunProvider: () => createBunProvider
});
import { mkdir, copyFile, exists, rm, writeFile } from "fs/promises";
import { dirname } from "path";
var fileBun, write, copyFiles = async (from, to) => {
  const destDir = dirname(from);
  await mkdir(destDir, { recursive: true });
  await copyFile(from, to);
}, mkdirNode = async (path) => {
  await mkdir(path, { recursive: true });
}, rmNode = async (path) => {
  await rm(path, { recursive: true, force: true });
}, fsApiBun, createBunProvider = ({ h11 }) => {
  return async (req, server) => {
    const res = await h11.exec({
      req,
      providers: {
        bun: {
          req,
          server
        }
      },
      data: {}
    });
    return res;
  };
};
var init_h11_bun = __esm(() => {
  ({ file: fileBun, write } = globalThis.Bun);
  fsApiBun = {
    getFileStream: (path) => {
      const file = fileBun(path);
      return file.stream();
    },
    async writeFileStream(path, stream) {
      await Bun.write(path, new Response(stream));
    },
    writeFile: async (path, text) => {
      await write(path, text);
    },
    checkExist: async (path) => {
      const file = fileBun(path);
      return await file.exists();
    },
    mkdir: mkdirNode,
    copyFile: copyFiles,
    rm: rmNode
  };
});

// ../h11-node/dist/h11-node.js
var exports_h11_node = {};
__export(exports_h11_node, {
  fsApiNode: () => fsApiNode,
  createNodeProvider: () => createNodeProvider
});
import { Readable } from "stream";
import { createReadStream, createWriteStream } from "fs";
import { mkdir as mkdir2, copyFile as copyFile2, exists as exists2, rm as rm2, writeFile as writeFile2 } from "fs/promises";
import { Readable as Readable2 } from "stream";
import { pipeline } from "stream/promises";
var joinPaths = (elem1, elem2) => {
  if (elem1.at(-1) === "/") {
    if (elem2[0] === "/") {
      return `${elem1}${elem2.slice(1)}`;
    } else {
      return elem1 + elem2;
    }
  } else {
    if (elem2[0] === "/") {
      return elem1 + elem2;
    } else {
      return `${elem1}/${elem2}`;
    }
  }
}, createReqFromNode = (req, origin) => {
  const method = req.method;
  const headers = new Headers(req.headers);
  const body = method === "GET" || method === "HEAD" ? null : Readable.toWeb(req);
  return new Request(joinPaths(origin, req.url), {
    method,
    headers,
    body
  });
}, sendNodeRes = (responseNative, res) => {
  const headers = {};
  responseNative.headers.forEach((value, key) => headers[key] = value);
  res.writeHead(responseNative.status, responseNative.statusText, headers);
  if (responseNative.body) {
    const resStream = Readable.fromWeb(responseNative.body);
    resStream.pipe(res);
  } else {
    res.end();
  }
}, createNodeProvider = ({ h11 }) => async ({
  req,
  res,
  origin
}) => {
  const preapredOrigin = req.headers["host"] || origin;
  const preparedRes = createReqFromNode(req, preapredOrigin);
  const execRes = await h11.exec({
    req: preparedRes,
    data: {},
    providers: {
      node: {
        req,
        res
      }
    }
  });
  sendNodeRes(execRes, res);
}, mkdirNode2 = async (path) => {
  await mkdir2(path, { recursive: true });
}, rmNode2 = async (path) => {
  await rm2(path, { recursive: true, force: true });
}, fsApiNode;
var init_h11_node = __esm(() => {
  fsApiNode = {
    getFileStream: (path) => {
      const file = createReadStream(path);
      return Readable2.toWeb(file);
    },
    async writeFileStream(path, stream) {
      const nodeReadable = Readable2.fromWeb(stream);
      const file = createWriteStream(path);
      await pipeline(nodeReadable, file);
    },
    writeFile: async (path, text) => {
      await writeFile2(path, text);
    },
    checkExist: async (path) => {
      return exists2(path);
    },
    mkdir: mkdirNode2,
    copyFile: copyFile2,
    rm: rmNode2
  };
});

// ../h11-fs/dist/h11-fs.js
import { Socket } from "net";
import {
  STATUS_CODES
} from "http";
import { Readable as Readable3, Transform as Transform2 } from "stream";
import { copyReq } from "h11";
import { joinUserPath as joinUserPath2 } from "h11";
import"h11";
var socket = new Socket;
function u() {
  let n, t;
  return { promise: new Promise((e, o) => {
    n = e, t = o;
  }), controls: { resolve: n, reject: t } };
}
var MockServerResponse = class extends Transform2 {
  statusCode = 200;
  statusMessage = STATUS_CODES[200];
  _headers = {};
  _onEnd;
  started = false;
  promiseEnt = u();
  finished = false;
  constructor(onEnd) {
    super();
    this._onEnd = onEnd;
  }
  assignSocket() {}
  strictContentLength = false;
  detachSocket = () => {};
  _transform(chunk, encoding, callback) {
    if (!this.started) {
      this.started = true;
      this.promiseEnt.controls.resolve();
    }
    this.push(chunk);
    callback();
  }
  setHeader(name, value) {
    this._headers[name.toLowerCase()] = value;
    return this;
  }
  getHeader(name) {
    return this._headers[name.toLowerCase()];
  }
  getHeaders() {
    return this._headers;
  }
  removeHeader(name) {
    delete this._headers[name.toLowerCase()];
  }
  writeHead(statusCode, reasonOrHeaders, headers) {
    this.statusCode = statusCode;
    if (typeof reasonOrHeaders === "string") {
      this.statusMessage = reasonOrHeaders;
    } else {
      this.statusMessage = STATUS_CODES[statusCode] || "unknown";
      headers = reasonOrHeaders;
    }
    if (headers) {
      for (const [name, value] of Object.entries(headers)) {
        this.setHeader(name, value);
      }
    }
    return this;
  }
  end(...args) {
    super.end(...args);
    this.finished = true;
    this._onEnd?.call(this);
    this.promiseEnt.controls.resolve();
    return this;
  }
};
function getRuntime() {
  if (typeof Bun !== "undefined")
    return "bun";
  if (typeof process !== "undefined" && process.versions?.node) {
    return "node";
  }
  if (typeof Deno !== "undefined")
    return "deno";
  if (typeof EdgeRuntime !== "undefined")
    return "vercel-edge";
  if (typeof WebSocketPair !== "undefined")
    return "cloudflare-worker";
  if (typeof process !== "undefined") {
    if (process.env.AWS_EXECUTION_ENV)
      return "aws-lambda";
    if (process.env.NETLIFY)
      return "netlify";
  }
  if (typeof window !== "undefined")
    return "browser";
  if (typeof self !== "undefined" && typeof self.skipWaiting === "function")
    return "service-worker";
  return "unknown";
}
var getFsApi = async () => {
  const runtime = getRuntime();
  if (runtime === "bun") {
    return (await Promise.resolve().then(() => (init_h11_bun(), exports_h11_bun))).fsApiBun;
  } else if (runtime === "node") {
    return (await Promise.resolve().then(() => (init_h11_node(), exports_h11_node))).fsApiNode;
  }
  throw new Error("Unknown runtime");
};
var fsApi = await getFsApi();
var formats = {
  gzip: "gz",
  deflate: "deflate",
  brotli: "br"
};
var allowedCompressFormats = Object.keys(formats);

// src/ssg.ts
import { defineConfig, build as buildVite } from "vite";

// src/utils.ts
import { cwd } from "process";
var getDefaultBasedir = () => {
  return `${cwd()}/.h11x`;
};
var convertStreamToString = async (stream) => {
  const reader = stream.getReader();
  const decoder = new TextDecoder;
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done)
      break;
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode();
  return result;
};
var checkFile = async (dir, nameWithoutExt, fsApi2) => {
  const exts = [".ts", ".tsx"];
  const variantsEnt = exts.map((ext) => {
    const filename = dir + "/" + nameWithoutExt + ext;
    return {
      filename,
      promise: fsApi2.checkExist(dir + "/" + nameWithoutExt + ext)
    };
  });
  for (const { promise, filename } of variantsEnt) {
    const fileExist = await promise;
    if (fileExist) {
      return filename;
    }
  }
  throw new Error("Unknown file pattern");
};
var getEntName = (str) => {
  return str.split("/").at(-1);
};
var joinPath = (left, right) => {
  if (left === "") {
    return right;
  }
  if (right === "") {
    return left;
  }
  const preparedLeft = left.endsWith("/") ? left.slice(0, -1) : left;
  const preparedRight = right.startsWith("/") ? right.slice(1) : right;
  return preparedLeft + "/" + preparedRight;
};

// ../../node_modules/regan-vite/dist/regan-vite.js
var t = () => ({
  name: "vite-plugin-regan",
  enforce: "pre",
  config(r, { mode: e }) {
    return {
      esbuild: {
        jsx: "automatic",
        jsxDev: e === "development",
        jsxImportSource: "regan",
        jsxFragment: "Fragment",
        jsxFactory: "createElement"
      }
    };
  }
});

// src/ssg.ts
import { relative } from "path";
var fsApi2 = await getFsApi();
var makeSsg = async ({
  routes,
  prod,
  baseDir
}) => {
  const baseDirPrepared = baseDir || process.cwd();
  const routesPromises = routes.map(async ({ dir, name }) => {
    const ssgFile = await checkFile(dir, `${name}.ssg`, fsApi2);
    const clientFile = await checkFile(dir, `${name}.client`, fsApi2);
    await buildVite({
      build: {
        outDir: joinPath(baseDirPrepared, "ssg"),
        lib: {
          entry: ssgFile,
          formats: ["es"],
          fileName: name
        },
        emptyOutDir: false
      },
      plugins: [t()]
    });
    const result = await buildVite(defineConfig({
      build: {
        rollupOptions: {
          input: clientFile
        },
        emptyOutDir: false,
        outDir: baseDirPrepared
      },
      plugins: [t()]
    }));
    if (!("output" in result)) {
      throw new Error("No output in build");
    }
    const buildEnt = result.output[0];
    const clientPreparedFile = relative(joinPath(baseDirPrepared, "assets"), `${baseDirPrepared}/${buildEnt.fileName}`);
    const jsContent = joinPath(baseDirPrepared, `ssg/${name}.js`);
    const { getPages } = await import(jsContent);
    const pages = await getPages();
    for (const { pathname, getHtml } of pages) {
      const html = await getHtml({ pathname });
      const htmlWithScript = html.replace("H11X_SCRIPT_CLIENT", prod ? clientPreparedFile : clientFile);
      await fsApi2.writeFile(joinPath(baseDirPrepared, `assets/${pathname}.html`), htmlWithScript);
    }
  });
  await Promise.all(routesPromises);
};

// src/ssr.ts
import { defineConfig as defineConfig2, build as buildVite2 } from "vite";
var fsApi3 = await getFsApi();
var SCRIPT_KEY = '<template id="H11X_SCRIPT_CLIENT"></template>';
var makeSsr = async ({
  routes,
  baseDir,
  prod,
  prefix,
  devPrefix
}) => {
  const baseDirPrepared = baseDir || `${process.cwd()}/.h11x`;
  const assetsStore = {
    prod,
    prefix,
    devPrefix,
    routes: {}
  };
  const routesPromises = routes.map(async ({ dir, name }) => {
    const ssrFile = await checkFile(dir, `${name}.ssr`, fsApi3);
    const clientFile = await checkFile(dir, `${name}.client`, fsApi3);
    const ssrFileResult = await buildVite2(defineConfig2({
      plugins: [t()],
      build: {
        outDir: joinPath(baseDirPrepared, "ssr"),
        lib: {
          entry: ssrFile,
          formats: ["es"],
          fileName: name
        },
        emptyOutDir: false
      }
    }));
    const clientFileResult = await buildVite2(defineConfig2({
      plugins: [t()],
      build: {
        emptyOutDir: false,
        rollupOptions: {
          input: clientFile
        },
        outDir: baseDirPrepared
      }
    }));
    const filename = clientFileResult.output[0].fileName;
    assetsStore.routes[name] = {
      client: joinPath(baseDirPrepared, clientFileResult.output[0].fileName),
      clientRaw: clientFile,
      clientUrl: filename.split("/").slice(1).join("/"),
      ssrFile: joinPath(baseDirPrepared, `ssr/${name}.js`),
      ssrFileRaw: ssrFile
    };
  });
  await Promise.all(routesPromises);
  const assetsJson = JSON.stringify(assetsStore, null, 2);
  fsApi3.writeFile(joinPath(baseDirPrepared, "ssr/config.json"), assetsJson);
};
var readSsrConfig = async (baseDir) => {
  const baseDirPrepared = baseDir ?? getDefaultBasedir();
  const configPath = joinPath(baseDirPrepared, "ssr/config.json");
  const configStream = fsApi3.getFileStream(configPath);
  const configJson = await convertStreamToString(configStream);
  const config = JSON.parse(configJson);
  return config;
};
var getSsrHtml = async ({
  vite,
  config,
  name
}) => {
  const route = config.routes[name];
  if (config.prod) {
    const { getHtml } = await import(route.ssrFile);
    return () => {
      const html = getHtml();
      const path = joinPath(config.prefix, route.clientUrl);
      console.log("-----", "path", path);
      const sctipt = `<script type="module" src="${path}"></script> `;
      const htmlWithScript = html.replace(SCRIPT_KEY, sctipt);
      return htmlWithScript;
    };
  } else {
    const { getHtml } = await vite.ssrLoadModule(route.ssrFileRaw);
    return () => {
      const html = getHtml();
      const prefixPath = joinPath(config.devPrefix, config.prefix);
      const viteClient = joinPath(prefixPath, "/@vite/client");
      const jsClient = joinPath(prefixPath, route.clientRaw);
      const sctipt1 = `<script type="module" src="${viteClient}"></script>`;
      const sctipt2 = `<script type="module" src="${jsClient}"></script> `;
      const sctits = sctipt1 + sctipt2;
      const htmlWithScript = html.replace(SCRIPT_KEY, sctits);
      return htmlWithScript;
    };
  }
};

// src/h11-x.ts
var defaultDevPrefix = "/_vite";
var defaultPrefix = "/h11x";
var defaultFullPrefix = defaultDevPrefix + defaultPrefix;
var makeRouteUniversal = (route) => {
  if (typeof route === "string") {
    return {
      dir: route,
      name: getEntName(route)
    };
  }
  return route;
};
var buildH11X = async ({
  baseDir,
  prod = true,
  routes,
  prefix = "/h11x",
  devPrefix = "/_vite"
}) => {
  const baseDirPrepared = baseDir || `${process.cwd()}/.h11x`;
  await fsApi.rm(baseDirPrepared);
  const ssgRoutes = [];
  const ssrRoutes = [];
  for (const route of routes) {
    const { dir, name } = makeRouteUniversal(route);
    const ssgFile = await checkFile(dir, `${name}.ssg`, fsApi);
    const ssrFile = await checkFile(dir, `${name}.ssr`, fsApi);
    const clientFile = await checkFile(dir, `${name}.client`, fsApi);
    const clientFileCheck = await fsApi.checkExist(clientFile);
    if (!clientFileCheck) {
      throw new Error(`No client file ${clientFile}`);
    }
    const ssgFileCheck = await fsApi.checkExist(ssgFile);
    if (ssgFileCheck) {
      ssgRoutes.push({ dir, name });
    }
    const ssrFileCheck = await fsApi.checkExist(ssrFile);
    if (ssrFileCheck) {
      ssrRoutes.push({ dir, name });
    }
  }
  if (ssgRoutes.length) {
    await makeSsg({ routes: ssgRoutes, prod, baseDir });
  }
  if (ssgRoutes.length) {
    await makeSsr({
      routes: ssrRoutes,
      baseDir,
      prod,
      prefix,
      devPrefix
    });
  }
};
export {
  readSsrConfig,
  makeSsr,
  makeSsg,
  makeRouteUniversal,
  getSsrHtml,
  defaultPrefix,
  defaultFullPrefix,
  defaultDevPrefix,
  buildH11X
};
