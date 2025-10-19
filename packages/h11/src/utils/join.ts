export const joinPath = (left: string, right: string) => {
  if (left === '') {
    return right;
  }

  if (right === '') {
    return left;
  }

  const preparedLeft = left.endsWith('/') ? left.slice(0, -1) : left;
  const preparedRight = right.startsWith('/') ? right.slice(1) : right;
  return preparedLeft + '/' + preparedRight;
};

export const joinUserPath = (basePath: string, userPath: string): string => {
  const segments = userPath.split('/');
  const resolved = [];

  for (const segment of segments) {
    if (segment === '' || segment === '..' || segment === '.') {
      continue;
    }
    resolved.push(segment);

    // if (segment === '..') {
    //   return '';
    // } else if (segment !== '.') {
    //   resolved.push(segment);
    // }
  }

  return joinPath(basePath, resolved.join('/'));

  let result = basePath;
  if (!basePath.endsWith('/')) {
    result += '/';
  }
  result += resolved.join('/');

  return result;
};
