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
  if (userPath.startsWith('/')) {
    return '';
  }

  const segments = userPath.split('/');

  if (segments.some((s) => s === '..')) {
    return '';
  }

  const resolved = segments.filter((s) => s !== '' && s !== '.');
  return joinPath(basePath, resolved.join('/'));
};
