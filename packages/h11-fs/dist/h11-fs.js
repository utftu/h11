// ../h11-fs/src/connect/req.ts
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
var socket = new Socket();
var MockIncomingMessage = class extends Transform {
  method;
  url;
  headers = {};
  headersDistinct = {};
  rawHeaders = [];
  _failError;
  // mock for IncomingMessage
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
        if (val !== void 0) {
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
};

// ../h11-fs/src/connect/connect.ts
import { Readable as Readable2 } from "node:stream";

// ../h11-fs/src/connect/res.ts
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

// ../h11-fs/src/connect/res.ts
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
  const nodeRes = new MockServerResponse();
  return nodeRes;
};
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
  assignSocket() {
  }
  strictContentLength = false;
  detachSocket = () => {
  };
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
  // @ts-ignore
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
  // get bodyString(): string {
  //   return Buffer.concat(this._responseData).toString();
  // }
  // get bodyJSON(): unknown {
  //   return JSON.parse(this.bodyString);
  // }
  end(...args) {
    super.end(...args);
    this.finished = true;
    this._onEnd?.call(this);
    this.promiseEnt.controls.resolve();
    return this;
  }
  // Not implemented methods can be stubbed or extended later
  // writeContinue?(): void;
  // setTimeout?(msecs: number, callback?: () => void): this;
  // get headersSent(): boolean;
  // sendDate?: boolean;
  // addTrailers?(headers: NodeJS.OutgoingHttpHeaders): void;
};

// ../h11-fs/src/connect/connect.ts
import { copyReq } from "h11";
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
      url: makePath(
        prefixToRemove ? deletePrefix(ctx.req.url, prefixToRemove) : ctx.req.url
      )
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
    await connectMiddleware(
      nodeReq,
      nodeRes,
      (err) => {
        if (err) {
          promiseEnt.controls.reject(err);
          return;
        }
        goNext = true;
        promiseEnt.controls.resolve();
      }
    );
    await Promise.race([promiseEnt.promise, nodeRes.promiseEnt.promise]);
    if (goNext) {
      return;
    }
    const res = convertNodeResToRes(nodeRes);
    return res;
  };
};

// ../h11-fs/src/fs.ts
function getRuntime() {
  if (typeof Bun !== "undefined") return "bun";
  if (typeof process !== "undefined" && process.versions?.node) {
    return "node";
  }
  if (typeof Deno !== "undefined") return "deno";
  if (typeof EdgeRuntime !== "undefined") return "vercel-edge";
  if (typeof WebSocketPair !== "undefined") return "cloudflare-worker";
  if (typeof process !== "undefined") {
    if (process.env.AWS_EXECUTION_ENV) return "aws-lambda";
    if (process.env.NETLIFY) return "netlify";
  }
  if (typeof window !== "undefined") return "browser";
  if (typeof self !== "undefined" && typeof self.skipWaiting === "function")
    return "service-worker";
  return "unknown";
}
var getFsApi = async () => {
  const runtime = getRuntime();
  if (runtime === "bun") {
    return (await import("h11-bun")).fsApiBun;
  } else if (runtime === "node") {
    return (await import("h11-node")).fsApiNode;
  }
  throw new Error("Unknown runtime");
};
var fsApi = await getFsApi();

// ../h11-fs/src/serve.ts
import { joinUserPath as joinUserPath2 } from "h11";

