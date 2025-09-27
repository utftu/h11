// @bun
// src/fs.bun.ts
var {file: fileBun, write } = globalThis.Bun;

// ../h11-node/src/fs.node.ts
import { mkdir, copyFile, exists, rm, writeFile } from "fs/promises";
import { dirname } from "path";
var copyFiles = async (from, to) => {
  const destDir = dirname(from);
  await mkdir(destDir, { recursive: true });
  await copyFile(from, to);
};
var mkdirNode = async (path) => {
  await mkdir(path, { recursive: true });
};
var rmNode = async (path) => {
  await rm(path, { recursive: true, force: true });
};

// src/fs.bun.ts
var fsApiBun = {
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

// src/provider.bun.ts
var createBunProvider = ({ h11 }) => {
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
export {
  fsApiBun,
  createBunProvider
};
