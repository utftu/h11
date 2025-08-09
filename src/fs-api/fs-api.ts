export type FsApi = {
  getFileStream: (path: string) => ReadableStream;
  checkExist: (path: string) => Promise<boolean>;
  mkdir: (path: string) => Promise<void>;
  copyFile: (from: string, to: string) => Promise<void>;
  rm: (path: string) => Promise<void>;
};