// ../h11-fs/src/utils/files.ts
import "h11";
var exts = {
  js: "text/javascript",
  html: "text/html; charset=utf-8"
};
var getContentType = (filepath) => {
  const ext = filepath.split(".").at(-1);
  if (!ext) {
    return;
  }
  if (ext in exts) {
    return exts[ext];
  }
  return;
};
var formatsEnt = [
  { name: "deflate", ext: "deflate" },
  { name: "br", ext: "br" },
  { name: "gzip", ext: "gz" }
];
var gitFiles = (filepath, formats2) => {
  const files = [];
  for (const formatEnt of formatsEnt) {
    if (formats2.includes(formatEnt.name)) {
      files.push({
        filepath: `${filepath}.${formatEnt.ext}`,
        compressName: formatEnt.name
      });
    }
  }
  files.push({ filepath, compressName: "" });
  return files;
};
var findFilesCompressed = async (filepath, formats2) => {
  const files = gitFiles(filepath, formats2);
  const filesChecks = files.map(({ filepath: filepath2 }) => fsApi.checkExist(filepath2));
  for (let i = 0; i <= filesChecks.length; i++) {
    const fileCheck = filesChecks[i];
    const checkResult = await fileCheck;
    if (checkResult) {
      const file = files[i];
      return file;
    }
  }
};
var conentEncodingName = "content-encoding";
var contentTypeName = "content-type";
var getFileEnt = async (filepath, formats2) => {
  const headers = {};
  const fileEnt = await findFilesCompressed(filepath, formats2);
  if (fileEnt) {
    if (fileEnt.compressName) {
      headers[conentEncodingName] = fileEnt.compressName;
    }
    const contentType = getContentType(filepath);
    if (contentType) {
      headers[contentTypeName] = contentType;
    }
    return {
      filepath: fileEnt.filepath,
      headers
    };
  }
  const filenameHtml = await findFilesCompressed(`${filepath}.html`, []);
  if (filenameHtml) {
    return {
      filepath: filenameHtml.filepath,
      headers: {
        [contentTypeName]: exts.html
      }
    };
  }
};

// ../h11-fs/src/serve.ts
var serveFilesModule = (dirToServe, prefix = "") => {
  const handler = async ({ req, h11 }) => {
    const url = new URL(req.url);
    const resultPathname = url.pathname.slice(prefix.length);
    const filePath = joinUserPath2(dirToServe, resultPathname);
    const fileEnt = await getFileEnt(
      filePath,
      req.headers.get("Accept-Encoding")?.split(", ") || []
    );
    if (!fileEnt) {
      h11.ee.emit("code", {
        code: 404,
        text: `Not found ${req.url}`
      });
      return new Response("Not Found", {
        status: 404,
        statusText: "Not Found 404",
        headers: {
          "Content-Type": "text/plain"
        }
      });
    }
    return new Response(
      fsApi.getFileStream(fileEnt.filepath),
      {
        status: 200,
        headers: fileEnt.headers
      }
    );
  };
  return handler;
};

// ../h11-fs/src/utils/compress.ts
import { readdir } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import {
  createGzip,
  createDeflate,
  createBrotliCompress
} from "node:zlib";
var formats = {
  gzip: "gz",
  deflate: "deflate",
  brotli: "br"
};
var allowedCompressFormats = Object.keys(formats);
async function gzipFile(inputPath, outputPath, options) {
  await pipeline(
    createReadStream(inputPath),
    createGzip(options),
    createWriteStream(outputPath)
  );
}
async function deflateFile(inputPath, outputPath, options) {
  await pipeline(
    createReadStream(inputPath),
    createDeflate(options),
    createWriteStream(outputPath)
  );
}
async function brotliFile(inputPath, outputPath, options) {
  await pipeline(
    createReadStream(inputPath),
    createBrotliCompress(options),
    createWriteStream(outputPath)
  );
}
var compress = async (path, format) => {
  if (format === "brotli") {
    await brotliFile(path, `${path}.br`);
    return;
  } else if (format === "deflate") {
    await deflateFile(path, `${path}.deflate`);
    return;
  } else if (format === "gzip") {
    await gzipFile(path, `${path}.gz`);
    return;
  }
  throw new Error("Unknow compress format");
};
var recComporess = async (pathToDir) => {
  const ents = await readdir(pathToDir, { withFileTypes: true });
  file_for: for (const ent of ents) {
    if (ent.isFile()) {
      if (ent.name.endsWith(".html")) {
        continue file_for;
      }
      for (const allowedCompressFormat of allowedCompressFormats) {
        if (ent.name.endsWith(`.${formats[allowedCompressFormat]}`)) {
          continue file_for;
        }
      }
      const pathToFile = `${pathToDir}/${ent.name}`;
      for (const format of allowedCompressFormats) {
        await compress(pathToFile, format);
      }
      continue;
    }
    if (ent.isDirectory()) {
      await recComporess(`${pathToDir}/${ent.name}`);
    }
  }
};
export {
  fsApi,
  getFsApi,
  handleConnectMiddleware,
  recComporess,
  serveFilesModule
};
