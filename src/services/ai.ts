// AI Assistant backend for EdgeOne Pricing Calculator.
//
// Transport model:
//   Browser  →  /api/ai/chat   (same-origin — no CORS issues)
//       ↓      (Vite dev proxy or nginx reverse proxy)
//   Upstream AI →  https://api.anthropic.com/v1/messages
//
// Why route through a server-side proxy instead of calling the upstream
// directly from the browser?
//   1. The upstream API is NOT CORS-enabled for arbitrary browser origins
//      and requires a bearer-style key header that we must not leak.
//   2. Keeping the key on the server side (in nginx / dev proxy env vars)
//      means it never ships with the static client bundle.
//
// The browser speaks the **Claude Messages API** shape
// (https://docs.anthropic.com/en/api/messages) and the server-side proxy
// relays the request 1:1 after injecting auth headers.

import { SERVICE_ITEMS } from '../data/pricing';

// Same-origin path. Nginx (prod) / node proxy (dev) forwards to the upstream.
const AI_CHAT_PATH = '/api/ai/chat';

// Upstream model. Model **names** are not secret (unlike keys) so shipping
// this in the bundle is fine; keep it tweakable from a single place here.
const AI_MODEL = 'claude-haiku-4-5';

// The AI Assistant UI is always shown. The server may still refuse the call
// if the upstream key is not configured — in that case the UI surfaces a
// clear error message to the user.
export function isAiConfigured(): boolean {
  return true;
}

// Shape returned by the AI to the calculator UI.
export interface AiRecommendation {
  serviceId: string;
  quantity: number;
  region?: string;
  displayUnit?: 'GB' | 'TB' | 'PB';
  reasoning?: string;
}

// System prompt describing the catalog. Built once per process.
let _catalogContext: string | null = null;
function getCatalogContext(): string {
  if (_catalogContext !== null) return _catalogContext;

  const items = SERVICE_ITEMS.map((item) => {
    // Only ship fields the model needs — keeps the prompt small.
    return `- id="${item.id}" | name="${item.name}" (${item.nameZh}) | unit="${item.unit}" | category="${item.category}"`;
  }).join('\n');

  _catalogContext = `AVAILABLE SERVICES CATALOG:
${items}

VALID REGIONS:
- chinese_mainland (China)
- north_america
- europe
- asia_pacific_1 (HK, Japan, KR, SG)
- asia_pacific_2 (TH, ID, VN)
- asia_pacific_3 (India, AU)
- middle_east
- africa
- south_america`;

  return _catalogContext;
}

function buildSystemPrompt(): string {
  return `You are an intelligent pricing assistant for Tencent EdgeOne.
Your goal is to interpret the user's requirements and recommend specific services from the catalog below.

${getCatalogContext()}

INSTRUCTIONS:
1. Analyze the user's need and match it to the most appropriate "id" from the catalog.
2. If the user mentions "Plan" or a specific business size, recommend a Plan id (e.g., plan_personal, plan_enterprise).
3. If the user mentions traffic/bandwidth, recommend "l7_traffic" (default) or "l4_traffic" (only when TCP/UDP is mentioned).
4. Handle units intelligently. If the user says "5 TB", return quantity 5 and displayUnit "TB".
5. Default region is "chinese_mainland" unless specified otherwise.
6. Default quantity is 1 unless specified.
7. Return ONLY a valid JSON array. Do NOT wrap it in markdown code fences or any prose.

OUTPUT FORMAT (JSON Array):
[
  {
    "serviceId": "<string, must match an id above>",
    "quantity": <number>,
    "region": "<string, must match a region id above>",
    "displayUnit": "GB" | "TB" | "PB",   // optional, only for traffic items
    "reasoning": "<short explanation>"
  }
]`;
}

// Extract the first JSON array from a string. The model occasionally wraps
// output in code fences or prepends a short preamble despite the prompt,
// so we scan for the first `[...]` block.
function extractJsonArray(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf('[');
  const end = candidate.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    return candidate.slice(start, end + 1).trim();
  }
  return candidate.trim();
}

// Claude Messages API response shape — narrow to what we actually read.
interface ClaudeTextBlock {
  type: 'text';
  text: string;
}
interface ClaudeContentBlock {
  type: string;
  text?: string;
}
interface ClaudeMessagesResponse {
  content?: ClaudeContentBlock[];
  stop_reason?: string;
  error?: { type?: string; message?: string };
  type?: string;
}

function isTextBlock(b: ClaudeContentBlock): b is ClaudeTextBlock {
  return b.type === 'text' && typeof b.text === 'string';
}

export async function getAiRecommendations(
  userQuery: string,
  signal?: AbortSignal,
): Promise<AiRecommendation[]> {
  // Claude Messages API body — model name lives in code, the API key lives
  // in the server-side proxy env so it never reaches the browser bundle.
  const body = {
    model: AI_MODEL,
    max_tokens: 1024,
    // `system` is a top-level field in Claude's schema (not a message role).
    system: buildSystemPrompt(),
    messages: [
      { role: 'user', content: userQuery },
    ],
  };

  let response: Response;
  try {
    response = await fetch(AI_CHAT_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    // Re-throw AbortError untouched so the caller can ignore it silently.
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    const msg = e instanceof Error ? e.message : 'network error';
    throw new Error(`Cannot reach AI service: ${msg}`);
  }

  if (!response.ok) {
    // Try to surface the upstream error body for easier debugging.
    let detail = '';
    try {
      const text = await response.text();
      detail = text.slice(0, 300);
    } catch {
      /* ignore */
    }
    throw new Error(
      `AI service returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`
    );
  }

  const data = (await response.json()) as ClaudeMessagesResponse;
  if (data.error?.message) {
    throw new Error(`AI service error: ${data.error.message}`);
  }

  // Concatenate all text blocks — Messages API returns an array of blocks.
  const text = (data.content ?? [])
    .filter(isTextBlock)
    .map((b) => b.text)
    .join('')
    .trim();

  if (!text) {
    throw new Error('AI service returned an empty response');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonArray(text));
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'parse error';
    throw new Error(`Could not parse AI response as JSON: ${msg}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('AI response was not a JSON array');
  }

  // Best-effort shape validation — the caller (App.tsx) does another pass
  // to validate region IDs against the known set.
  return parsed.filter(
    (item): item is AiRecommendation =>
      !!item &&
      typeof item === 'object' &&
      typeof (item as AiRecommendation).serviceId === 'string' &&
      typeof (item as AiRecommendation).quantity === 'number'
  );
}
