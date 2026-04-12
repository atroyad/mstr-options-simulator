/**
 * Cloudflare Worker — Saxo token-exchange proxy
 *
 * Forwards PKCE token-exchange POST to Saxo's /token endpoint and adds
 * CORS headers so the browser can call it from GitHub Pages.
 *
 * Deploy:
 *   1. Go to https://workers.cloudflare.com  (free account, no credit card)
 *   2. Create Worker → paste this file → Save & Deploy
 *   3. Copy the worker URL (e.g. https://saxo-proxy.YOUR-NAME.workers.dev)
 *   4. Paste it into the "Proxy URL" field in the MSTR Options tool → Live tab
 */
export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '*';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Read forwarded params
    const body = await request.text();
    const params = new URLSearchParams(body);

    // saxo_env is our own flag — strip it before forwarding
    const env = params.get('saxo_env') || 'live';
    params.delete('saxo_env');

    const tokenUrl =
      env === 'sim'
        ? 'https://sim.logonvalidation.net/token'
        : 'https://live.logonvalidation.net/token';

    // Forward to Saxo
    const saxoResp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await saxoResp.text();
    return new Response(data, {
      status: saxoResp.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
      },
    });
  },
};
