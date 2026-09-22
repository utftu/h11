export const copyReq = (req: Request, body: ReadableStream | void) => {
  const newReq = new Request(req.url, {
    method: req.method,
    headers: req.headers,
    body: body ?? undefined,
  });
  return newReq;
};
