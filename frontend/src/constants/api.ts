export const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const API_ROUTES = {
  campaigns: "/campaigns",
  events: "/events",
  aiDraft: "/ai/generate-draft",
  aiTranslate: "/ai/translate",
  aiCompareModels: "/ai/compare-models",
  content: (id: number) => `/contents/${id}`,
} as const;

export const UI_STRINGS = {
  errors: {
    fetchCampaigns: "Error fetching campaigns",
    createCampaign: "Error creating campaign",
    generateDraft: "Error generating AI draft",
    translate: "Error translating content",
    saveEdit: "Error saving edit",
    approve: "Error approving content",
    reject: "Error rejecting content",
    runPipeline: "Error running pipeline",
  },
} as const;

