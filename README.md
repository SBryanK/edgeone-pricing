# EdgeOne Pricing Calculator

A pricing estimation tool for **Tencent Cloud EdgeOne** with a service catalog,
draft-based scenarios, tiered regional pricing, side-by-side comparison, and an
optional AI assistant for natural-language quote generation.

> **Status:** internal reference tool. Prices are derived from public
> documentation and may not reflect negotiated enterprise discounts or
> official quotes. See [Disclaimer](#disclaimer).

---

## Features

### Core
- **Service catalog + estimate slip** — browse EdgeOne services on the left,
  build an estimate on the right.
- **Drag & drop** — drag services into the estimate; drag an estimate row into
  the trash zone to remove it.
- **Drafts** — create multiple named scenarios, rename them, switch between
  them. Persisted in `localStorage`.
- **Compare mode** — view 2–3 drafts side by side, move items between them,
  merge a draft into another.
- **Tiered regional pricing** — L7 / L4 traffic uses per-region tiered pricing
  across 9 regions.
- **Discounts** — global discount per draft, or per-item discount mode.
- **Regional details** — region breakdown modal for each traffic service.
- **i18n** — English, 中文, 한국어, 日本語, Bahasa Indonesia.
- **Exports** — CSV (UTF-8 BOM so Excel opens CJK correctly), JSON, Excel.
- **Password-gated entry** — simple client-side gate via `VITE_APP_PASSWORD`
  (not a real auth boundary; put behind SSO for anything sensitive).

### AI Assistant
Natural-language recommendations. The widget is always visible; if the server
is not configured with an API key, users see a clear error when they submit a
prompt, and the rest of the app is unaffected.

**How it works.** The browser posts a Messages-API-shaped body to the
same-origin path `/api/ai/chat`. A server-side proxy (nginx in the Docker
image, a Vercel serverless function on Vercel, a Node relay in dev) injects
the upstream auth header and forwards to the model provider. The API key
lives on the server and never ships in the client bundle.

---

## Tech stack
- **React 19** + **Vite 7** + **TypeScript 5.9**
- **Tailwind CSS 4** (via `@tailwindcss/vite`)
- **@dnd-kit/core + sortable** for drag-and-drop
- **@headlessui/react** for accessible primitives
- **Lucide** icons
- **Vitest 4** for unit tests
- **ESLint 9** (flat config) with `typescript-eslint`

---

## Quick start (local dev)

```bash
# 1. Install deps
npm ci

# 2. Copy env template and fill in values
cp .env.example .env
# edit .env:
#   VITE_APP_PASSWORD=<choose a password>
#   ANTHROPIC_API_KEY=<your key, optional — disables AI if empty>

# 3. Run the Vite dev server + the Node proxy that terminates /api/ai/chat
npm run start           # → http://localhost:8080

# OR run Vite alone (AI assistant will 404 without the proxy)
npm run dev             # → http://localhost:5174
```

---

## Deployment

Three supported paths, pick whichever matches your infra.

### A. Vercel (recommended for public hosting)

The repo ships with `vercel.json` + a serverless function at
[`api/ai/chat.ts`](./api/ai/chat.ts) that proxies to the AI provider.

1. **Push to GitHub** (or any git host Vercel supports).
2. In Vercel: **Add New → Project**, import the repo.
3. **Framework preset** is auto-detected as *Vite*.
4. **Environment Variables** → add:
   - `ANTHROPIC_API_KEY` — your key (Production + Preview + Development)
   - `VITE_APP_PASSWORD` — login password (Production + Preview + Development)

   > `VITE_APP_PASSWORD` is baked into the client bundle at build time, so it
   > must be set *before* the first build. `ANTHROPIC_API_KEY` is read at
   > request time by the serverless function and never reaches the browser.

5. **Deploy**. Subsequent pushes to `main` auto-deploy.

### B. Vercel + EdgeOne CDN (CNAME access)

Put EdgeOne in front of the Vercel deployment so visitors hit EdgeOne's edge,
which forwards cacheable traffic to Vercel as the origin.

1. In **Vercel → Project → Settings → Domains**, add your custom domain
   (e.g. `calc.example.com`). Vercel will prompt for a CNAME — note the
   target (usually `cname.vercel-dns.com`).
2. In **EdgeOne Console → Domain Management**, add the same domain as an
   *accelerated domain* with origin type **Domain Name** pointing at Vercel's
   CNAME target. Enable HTTPS (auto-issue cert).
3. At your DNS provider, point your custom domain's CNAME at the **EdgeOne**
   acceleration CNAME (EdgeOne console shows the exact target).
4. In EdgeOne, create a **rule** to not cache `/api/*` (serverless responses
   are per-request, not cacheable), but let `/assets/*` inherit the long
   `Cache-Control: public, max-age=31536000, immutable` from `vercel.json`.

Request flow: `visitor → EdgeOne edge → Vercel origin → (static from CDN
cache) OR (/api/ai/chat → serverless function → Anthropic)`.

### C. Self-hosted Docker (nginx)

```bash
# Build with the login password baked in (it's public — users need to type it).
docker build --build-arg VITE_APP_PASSWORD=<pass> -t edgeone-calc .

# Run with the AI key supplied at runtime (kept off the image).
docker run -d --name edgeone-calc --restart unless-stopped \
  -p 80:8080 \
  -e ANTHROPIC_API_KEY=<key> \
  --tmpfs /var/cache/nginx --tmpfs /var/run --tmpfs /tmp \
  edgeone-calc
```

The container renders [`nginx.conf`](./nginx.conf) with the API key at
startup via `envsubst`, then runs nginx on port 8080 (exposed as 80 on the
host). `/api/ai/chat` is proxied to `api.anthropic.com` with auth headers
injected server-side.

---

## Environment variables

| Name                 | Scope        | Used by                               | Notes                                                                    |
|----------------------|--------------|---------------------------------------|--------------------------------------------------------------------------|
| `VITE_APP_PASSWORD`  | build-time   | client bundle (login gate)            | Baked into the static build. Required at build time.                     |
| `ANTHROPIC_API_KEY`  | runtime      | nginx / serverless / dev node proxy   | Never reaches the browser. If empty, AI assistant returns a 503.         |

See [`.env.example`](./.env.example) for a template.

---

## Project layout

```
.
├── api/ai/chat.ts            # Vercel serverless function (AI proxy)
├── nginx.conf                # Docker prod config (also an AI proxy)
├── reverse-proxy.js          # Local dev AI proxy + Vite forwarder
├── src/
│   ├── components/           # UI building blocks (catalog, estimate, AI, …)
│   ├── data/pricing.ts       # Service catalog + per-region price tables
│   ├── hooks/useCalculator.ts
│   ├── services/ai.ts        # Browser-side AI client (talks to /api/ai/chat)
│   ├── types/                # Shared TS types (Region, Language, …)
│   └── utils/                # Pure calc + export helpers
├── Dockerfile                # Multi-stage Vite build → nginx runtime
├── docker-compose.yml
└── vercel.json               # SPA rewrite + function config + headers
```

---

## Scripts

| Script              | What it does                                            |
|---------------------|---------------------------------------------------------|
| `npm run dev`       | Vite dev server on :5174 (AI needs the proxy — see `start`) |
| `npm run start`     | Vite + Node proxy on :8080 (terminates `/api/ai/chat`)  |
| `npm run build`     | `tsc -b && vite build` → `dist/`                        |
| `npm run preview`   | Serve `dist/` locally                                   |
| `npm run test`      | Vitest (run-once)                                       |
| `npm run test:watch`| Vitest in watch mode                                    |
| `npm run lint`      | ESLint                                                  |
| `npm run typecheck` | `tsc --noEmit`                                          |

---

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues:
DevCloud port access, Docker permissions, nginx DNS resolver, AI 502s, etc.

---

## Disclaimer

Pricing in this tool is **indicative**. It is derived from public
documentation and does not reflect negotiated enterprise discounts or
official quotes. For contractual pricing, contact your Tencent Cloud account
manager.

No warranty is provided; use at your own risk.

---

## License

Internal tool — no open-source license granted. Do not redistribute the
pricing data without permission.
