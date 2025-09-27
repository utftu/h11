// src/provider.node.ts
import { Readable } from "node:stream";
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
};
var createReqFromNode = (req, origin) => {
  const method = req.method;
  const headers = new Headers(req.headers);
  const body = method === "GET" || method === "HEAD" ? null : Readable.toWeb(req);
  return new Request(joinPaths(origin, req.url), {
    method,
    headers,
    body
  });
};
var sendNodeRes = (responseNative, res) => {
  const headers = {};
  responseNative.headers.forEach((value, key) => headers[key] = value);
  res.writeHead(responseNative.status, responseNative.statusText, headers);
  if (responseNative.body) {
    const resStream = Readable.fromWeb(responseNative.body);
    resStream.pipe(res);
  } else {
    res.end();
  }
};
var createNodeProvider = ({ h11 }) => async ({
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
};

// src/fs.node.ts
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, copyFile, exists, rm, writeFile } from "node:fs/promises";
import { Readable as Readable2 } from "node:stream";
import { pipeline } from "node:stream/promises";
var mkdirNode = async (path) => {
  await mkdir(path, { recursive: true });
};
var rmNode = async (path) => {
  await rm(path, { recursive: true, force: true });
};
var fsApiNode = {
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
    await writeFile(path, text);
  },
  checkExist: async (path) => {
    return exists(path);
  },
  mkdir: mkdirNode,
  copyFile,
  rm: rmNode
};
export {
  fsApiNode,
  createNodeProvider
};
