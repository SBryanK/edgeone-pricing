// Vercel serverless function: POST /api/ai/chat
//
// The browser-side AI Assistant posts a Claude Messages API body here. We
// relay it 1:1 to https://api.anthropic.com/v1/messages after injecting the
// required auth + versioning headers from env vars. Keeping the key on the
// server means it never reaches the static bundle shipped to the browser.
//
// Required environment variables (set in Vercel Project \u2192 Settings \u2192 Env):
//   ANTHROPIC_API_KEY  \u2014 secret, scoped to Claude Messages API
//
// Runtime: Node (default). We read the raw body via req.on('data') rather
// than req.body so that we do not depend on Vercel's body parser behaviour
// and can enforce our own payload size limit.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import https from 'node:https';

// 64 kB is plenty: catalog-stuffed system prompt (~5 kB) + 1 kB user text.
const MAX_BODY_BYTES = 64 * 1024;

function sendJson(res: VercelResponse, status: number, payload: unknown) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.send(JSON.stringify(payload));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end();
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    sendJson(res, 503, {
      error: {
        type: 'not_configured',
        message: 'AI assistant is not configured on this server (ANTHROPIC_API_KEY missing).',
      },
    });
    return;
  }

  // Collect the body. Vercel may have already parsed it into req.body; if
  // so, re-serialize. Otherwise stream the raw bytes with a hard cap.
  let bodyBuf: Buffer;
  if (req.body && typeof req.body === 'object') {
    try {
      bodyBuf = Buffer.from(JSON.stringify(req.body), 'utf8');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'serialise error';
      sendJson(res, 400, { error: { type: 'bad_request', message: msg } });
      return;
    }
  } else if (typeof req.body === 'string') {
    bodyBuf = Buffer.from(req.body, 'utf8');
  } else {
    try {
      bodyBuf = await readRawBody(req);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'stream error';
      const code = msg === 'payload_too_large' ? 413 : 400;
      sendJson(res, code, {
        error: { type: code === 413 ? 'payload_too_large' : 'bad_request', message: msg },
      });
      return;
    }
  }

  if (bodyBuf.length > MAX_BODY_BYTES) {
    sendJson(res, 413, {
      error: { type: 'payload_too_large', message: `Request body exceeds ${MAX_BODY_BYTES} bytes.` },
    });
    return;
  }

  // Relay to Anthropic. We use the low-level https module rather than fetch
  // so that we can stream the upstream response straight back to the client
  // without buffering a potentially large completion.
  await new Promise<void>((resolve) => {
    const upstream = https.request(
      {
        host: 'api.anthropic.com',
        port: 443,
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'content-length': bodyBuf.length,
          accept: 'application/json',
          'user-agent': 'edgeone-pricing-calculator/1.0',
        },
        timeout: 60_000,
      },
      (upstreamRes) => {
        // Relay only safe headers. Drop Set-Cookie and hop-by-hop headers.
        const ct = upstreamRes.headers['content-type'];
        if (typeof ct === 'string') res.setHeader('Content-Type', ct);
        res.setHeader('Cache-Control', 'no-store');
        res.status(upstreamRes.statusCode ?? 502);

        upstreamRes.on('data', (chunk) => res.write(chunk));
        upstreamRes.on('end', () => {
          res.end();
          resolve();
        });
        upstreamRes.on('error', (err) => {
          console.error('[ai] upstream stream error:', err.message);
          if (!res.headersSent) {
            sendJson(res, 502, {
              error: { type: 'upstream_error', message: err.message },
            });
          } else {
            try { res.end(); } catch { /* ignore */ }
          }
          resolve();
        });
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
      }
      resolve();
    });

    upstream.end(bodyBuf);
  });
}

function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error('payload_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
