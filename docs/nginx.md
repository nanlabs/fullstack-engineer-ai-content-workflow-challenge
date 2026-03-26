# nginx — Role and Configuration

## Overview

nginx serves two distinct responsibilities in this system, bundled into the single `frontend` Docker container:

1. **Static file server** — Serves the compiled React SPA (`index.html` + JS/CSS bundles).
2. **Reverse proxy** — Forwards all `/api/*` requests to the NestJS backend, keeping the browser on a single origin.

```
Browser
  │
  ├── GET /              → nginx → /usr/share/nginx/html/index.html
  ├── GET /campaign/123  → nginx → /usr/share/nginx/html/index.html  (SPA fallback)
  ├── GET /assets/app.js → nginx → /usr/share/nginx/html/assets/app.js
  │
  ├── POST /api/campaigns     → nginx → http://backend:3000/api/campaigns
  ├── GET  /api/events?token= → nginx → http://backend:3000/api/events  (SSE)
  └── ...
```

## Why nginx (not a Node.js dev server in production)

Vite's dev server (`npm run dev`) is intentionally not used in production containers. nginx is the correct tool for serving static files in production because:

- **Performance** — nginx serves static files at near-hardware-speed using kernel-level `sendfile()`. A Node.js file server adds unnecessary overhead.
- **Same-origin API calls** — Proxying `/api/*` through nginx means the browser sees all requests going to the same host and port. No CORS configuration is needed between the frontend and backend.
- **Separation** — The React build output is pure static files. nginx serves them without Node.js being installed or running in the production image.

## Docker Build — Multi-stage

