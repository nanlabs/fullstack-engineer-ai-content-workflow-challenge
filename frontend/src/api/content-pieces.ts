import { useMutation, useQuery } from "@tanstack/react-query";
import { del, get, patch, post } from "@/api/client";
import { queryClient } from "@/lib/query-client";
import { campaignKeys } from "./campaigns";
import type {
  ContentPieceCreate,
  ContentPieceDetail,
  ContentPieceUpdate,
  GenerateRequest,
  GenerateResponse,
} from "./types";

export const contentPiecesApi = {
  detail: (id: string) => get<ContentPieceDetail>(`/api/content-pieces/${id}`),
  create: (campaignId: string, body: ContentPieceCreate) =>
    post<ContentPieceDetail>(`/api/campaigns/${campaignId}/content-pieces`, body),
  update: (id: string, body: ContentPieceUpdate) =>
    patch<ContentPieceDetail>(`/api/content-pieces/${id}`, body),
  remove: (id: string) => del(`/api/content-pieces/${id}`),
  generate: (id: string, body?: GenerateRequest) =>
    post<GenerateResponse>(`/api/content-pieces/${id}/generate`, body),
};

export const contentPieceKeys = {
  all: ["content-pieces"] as const,
  detail: (id: string) => [...contentPieceKeys.all, "detail", id] as const,
  byCampaign: (campaignId: string) =>
    [...contentPieceKeys.all, "byCampaign", campaignId] as const,
};

export function useContentPiece(id: string) {
  return useQuery({
    queryKey: contentPieceKeys.detail(id),
    queryFn: () => contentPiecesApi.detail(id),
    enabled: !!id,
  });
}

export function useCreateContentPiece(campaignId: string) {
  return useMutation({
    mutationFn: (body: ContentPieceCreate) => contentPiecesApi.create(campaignId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: campaignKeys.detail(campaignId),
      });
    },
  });
}

export function useUpdateContentPiece(id: string) {
  return useMutation({
    mutationFn: (body: ContentPieceUpdate) => contentPiecesApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentPieceKeys.detail(id) });
    },
  });
}

export function useDeleteContentPiece(campaignId: string) {
  return useMutation({
    mutationFn: (id: string) => contentPiecesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: campaignKeys.detail(campaignId),
      });
    },
  });
}

export function useGenerateContent(contentPieceId: string) {
  return useMutation({
    mutationFn: (body?: GenerateRequest) => contentPiecesApi.generate(contentPieceId, body),
  });
}

export function useStartWorkflow() {
  return useMutation({
    mutationFn: ({
      contentPieceId,
      body,
    }: {
      contentPieceId: string;
      body?: GenerateRequest;
    }) => contentPiecesApi.generate(contentPieceId, body),
  });
}
