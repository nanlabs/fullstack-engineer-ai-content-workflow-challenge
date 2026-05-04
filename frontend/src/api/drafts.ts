import { useMutation } from "@tanstack/react-query";
import { patch } from "@/api/client";
import { queryClient } from "@/lib/query-client";
import { contentPieceKeys } from "./content-pieces";
import type { DraftRead, DraftReviewAction } from "./types";

export const draftsApi = {
  review: (draftId: string, body: DraftReviewAction) =>
    patch<DraftRead>(`/api/drafts/${draftId}/review`, body),
};

export const draftKeys = {
  all: ["drafts"] as const,
  detail: (id: string) => [...draftKeys.all, "detail", id] as const,
};

export function useReviewDraft(contentPieceId: string) {
  return useMutation({
    mutationFn: ({ draftId, body }: { draftId: string; body: DraftReviewAction }) =>
      draftsApi.review(draftId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: contentPieceKeys.detail(contentPieceId),
      });
    },
  });
}
