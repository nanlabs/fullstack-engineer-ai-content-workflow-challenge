import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

import { API_ROUTES, DEFAULT_API_BASE_URL, UI_STRINGS } from "../constants/api";
import type { Campaign, ContentInput, ContentPiece } from "../types/content";

const POLL_INTERVAL_MS = 30_000;

function resolveApiBaseUrl(): string {
  const meta = import.meta as { env?: { VITE_API_BASE_URL?: string } };
  return (
    meta.env?.VITE_API_BASE_URL ??
    (globalThis as any).__API_BASE_URL__ ??
    DEFAULT_API_BASE_URL
  );
}

export function useCampaigns() {
  const baseURL = useMemo(() => resolveApiBaseUrl(), []);
  const api = useMemo(() => axios.create({ baseURL }), [baseURL]);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Campaign[]>(API_ROUTES.campaigns);
      setCampaigns(res.data);
    } catch (e: any) {
      console.error(e?.message ?? e);
      setError(UI_STRINGS.errors.fetchCampaigns);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    if (!document.hasFocus()) return;
    const t = setInterval(fetchCampaigns, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [fetchCampaigns]);

  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const url = `${baseURL}${API_ROUTES.events}`;
    const es = new EventSource(url);
    const onMsg = () => {
      void fetchCampaigns();
    };
    es.addEventListener("message", onMsg);
    return () => {
      es.removeEventListener("message", onMsg);
      es.close();
    };
  }, [baseURL, fetchCampaigns]);

  const createCampaign = useCallback(
    async (
      name: string,
      description: string,
      contents: ContentInput[]
    ) => {
      if (!name.trim()) return;

      try {
        await api.post<Campaign>(API_ROUTES.campaigns, {
          name,
          description: description || null,
          contents,
        });

        await fetchCampaigns();
      } catch {
        setError(UI_STRINGS.errors.createCampaign);
      }
    },
    [api, fetchCampaigns],
  );

  const generateDraft = useCallback(
    async (contentId: number) => {
      try {
        await api.post(API_ROUTES.aiDraft, { content_id: contentId });
        await fetchCampaigns();
      } catch {
        setError(UI_STRINGS.errors.generateDraft);
      }
    },
    [api, fetchCampaigns],
  );

  const translateContent = useCallback(
    async (contentId: number, targetLocale: string) => {
      if (!targetLocale.trim()) return;
      try {
        await api.post(API_ROUTES.aiTranslate, {
          content_id: contentId,
          target_locale: targetLocale.trim(),
        });
        await fetchCampaigns();
      } catch {
        setError(UI_STRINGS.errors.translate);
      }
    },
    [api, fetchCampaigns],
  );

  const saveEdit = useCallback(
    async (contentId: number, text: string) => {
      try {
        await api.patch(API_ROUTES.content(contentId), {
          ai_suggested_text: text,
        });
        await fetchCampaigns();
      } catch {
        setError(UI_STRINGS.errors.saveEdit);
      }
    },
    [api, fetchCampaigns],
  );

  const approveContent = useCallback(
    async (content: ContentPiece, textToApprove: string | null) => {
      try {
        await api.patch(API_ROUTES.content(content.id), {
          final_text: textToApprove ?? content.ai_suggested_text,
          review_state: "approved",
        });
        await fetchCampaigns();
      } catch {
        setError(UI_STRINGS.errors.approve);
      }
    },
    [api, fetchCampaigns],
  );

  const rejectContent = useCallback(
    async (content: ContentPiece) => {
      try {
        await api.patch(API_ROUTES.content(content.id), {
          review_state: "rejected",
        });
        await fetchCampaigns();
      } catch {
        setError(UI_STRINGS.errors.reject);
      }
    },
    [api, fetchCampaigns],
  );

  const runPipeline = useCallback(
    async (contentId: number, targetLocales: string[] = [], tone: string = "default") => {
      try {
        const res = await api.post("/ai/run-pipeline", {
          content_id: contentId,
          tone,
          target_locales: targetLocales,
        });
        await fetchCampaigns();
        return res.data;
      } catch {
        setError(UI_STRINGS.errors.runPipeline);
      }
    },
    [api, fetchCampaigns],
  );

  return {
    campaigns,
    loading,
    error,
    fetchCampaigns,
    createCampaign,
    generateDraft,
    translateContent,
    saveEdit,
    approveContent,
    rejectContent,
    runPipeline
  };
}

