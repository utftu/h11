import {
  __require,
  __toESM
} from "./h11-fs-zbk6z3qc.js";

// src/connect/req.ts
import { Socket } from "node:net";
import { Transform } from "node:stream";
var convertReqToNodeReq = ({
  req,
  url
}) => {
  const headers = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const nodeReq = new MockIncomingMessage({
    method: req.method,
    url: url || req.url,
    headers
  });
  return nodeReq;
};
var socket = new Socket;

class MockIncomingMessage extends Transform {
  method;
  url;
  headers = {};
  headersDistinct = {};
  rawHeaders = [];
  _failError;
  aborted = false;
  httpVersion = "1.1";
  httpVersionMajor = 1;
  httpVersionMinor = 1;
  complete = false;
  trailers = {};
  trailersDistinct = {};
  rawTrailers = [];
  socket = socket;
  connection = socket;
  setTimeout;
  constructor(options) {
    super();
    const self2 = this;
    const reservedOptions = ["method", "url", "headers", "rawHeaders"];
    Object.keys(options).forEach((key) => {
      if (!reservedOptions.includes(key)) {
        this[key] = options[key];
      }
    });
    this.method = options.method || "GET";
    this.url = options.url || "";
    this.setTimeout = (delay, cb) => {
      if (!cb) {
        return self2;
      }
      setTimeout(cb, delay);
      return self2;
    };
    this.headers = {};
    this.rawHeaders = [];
    if (options.headers) {
      Object.keys(options.headers).forEach((key) => {
        const val = options.headers[key];
        if (val !== undefined) {
          const headerValue = typeof val !== "string" ? String(val) : val;
          this.headers[key.toLowerCase()] = headerValue;
          this.rawHeaders.push(key);
          this.rawHeaders.push(headerValue);
          this.headersDistinct[key] = [val];
        }
      });
    }
    if (this.method === "GET" || this.method === "HEAD" || this.method === "DELETE") {
      this.end();
    }
  }
  _transform(chunk, encoding, next) {
    if (this._failError) {
      this.emit("error", this._failError);
      return;
    }
    this.push(chunk);
    next();
  }
  _fail(error) {
    this._failError = error;
  }
}

// src/connect/connect.ts
import { Readable as Readable2 } from "node:stream";

// src/connect/res.ts
import {
  STATUS_CODES
} from "node:http";
import { Readable, Transform as Transform2 } from "node:stream";

// ../../node_modules/utftu/dist/utftu.js
function u() {
  let n, t;
  return { promise: new Promise((e, o) => {
    n = e, t = o;
  }), controls: { resolve: n, reject: t } };
}

// src/connect/res.ts
var convertNodeResToRes = (res) => {
  const stream = Readable.toWeb(res);
  const newRes = new Response(stream, {
    status: res.statusCode,
    statusText: res.statusMessage,
    headers: res._headers
  });
  return newRes;
};
var createNodeRes = () => {
  const nodeRes = new MockServerResponse;
  return nodeRes;
};

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

// ../h11/dist/h11.js
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
var joinUserPath = (basePath, userPath) => {
  if (userPath[0] === "/") {
    return "";
  }
  const segments = userPath.split("/");
  const resolved = [];
  for (const segment of segments) {
    if (segment === "") {
      continue;
    }
    if (segment === "..") {
      return "";
    } else if (segment !== ".") {
      resolved.push(segment);
    }
  }
  let result = basePath;
  if (!basePath.endsWith("/")) {
    result += "/";
  }
  result += resolved.join("/");
  return result;
};
var copyReq = (req, body) => {
  const newReq = new Request(req.url, {
    ...req,
    body: body ?? undefined
  });
  return newReq;
};

// src/connect/connect.ts
var deletePrefix = (url, prefix) => {
  const parsedUrl = new URL(url);
  parsedUrl.pathname = parsedUrl.pathname.slice(prefix.length);
  return parsedUrl.toString();
};
var makePath = (url) => {
  const parsedUrl = new URL(url);
  return parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
};
var handleConnectMiddleware = ({
  connectMiddleware,
  prefixToRemove
}) => {
  return async (ctx) => {
    const nodeReq = convertReqToNodeReq({
      req: ctx.req,
      url: makePath(prefixToRemove ? deletePrefix(ctx.req.url, prefixToRemove) : ctx.req.url)
    });
    let newBody;
    if (ctx.req.body) {
      const [stream1, stream2] = ctx.req.body.tee();
      newBody = stream1;
      Readable2.fromWeb(stream2).pipe(nodeReq);
    }
    const newRequest = copyReq(ctx.req, newBody);
    ctx.req = newRequest;
    const nodeRes = createNodeRes();
    const promiseEnt = u();
    nodeRes.once("finish", () => {
      promiseEnt.controls.resolve();
    });
    nodeRes.once("error", (error) => {
      promiseEnt.controls.reject(error);
    });
    let goNext = false;
    await connectMiddleware(nodeReq, nodeRes, (err) => {
      if (err) {
        promiseEnt.controls.reject(err);
        return;
      }
      goNext = true;
      promiseEnt.controls.resolve();
    });
    await Promise.race([promiseEnt.promise, nodeRes.promiseEnt.promise]);
    if (goNext) {
      return;
    }
    const res = convertNodeResToRes(nodeRes);
    return res;
  };
};

// src/fs.ts
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
    return (await import("./h11-bun-0696pprm.js")).fsApiBun;
  } else if (runtime === "node") {
    return (await import("./h11-node-1s6025vj.js")).fsApiNode;
  }
  throw new Error("Unknown runtime");
};
var fsApi = await getFsApi();

// src/serve.ts
var serveFilesModule = (dirToServe, prefix = "") => {
  const handler = async ({ req }) => {
    const url = new URL(req.url);
    const resultPathname = url.pathname.slice(prefix.length);
    const filePath = joinUserPath(dirToServe, resultPathname);
    console.log("-----", "filePath", filePath);
    console.log("-----", "dirToServe", dirToServe);
    console.log("-----", "resultPathname", resultPathname);
    if (await fsApi.checkExist(filePath) === false) {
      console.log(`h11: Not found ${req.url}`);
      return new Response("Not Found", {
        status: 404,
        statusText: "Not Found 404",
        headers: {
          "Content-Type": "text/plain"
        }
      });
    }
    const stream = fsApi.getFileStream(filePath);
    return new Response(stream, {
      status: 200
    });
  };
  return handler;
};
export {
  serveFilesModule,
  handleConnectMiddleware,
  getFsApi,
  fsApi
};
