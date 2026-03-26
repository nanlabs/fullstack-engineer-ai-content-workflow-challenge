import { CampaignDetail, CampaignSummary, ContentPiece, ProviderSettings } from "@/lib/types";

function getServerApiBaseUrl(): string {
  return (
    process.env.INTERNAL_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:8000"
  );
}

function getClientApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
}

export async function fetchCampaigns(): Promise<CampaignSummary[]> {
  const response = await fetch(`${getServerApiBaseUrl()}/campaigns`, { cache: "no-store" });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to fetch campaigns");
  }
  return response.json();
}

export async function fetchCampaign(campaignId: string): Promise<CampaignDetail> {
  const response = await fetch(`${getServerApiBaseUrl()}/campaigns/${campaignId}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to fetch campaign");
  }
  return response.json();
}

export async function fetchContentPiece(contentPieceId: string): Promise<ContentPiece> {
  const response = await fetch(`${getServerApiBaseUrl()}/content-pieces/${contentPieceId}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to fetch content piece");
  }
  return response.json();
}

export async function fetchProviderSettings(): Promise<ProviderSettings> {
  const response = await fetch(`${getServerApiBaseUrl()}/settings/ai-provider`, { cache: "no-store" });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to fetch provider settings");
  }
  return response.json();
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getClientApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }

  return response.json() as Promise<T>;
}

export function getEventsUrl(): string {
  return `${getClientApiBaseUrl()}/events`;
}