```dockerfile
FROM node:20-alpine AS build   # Build stage: compile TypeScript → JS bundles
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build              # Output: /app/dist/

FROM nginx:alpine              # Runtime stage: only nginx + static assets
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

The final image contains **no Node.js** — only nginx and the compiled static files. This keeps the production image small and eliminates the Node.js runtime from the attack surface.

## Configuration Breakdown

Full config lives in [`frontend/nginx.conf`](../frontend/nginx.conf).

### Security Headers

```nginx
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header Referrer-Policy strict-origin-when-cross-origin always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header X-XSS-Protection "1; mode=block" always;
```

| Header | Purpose |
|--------|---------|
| `X-Frame-Options: DENY` | Blocks the app from being embedded in an `<iframe>` — prevents clickjacking attacks |
| `X-Content-Type-Options: nosniff` | Prevents browsers from MIME-sniffing responses away from the declared `Content-Type` |
| `Referrer-Policy: strict-origin-when-cross-origin` | Sends the full URL as referrer on same-origin requests; only the origin on cross-origin requests; nothing on downgrade (HTTPS → HTTP) |
| `Permissions-Policy` | Explicitly disables camera, microphone, and geolocation APIs — the app doesn't use them, so there's no reason to leave them accessible |
| `X-XSS-Protection: 1; mode=block` | Enables browser XSS auditor on older browsers that don't support CSP |

> Note: `Strict-Transport-Security` (HSTS) is intentionally omitted. The Docker Compose setup runs over HTTP for local development. In production, HSTS should be added at the TLS termination layer (load balancer, ingress controller) where HTTPS is enforced.

### SPA Fallback — `location /`

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

React Router handles navigation client-side. When a user refreshes or directly visits `/campaign/abc-123`, nginx would normally return a 404 (no server-side route exists). `try_files` instructs nginx to:

1. Try to find an exact file matching the path (`$uri`) — e.g., `/assets/app.js`
2. Try a directory — e.g., `/assets/`
3. Fall back to `/index.html` — hands control to React Router

Without this, any hard refresh or direct link to a non-root route would result in a blank 404 page.

### Standard API Proxy — `location /api`

```nginx
location /api {
  proxy_pass http://backend:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection 'upgrade';
  proxy_set_header Host $host;
  proxy_cache_bypass $http_upgrade;
  proxy_read_timeout 180s;
  proxy_connect_timeout 10s;
  proxy_send_timeout 60s;
}
```

Forwards all `/api/*` requests to the backend service. Key settings:

- **`proxy_http_version 1.1`** — Required for `Connection: keep-alive` and WebSocket upgrades. HTTP/1.0 would close the connection after each request.
- **`Upgrade` / `Connection` headers** — Passed through to support the WebSocket upgrade handshake. Not used currently (we use SSE), but kept for forward compatibility.
- **`Host $host`** — Forwards the original `Host` header so the backend sees the client's hostname, not `backend:3000`.
- **Timeouts** — `proxy_read_timeout 180s` gives AI endpoint calls (LLM chains can take 10-30+ seconds) enough time to respond without nginx closing the connection.

### SSE Proxy — `location /api/events`

This block is registered **before** `location /api` so it takes priority via nginx's longest-match rule.

```nginx
location /api/events {
  proxy_pass http://backend:3000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header Connection '';
  proxy_buffering off;
  proxy_cache off;
  chunked_transfer_encoding off;
  proxy_read_timeout 86400s;
  proxy_send_timeout 86400s;
}
```

Server-Sent Events require special handling because they are **long-lived streaming responses**, not a standard request/response:

| Setting | Why |
|---------|-----|
| `proxy_buffering off` | Nginx buffers proxied responses by default. Buffering would swallow SSE events until the buffer fills, breaking real-time delivery. Disabled here so each event is flushed immediately. |
| `proxy_cache off` | Ensures the SSE stream is never cached at any level. |
| `chunked_transfer_encoding off` | SSE uses `text/event-stream`, not chunked encoding. This prevents nginx from re-encoding the response. |
| `Connection ''` | Clears the `Connection: upgrade` header set by the outer config. SSE uses a persistent HTTP/1.1 keep-alive, not a protocol upgrade. |
| `proxy_read_timeout 86400s` | SSE connections stay open for the entire user session (up to 24 hours). Without this, nginx would close idle connections after its default 60-second timeout, forcing constant reconnects. |

## Local Development — nginx is NOT used

nginx is a production-only concern. In local development, Vite's built-in dev server takes its place and provides the same two responsibilities.

### How it works

There are two ways to run the stack locally:

**Option A — `docker compose -f compose.dev.yml up`**

The `frontend` service runs the raw Node.js dev server instead of an nginx container:

```yaml
# compose.dev.yml
frontend:
  image: node:20-alpine
  command: sh -c "npm install && npm run dev -- --host 0.0.0.0 --port 80"
  environment:
    API_URL: http://backend:3000
```

Vite starts on port 80 (mapped to `8080` on the host), and its built-in proxy rewrites `/api/*` requests to the backend container — the same same-origin technique nginx uses in production.

**Option B — running processes directly (no Docker for frontend)**

```bash
cd frontend && npm run dev   # starts Vite on http://localhost:5173
```

Vite reads the proxy config from [`vite.config.ts`](../frontend/vite.config.ts):

```typescript
server: {
  proxy: {
    '/api/events': {
      target: process.env.API_URL || 'http://localhost:3000',
      changeOrigin: true,
      timeout: 0,          // SSE: no timeout, no buffering
    },
    '/api': {
      target: process.env.API_URL || 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

### Vite dev server vs nginx — comparison

| Responsibility | Production (nginx) | Local dev (Vite) |
|---------------|-------------------|-----------------|
| Serve SPA static files | ✅ Compiled `dist/` from disk | ✅ In-memory, with HMR |
| Proxy `/api/*` to backend | ✅ `proxy_pass http://backend:3000` | ✅ `proxy: { '/api': { target: ... } }` |
| SSE proxy (`/api/events`) | ✅ Special block: buffering off, 24h timeout | ✅ `timeout: 0` in proxy config |
| Security headers | ✅ `add_header` directives | ❌ Not set — dev only, no public exposure |
| SPA fallback (`/index.html`) | ✅ `try_files $uri /index.html` | ✅ Built-in to Vite dev server |
| Hot Module Replacement (HMR) | ❌ Static files only | ✅ Instant UI updates on save |
| Build step required | ✅ Yes (`npm run build`) | ❌ No — serves source directly |

### Why not run nginx locally?

- **HMR** — Vite's hot module replacement gives instant feedback during development. nginx serves compiled static files with no live reload.
- **Source maps** — Vite serves unminified source with full source maps. nginx would serve the compiled bundle.
- **Speed** — No build step means changes are reflected in the browser within milliseconds.

The parity between `vite.config.ts` and `nginx.conf` is intentional — both configs handle the same routing logic (same-origin API proxy, SSE streaming) so local behaviour matches production.

## Same-Origin Architecture

Within Docker Compose, the frontend container runs on port `8080` (host) → port `80` (container). The backend runs on port `3000`. From the browser's perspective:

```
http://localhost:8080/          → React SPA
http://localhost:8080/api/...   → NestJS backend (via nginx proxy)
```

Both appear to be on the same origin (`localhost:8080`). This means:
- **No CORS headers needed** on the backend for browser requests — they originate from the same origin.
- **Cookies (if used)** would be scoped to `localhost:8080` — no cross-origin cookie issues.
- **The browser's `EventSource`** for SSE connects to `localhost:8080/api/events` — same origin.

The backend's CORS configuration (`FRONTEND_URL` env var) is still set up correctly for scenarios where the backend is accessed directly (e.g., from another service or a mobile app), but browser traffic always goes through nginx.
