# Spec 07 — Frontend Foundation

## Goal

Set up the frontend so the next pages (specs 08-09) are quick to write: routing ready, HTTP client ready, TanStack Query configured, SSE hook ready, base layout, theme.

## Out of scope

- Campaigns and dashboard pages (spec 08).
- Review and diff UI (spec 09).

## Starting state

After spec 00 we have: Vite 8 + React 19 + TS + Tailwind v4 + shadcn installed, an `App.tsx` page with a demo button. Here we add all the infrastructure.

## Target structure

```
frontend/src/
├── main.tsx
├── App.tsx                       # router + providers
├── index.css                     # @import "tailwindcss" + @theme + shadcn vars
├── api/
│   ├── client.ts                 # fetch wrapper
│   ├── campaigns.ts              # CRUD calls + react-query hooks
│   ├── content-pieces.ts
│   ├── drafts.ts
│   ├── workflows.ts
│   └── types.ts                  # types shared with backend
├── lib/
│   ├── utils.ts                  # cn(), formatters
│   ├── hooks/
│   │   ├── use-event-stream.ts
│   │   └── use-toast.ts
│   └── query-client.ts           # TanStack Query configuration
├── components/
│   ├── ui/                       # shadcn components
│   └── layout/
│       ├── app-shell.tsx
│       ├── header.tsx
│       └── sidebar.tsx
├── features/                     # feature folders populated in specs 08-09
│   ├── campaigns/
│   ├── content-pieces/
│   ├── drafts/
│   └── workflows/
├── pages/
│   ├── campaigns-list.tsx
│   ├── campaign-detail.tsx
│   ├── content-piece-detail.tsx
│   └── not-found.tsx
└── types/
    └── api.ts                    # generated (or hand-written) types
```

## Routing

`react-router` v7 (the unified package; `react-router-dom` no longer exists separately).

```tsx
// App.tsx
import { createBrowserRouter, RouterProvider, Navigate } from "react-router";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/campaigns" /> },
      { path: "campaigns", element: <CampaignsListPage /> },
      { path: "campaigns/:id", element: <CampaignDetailPage /> },
      { path: "content-pieces/:id", element: <ContentPieceDetailPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
```

## HTTP client

`src/api/client.ts`:

```ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = body?.error ?? { code: "UNKNOWN", message: res.statusText };
    throw new ApiError(err.code, res.status, err.message, err.details);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
```

Helpers:
```ts
export const get = <T>(path: string) => api<T>(path);
export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body) });
export const patch = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const del = (path: string) => api(path, { method: "DELETE" });
```

## TanStack Query (v5.99+)

`src/lib/query-client.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return count < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (err) => {
        if (err instanceof ApiError) {
          toast.error(err.message);
        }
      },
    },
  },
});
```

Wrap in `App.tsx`:
```tsx
<QueryClientProvider client={queryClient}>
  <RouterProvider router={router} />
  <Toaster />
</QueryClientProvider>
```

### Hooks per feature

`src/api/campaigns.ts`:

```ts
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Campaign, CampaignCreate, CampaignDetail, PaginatedResponse } from "./types";

export const campaignsApi = {
  list: () => get<PaginatedResponse<Campaign>>("/api/campaigns"),
  detail: (id: string) => get<CampaignDetail>(`/api/campaigns/${id}`),
  create: (body: CampaignCreate) => post<Campaign>("/api/campaigns", body),
  update: (id: string, body: Partial<CampaignCreate>) =>
    patch<Campaign>(`/api/campaigns/${id}`, body),
  remove: (id: string) => del(`/api/campaigns/${id}`),
};

export const campaignKeys = {
  all: ["campaigns"] as const,
  list: () => [...campaignKeys.all, "list"] as const,
  detail: (id: string) => [...campaignKeys.all, "detail", id] as const,
};

export function useCampaigns() {
  return useQuery({
    queryKey: campaignKeys.list(),
    queryFn: campaignsApi.list,
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: campaignKeys.detail(id),
    queryFn: () => campaignsApi.detail(id),
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  return useMutation({
    mutationFn: campaignsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.list() });
    },
  });
}
```

Mirror the same shape for `content-pieces.ts`, `drafts.ts`, `workflows.ts`.

## Types shared with backend

Options:
1. **Generate from OpenAPI** of the backend with `openapi-typescript`. Nice but adds a build step.
2. **Hand-write them** copying the shape. Simple, enough for 3 days.

Recommendation: hand-written. Keep it simple.

`src/api/types.ts`:

```ts
export type ContentPieceType = "headline" | "description" | "cta" | "body";
export type DraftStatus = "draft" | "suggested" | "reviewed" | "approved" | "rejected";
export type WorkflowStatus = "pending" | "running" | "awaiting_human" | "completed" | "failed";
export type ReviewAction = "approve" | "reject" | "edit" | "regenerate";

export interface Campaign {
  id: string;
  name: string;
  brief: string | null;
  target_languages: string[];
  source_language: string;
  created_at: string;
  updated_at: string;
  content_pieces_count: number;
}

// ... etc
```

> If you have spare time at the end, add `openapi-typescript` with a script and switch everything to generated. But not as part of this spec.

## SSE hook

`src/lib/hooks/use-event-stream.ts`:

