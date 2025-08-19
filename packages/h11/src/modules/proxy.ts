import type { Handler } from '../types.ts';

export const proxyReq =
  (targetOrigin: string): Handler =>
  async ({ req }) => {
    const url = new URL(req.url);
    const targetUrl = new URL(url.pathname + url.search, targetOrigin);

    const headers = new Headers(req.headers);
    headers.set('host', targetUrl.hostname);

    const proxyRes = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: headers,
      body: req.body,
      redirect: 'manual',
    });

    return new Response(proxyRes.body, {
      status: proxyRes.status,
      statusText: proxyRes.statusText,
      headers: proxyRes.headers,
    });
  };
