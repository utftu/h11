export const copyReq = (req: Request, body: ReadableStream | void) => {
  const newReq = new Request(req.url, {
    ...req,
    body: body ?? undefined,
  });
  return newReq;
};