```ts
import { useEffect, useRef } from "react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type EventHandler = (event: { type: string; payload: any; [k: string]: any }) => void;

export function useEventStream(
  url: string | null,
  handler: EventHandler,
  enabled: boolean = true,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!url || !enabled) return;
    const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
    const es = new EventSource(fullUrl);

    const onAny = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        handlerRef.current({ type: e.type, ...data });
      } catch (err) {
        console.warn("Failed to parse SSE event", err);
      }
    };

    const types = [
      "workflow.started",
      "workflow.node.started",
      "workflow.node.completed",
      "workflow.tokens",
      "workflow.draft.created",
      "workflow.awaiting_human",
      "workflow.resumed",
      "workflow.completed",
      "workflow.failed",
      "draft.updated",
    ];
    for (const t of types) es.addEventListener(t, onAny as EventListener);
    es.onerror = () => {
      console.debug("SSE error, browser will reconnect");
    };

    return () => {
      for (const t of types) es.removeEventListener(t, onAny as EventListener);
      es.close();
    };
  }, [url, enabled]);
}
```

Typical use:

```tsx
useEventStream(
  campaignId ? `/api/campaigns/${campaignId}/events` : null,
  (event) => {
    if (event.type.startsWith("workflow.") || event.type.startsWith("draft.")) {
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
    }
    if (event.type === "workflow.tokens") {
      setStreamingText((prev) => prev + event.payload.delta);
    }
  },
);
```

## Base layout

`src/components/layout/app-shell.tsx`:

```tsx
import { Outlet } from "react-router";

export function AppShell() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

`Header`: "ACME GLOBAL MEDIA" logo, title, SSE connection indicator (green/red).
`Sidebar`: campaign list (loads via `useCampaigns`), "New campaign" button.

shadcn components already installed to use: `Button`, `Card`, `Input`, `Textarea`, `Badge`, `Dialog`, `Tabs`, `Skeleton`, plus `sonner` for toasts.

In this spec, additionally install:
```bash
pnpm dlx shadcn@latest add select dropdown-menu sheet alert-dialog tooltip separator sonner
```

## Theme

shadcn already ships CSS vars in `index.css`. Don't tweak much. Use the "Slate" or "Stone" theme.
Dark mode is optional (toggle in header) — looks nice but not critical.

For Tailwind v4, the theme block looks like:

```css
@import "tailwindcss";

@theme {
  --color-background: hsl(0 0% 100%);
  --color-foreground: hsl(240 10% 3.9%);
  /* shadcn-generated tokens */
}

@layer base {
  :root { /* shadcn vars */ }
  .dark { /* shadcn dark vars */ }
}
```

## Tests

`src/lib/hooks/use-event-stream.test.ts`:

- Mock `global.EventSource` with a fake class.
- Assert listeners attach when `enabled=true`.
- Assert cleanup on unmount.

`src/api/client.test.ts`:

- Mock `fetch` with MSW or vitest mock.
- Assert `ApiError` is raised correctly with backend's shape.
- Assert 204 returns undefined.

Smoke test:
```ts
test("App renders without crashing", () => {
  render(<App />);
  expect(screen.getByText(/ACME/i)).toBeInTheDocument();
});
```

## Acceptance criteria

- [x] Navigating to `/` redirects to `/campaigns`.
- [x] The sidebar shows an empty list with "No campaigns yet" message (real listing is spec 08).
- [x] The header shows the SSE indicator (may be gray if no campaign is selected yet).
- [x] React Query devtools (in dev) show active queries.
- [x] Backend types (`Campaign`, `Draft`, etc.) defined in `src/api/types.ts`.
- [x] Tests pass.

## Suggested commit plan

```
feat(web): integrate react-router with app shell layout
feat(web): add api client and tanstack query setup
feat(web): define backend types in api/types.ts
feat(web): campaigns api hooks
feat(web): content-pieces, drafts, workflows api hooks
feat(web): use-event-stream hook with sse
feat(web): app shell with header and sidebar
test(web): api client error handling
test(web): use-event-stream lifecycle
```

## Deviations from spec (implemented 2026-04-28)

- `src/vite-env.d.ts` with `/// <reference types="vite/client" />` was required — the spec did not mention it but the project scaffolding omitted it, breaking `import.meta.env` types.
- `@tanstack/react-query-devtools` had to be installed explicitly (it was not in the original `package.json`).
- `<TooltipProvider>` added at app root — required by shadcn's tooltip component; mentioned in the CLI's post-install output.
- `CreateCampaignDialog` lives under `src/features/campaigns/` and is imported by `Sidebar` — spec did not prescribe the exact location; feature folder is cleaner than embedding form logic in layout.
- `Header`'s SSE indicator is a controlled component accepting a `sseConnected: boolean | null` prop — actual SSE connection state wiring deferred to specs 08–09 where campaign context is available.
- `src/types/api.ts` re-exports from `src/api/types.ts` via `export type *` — avoids duplication between the two paths the spec listed.

## Notes

- `EventSource` does not allow custom headers — if you ever add auth, go via cookie. Document.
- `staleTime: 30_000` avoids unnecessary refetches when navigating between pages. But **invalidation via SSE** refreshes when needed.
- TanStack Query and SSE are complementary: SSE is the push, Query is the cache. Don't conflate them.
- shadcn `<Toaster />` (now from `sonner` by default) must be in the React tree for `toast.error()` to work.
- If the backend is not running, you'll see a lot of console errors — that's expected. The client should not fail silently.
- React Router v7: imports come from `react-router`, not `react-router-dom`. `<Outlet />`, `<Navigate />`, `createBrowserRouter`, etc.
