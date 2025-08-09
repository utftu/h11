export const checkFile = async (dir: string, nameWithoutExt: string) => {
  const exts = ['.ts', '.tsx'];
  const variantsEnt = exts.map((ext) => {
    const filename = dir + '/' + nameWithoutExt + ext;
    return {
      filename,
      promise: fsApi.checkExist(dir + '/' + nameWithoutExt + ext),
    };
  });

  for (const { promise, filename } of variantsEnt) {
    const fileExist = await promise;

    if (fileExist) {
      return filename;
    }
  }

  throw new Error('Unknown file pattern');
};
