const exts = {
  js: 'text/javascript',
  html: 'text/html; charset=utf-8',
};

export const getContentType = (name: keyof typeof exts) => {
  return exts[name];
};

export const getContentTypeHeaders = (name: keyof typeof exts) => {
  return {
    'content-type': getContentType(name),
  };
};

export const getContentTypeConfig = (name: keyof typeof exts) => {
  return {
    headers: getContentTypeHeaders(name),
  };
};
