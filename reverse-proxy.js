// Lightweight Node reverse proxy for the Vite dev server.
//
// Primary use case: a DevCloud / remote VM where the public URL only reaches
// standard ports (80 / 443) and Vite runs on a non-standard one (5174).
// We forward incoming HTTP (and WebSocket HMR) traffic to Vite.
//
// In addition to the Vite forwarder, this process also terminates the
// /api/ai/chat route used by the AI Assistant: it injects the upstream
// auth header and relays the Claude Messages API body to api.anthropic.com.
// Keeping the key here (instead of the client bundle) mirrors what nginx
// does in production, so dev behaves the same as prod.
//
// Configuration (all optional):
//   PORT               listen port (default 8080 — unprivileged on Linux)
//   HOST               bind address (default 0.0.0.0)
//   VITE_TARGET        upstream URL (default http://127.0.0.1:5174)
//   ANTHROPIC_API_KEY  Claude API key; if unset, /api/ai/chat returns 503
//
// Ports <1024 on Linux require root. Either run with sudo, set PORT=8080 and
// let Docker/another proxy publish 80, or grant the binary the needed cap:
//   sudo setcap 'cap_net_bind_service=+ep' "$(which node)"

import http from 'node:http';
import https from 'node:https';
import httpProxy from 'http-proxy';

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const TARGET = process.env.VITE_TARGET || 'http://127.0.0.1:5174';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_HOST = 'api.anthropic.com';
const ANTHROPIC_PATH = '/v1/messages';

const proxy = httpProxy.createProxyServer({
  target: TARGET,
  changeOrigin: true,
  ws: true, // forward WebSocket upgrades (Vite HMR)
  xfwd: true,
});

proxy.on('error', (err, _req, res) => {
  // `res` may be a net.Socket during WS upgrades — guard for both shapes.
  if (res && 'headersSent' in res && !res.headersSent && 'writeHead' in res) {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Upstream unavailable: ${err.message}\n`);
  } else if (res && 'destroy' in res) {
    res.destroy();
  }
  console.error('[proxy] upstream error:', err.message);
});

// ----------------------------------------------------------------------------
// /api/ai/chat — forwards to Anthropic with server-side auth injection.
// ----------------------------------------------------------------------------
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function handleAiChat(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { Allow: 'POST' });
    res.end();
    return;
  }
  if (!ANTHROPIC_API_KEY) {
    sendJson(res, 503, {
      error: {
        type: 'not_configured',
        message: 'AI assistant is not configured on this server (ANTHROPIC_API_KEY missing).',
      },
    });
    return;
  }

  // Hard cap body size to avoid accidental DoS via large payloads. The
  // largest legitimate request (system prompt + user message) is well
  // under 32 kB.
  const MAX_BODY = 64 * 1024;
  const chunks = [];
  let total = 0;
  let aborted = false;

  req.on('data', (chunk) => {
    if (aborted) return;
    total += chunk.length;
    if (total > MAX_BODY) {
      aborted = true;
      sendJson(res, 413, {
        error: { type: 'payload_too_large', message: 'Request body exceeds 64 kB limit.' },
      });
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on('error', (err) => {
    console.error('[ai] client stream error:', err.message);
    if (!res.headersSent) {
      sendJson(res, 400, { error: { type: 'bad_request', message: err.message } });
    }
  });

  req.on('end', () => {
    if (aborted) return;
    const bodyBuf = Buffer.concat(chunks);

    const upstream = https.request(
      {
        host: ANTHROPIC_HOST,
        port: 443,
        path: ANTHROPIC_PATH,
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'content-length': bodyBuf.length,
          accept: 'application/json',
          'user-agent': 'edgeone-pricing-calculator/1.0',
        },
        // Keep a short connection timeout; upstream read timeout below.
        timeout: 60_000,
      },
      (upstreamRes) => {
        // Relay status + safe headers. We deliberately drop Set-Cookie
        // and hop-by-hop headers to keep the proxy opinionated.
        const safeHeaders = {};
        for (const [k, v] of Object.entries(upstreamRes.headers)) {
          const key = k.toLowerCase();
          if (
            key === 'content-type' ||
            key === 'content-length' ||
            key === 'cache-control'
          ) {
            safeHeaders[k] = v;
          }
        }
        res.writeHead(upstreamRes.statusCode || 502, safeHeaders);
        upstreamRes.pipe(res);
      },
    );

    upstream.on('timeout', () => {
      upstream.destroy(new Error('upstream timeout'));
    });
    upstream.on('error', (err) => {
      console.error('[ai] upstream error:', err.message);
      if (!res.headersSent) {
        sendJson(res, 502, {
          error: { type: 'upstream_error', message: err.message },
        });
      } else {
        res.destroy();
      }
    });

    upstream.end(bodyBuf);
  });
}

const server = http.createServer((req, res) => {
  // Lightweight health endpoint so Docker/K8s probes can hit the proxy too.
  if (req.url === '/healthz' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('ok\n');
    return;
  }
  // AI assistant terminates here — do NOT forward to Vite.
  if (req.url === '/api/ai/chat') {
    handleAiChat(req, res);
    return;
  }
  proxy.web(req, res);
});

// Forward WebSocket upgrades (HMR, @vite/client).
server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head);
});

server.listen(PORT, HOST, () => {
  console.log(`[proxy] listening on http://${HOST}:${PORT}`);
  console.log(`[proxy] forwarding to ${TARGET}`);
  console.log(
    `[proxy] /api/ai/chat -> ${ANTHROPIC_HOST}${ANTHROPIC_PATH} (${
      ANTHROPIC_API_KEY ? 'auth ON' : 'DISABLED: ANTHROPIC_API_KEY not set'
    })`,
  );
});

// Graceful shutdown so Ctrl+C / `docker stop` don't leave sockets dangling.
function shutdown(signal) {
  console.log(`[proxy] received ${signal}, shutting down.`);
  server.close(() => process.exit(0));
  // Hard kill after 5s if close hangs (e.g., long-lived WS).
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));