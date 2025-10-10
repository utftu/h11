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

// ../h11-fs/dist/h11-fs-zbk6z3qc.js
var init_h11_fs_zbk6z3qc = () => {};

// ../h11-fs/dist/h11-bun-0696pprm.js
var exports_h11_bun_0696pprm = {};
__export(exports_h11_bun_0696pprm, {
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
var init_h11_bun_0696pprm = __esm(() => {
  init_h11_fs_zbk6z3qc();
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

// ../h11-fs/dist/h11-node-1s6025vj.js
var exports_h11_node_1s6025vj = {};
__export(exports_h11_node_1s6025vj, {
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
var init_h11_node_1s6025vj = __esm(() => {
  init_h11_fs_zbk6z3qc();
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
init_h11_fs_zbk6z3qc();
import { Socket } from "net";
import {
  STATUS_CODES
} from "http";
import { Readable as Readable3, Transform as Transform2 } from "stream";
var socket = new Socket;
function u() {
  let n, t;
  return { promise: new Promise((e, o) => {
    n = e, t = o;
  }), controls: { resolve: n, reject: t } };
}
class MockServerResponse extends Transform2 {
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
}

class Node {
  segment;
  handlers = {};
  children = [];
  wildParent = false;
  parent;
  constructor({ segment, parent }) {
    this.segment = segment;
    this.parent = parent;
  }
}
var addNodeToChildren = (parent, node) => {
  const children = parent.children;
  if (children.length === 0) {
    children.push(node);
    return;
  }
  if (node.segment === "**") {
    children.push(node);
    return;
  } else if (node.segment[0] === ":") {
    for (let i = children.length - 1;i >= 0; i--) {
      const compareNode = children[i];
      if (compareNode.segment === "**") {
        continue;
      }
      children.splice(i + 1, 0, node);
      return;
    }
    children.unshift(node);
  } else {
    for (let i = children.length - 1;i >= 0; i--) {
      const compareNode = children[i];
      if (compareNode.segment === "**" || compareNode.segment[0] === ":") {
        continue;
      }
      children.splice(i + 1, 0, node);
      return;
    }
    children.unshift(node);
  }
};

class Radix {
  root = new Node({ segment: "" });
  find(path, method = "GET") {
    const segments = path.split("/");
    const params = {};
    let currentNode = this.root;
    let lastWild = undefined;
    outer:
      for (let i = 0;i < segments.length; i++) {
        const segment = segments[i];
        if (currentNode.wildParent === true) {
          const wild = currentNode.children[currentNode.children.length - 1];
          const wildHandlerContainer = wild.handlers[method];
          if (wildHandlerContainer) {
            lastWild = {
              node: wild,
              handlerEnt: wildHandlerContainer,
              params: { ...params, wild: segments.slice(i).join("/") }
            };
          }
        }
        if (currentNode.segment[0] === ":") {
          params[currentNode.segment.slice(1)] = segment;
        }
        const isLastSegment = i + 1 === segments.length;
        if (isLastSegment) {
          break;
        }
        if (currentNode.children.length === 0) {
          return lastWild;
        }
        for (const child of currentNode.children) {
          const nextSegment = segments[i + 1];
          if (child.segment === nextSegment) {
            currentNode = child;
            continue outer;
          }
          if (child.segment[0] === ":" && nextSegment !== "") {
            currentNode = child;
            continue outer;
          }
        }
        return lastWild;
      }
    const handlerContainer = currentNode.handlers[method];
    if (!handlerContainer) {
      return lastWild;
    }
    return {
      node: currentNode,
      params,
      handlerEnt: handlerContainer
    };
  }
  add(pattern, method = "GET", handler) {
    const patternSegments = pattern.slice(1).split("/");
    let currentNode = this.root;
    outer:
      for (let i = 0;i < patternSegments.length; i++) {
        const segment = patternSegments[i];
        for (const child of currentNode.children) {
          if (child.segment === segment) {
            currentNode = child;
            continue outer;
          }
        }
        const newNode = new Node({ segment, parent: currentNode });
        addNodeToChildren(currentNode, newNode);
        if (segment === "**") {
          currentNode.wildParent = true;
        }
        currentNode = newNode;
      }
    currentNode.handlers[method] = handler;
    return currentNode;
  }
}
var defaultOnNotFound = (req) => {
  console.log(`h11: Not found ${req.url}`);
  return new Response("Not Found", {
    status: 404,
    statusText: "Not Found 404",
    headers: {
      "Content-Type": "text/plain"
    }
  });
};
var defaultOnError = ({ req, error }) => {
  console.error(`h11: Error ${req.url} - ${error.message}`);
  return new Response(error.message || "Error 500", {
    status: 500,
    statusText: "System error 500",
    headers: {
      "Content-Type": "text/plain"
    }
  });
};

class H11 {
  types;
  radix = new Radix;
  fsApi;
  onNotFound = defaultOnNotFound;
  onError = defaultOnError;
  addRoute(pattern, method, handlers) {
    const preparedHandler = { handlers };
    this.radix.add(pattern, method, preparedHandler);
  }
  get(pattern, ...handlers) {
    this.addRoute(pattern, "GET", handlers);
    return this;
  }
  post(pattern, ...handlers) {
    this.addRoute(pattern, "POST", handlers);
    return this;
  }
  async exec({ req, data, providers }) {
    const url = new URL(req.url);
    const findResult = this.radix.find(url.pathname, req.method);
    if (!findResult) {
      return this.onNotFound(req);
    }
    const props = {
      req,
      params: findResult.params,
      data,
      providers
    };
    try {
      for (const handler of findResult.handlerEnt.handlers) {
        const response = await handler(props);
        if (response) {
          return response;
        }
      }
      return defaultOnNotFound(req);
    } catch (error) {
      return this.onError({ ...props, error });
    }
  }
}
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
    return (await Promise.resolve().then(() => (init_h11_bun_0696pprm(), exports_h11_bun_0696pprm))).fsApiBun;
  } else if (runtime === "node") {
    return (await Promise.resolve().then(() => (init_h11_node_1s6025vj(), exports_h11_node_1s6025vj))).fsApiNode;
  }
  throw new Error("Unknown runtime");
};
var fsApi = await getFsApi();

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
    console.log("-----", "1", assetsDir);
    console.log("-----", "2", `${assetsDir}/${buildEnt.fileName}`);
    console.log("-----", "buildEnt.fileName", buildEnt.fileName);
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
