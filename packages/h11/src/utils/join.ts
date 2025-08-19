export const joinUserPath = (basePath: string, userPath: string): string => {
  if (userPath[0] === '/') {
    return '';
  }

  const segments = userPath.split('/');
  const resolved = [];

  for (const segment of segments) {
    if (segment === '') {
      continue;
    }
    if (segment === '..') {
      return '';
    } else if (segment !== '.') {
      resolved.push(segment);
    }
  }

  let result = basePath;
  if (!basePath.endsWith('/')) {
    result += '/';
  }
  result += resolved.join('/');

  return result;
};
