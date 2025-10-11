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

// src/ssg.ts
import { defineConfig, build as buildVite } from "vite";

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

// src/utils.ts
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
  if (right.startsWith("/")) {
    return right;
  }
  if (left === "") {
    return right;
  }
  const preparedLeft = left.endsWith("/") ? left.slice(0, -1) : left;
  return preparedLeft + "/" + right;
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
  const h11xDir = joinPath(baseDirPrepared, ".h11x");
  const assetsDir = joinPath(h11xDir, "assets");
  const routesPromises = routes.map(async ({ dir, name }) => {
    const entName = getEntName(dir);
    const ssgFile = await checkFile(dir, `${entName}.ssg`, fsApi2);
    const clientFile = await checkFile(dir, `${entName}.client`, fsApi2);
    const result = await buildVite(defineConfig({
      build: {
        rollupOptions: {
          input: clientFile
        },
        emptyOutDir: false,
        outDir: h11xDir
      },
      plugins: [t()]
    }));
    if (!("output" in result)) {
      throw new Error("No output in build");
    }
    const buildEnt = result.output[0];
    const clientPreparedFile = relative(assetsDir, `${h11xDir}/${buildEnt.fileName}`);
    await buildVite({
      build: {
        outDir: joinPath(h11xDir, "ssg"),
        lib: {
          entry: ssgFile,
          formats: ["es"],
          fileName: name
        },
        emptyOutDir: false
      },
      plugins: [t()]
    });
    const jsContent = joinPath(h11xDir, `ssg/${name}.js`);
    const { getPages } = await import(jsContent);
    const pages = await getPages();
    for (const { pathname, getHtml } of pages) {
      const html = await getHtml({ pathname });
      const htmlWithScript = html.replace("H11X_SCRIPT_CLIENT", prod ? clientPreparedFile : clientFile);
      await fsApi2.writeFile(joinPath(h11xDir, `assets/${pathname}.html`), htmlWithScript);
    }
  });
  await Promise.all(routesPromises);
};
await makeSsg({
  routes: [{ type: "ssg", dir: "./src/routes/about", name: "about.ssg" }],
  prod: true
});

// src/ssr.ts
import { defineConfig as defineConfig2, build as buildVite2 } from "vite";
var fsApi3 = await getFsApi();
var makeSsr = async ({
  routes,
  baseDir
}) => {
  const baseDirPrepared = baseDir || process.cwd();
  const h11Dir = joinPath(baseDirPrepared, ".h11x");
  const routesPromises = routes.map(async ({ dir, pathname }) => {
    const entName = getEntName(dir);
    const ssrFile = await checkFile(dir, `${entName}.ssr`, fsApi3);
    const clientFile = await checkFile(dir, `${entName}.client`, fsApi3);
    await buildVite2(defineConfig2({
      build: {
        outDir: joinPath(h11Dir, "ssr"),
        lib: {
          entry: ssrFile,
          formats: ["es"],
          fileName: pathname
        },
        emptyOutDir: false
      }
    }));
    await buildVite2(defineConfig2({
      build: {
        emptyOutDir: false,
        rollupOptions: {
          input: clientFile
        },
        outDir: h11Dir
      }
    }));
  });
  await Promise.all(routesPromises);
};
await makeSsr({
  routes: [{ type: "ssr", dir: "./src/routes/about", pathname: "about.ssr" }]
});
export {
  makeSsr,
  makeSsg
};
