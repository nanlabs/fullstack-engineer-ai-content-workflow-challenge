import { useMutation, useQuery } from "@tanstack/react-query";
import { del, get, patch, post } from "@/api/client";
import { queryClient } from "@/lib/query-client";
import type {
  Campaign,
  CampaignCreate,
  CampaignDetail,
  CampaignUpdate,
  PaginatedResponse,
} from "./types";

export const campaignsApi = {
  list: () => get<PaginatedResponse<Campaign>>("/api/campaigns"),
  detail: (id: string) => get<CampaignDetail>(`/api/campaigns/${id}`),
  create: (body: CampaignCreate) => post<Campaign>("/api/campaigns", body),
  update: (id: string, body: CampaignUpdate) => patch<Campaign>(`/api/campaigns/${id}`, body),
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

export function useUpdateCampaign(id: string) {
  return useMutation({
    mutationFn: (body: CampaignUpdate) => campaignsApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.list() });
    },
  });
}

export function useDeleteCampaign() {
  return useMutation({
    mutationFn: campaignsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.list() });
    },
  });
}
