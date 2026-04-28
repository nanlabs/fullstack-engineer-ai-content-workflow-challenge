import { http, HttpResponse } from "msw";

const BASE = "http://localhost:8000";

const mockCampaign = {
  id: "camp-1",
  name: "Spring Sale 2026",
  brief: "New spring collection launch targeting young adults.",
  source_language: "en",
  target_languages: ["es", "fr"],
  content_pieces_count: 2,
  created_at: new Date(Date.now() - 7200_000).toISOString(),
  updated_at: new Date(Date.now() - 7200_000).toISOString(),
};

export const handlers = [
  http.get(`${BASE}/api/campaigns`, () =>
    HttpResponse.json({
      items: [mockCampaign],
      total: 1,
      limit: 20,
      offset: 0,
    })
  ),

  http.post(`${BASE}/api/campaigns`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      {
        id: "camp-new",
        name: body.name,
        brief: body.brief ?? null,
        source_language: body.source_language ?? "en",
        target_languages: body.target_languages ?? [],
        content_pieces_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),
];
