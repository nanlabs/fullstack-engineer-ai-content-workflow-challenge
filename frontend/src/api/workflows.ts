import { useMutation, useQuery } from "@tanstack/react-query";
import { get, post } from "@/api/client";
import { queryClient } from "@/lib/query-client";
import { contentPieceKeys } from "./content-pieces";
import type { ResumeRequest, ResumeResponse, WorkflowRunRead } from "./types";

export const workflowsApi = {
  get: (threadId: string) => get<WorkflowRunRead>(`/api/workflows/${threadId}`),
  resume: (threadId: string, body: ResumeRequest) =>
    post<ResumeResponse>(`/api/workflows/${threadId}/resume`, body),
};

export const workflowKeys = {
  all: ["workflows"] as const,
  detail: (threadId: string) => [...workflowKeys.all, "detail", threadId] as const,
};

export function useWorkflow(threadId: string | null) {
  return useQuery({
    queryKey: workflowKeys.detail(threadId ?? ""),
    queryFn: () => workflowsApi.get(threadId!),
    enabled: !!threadId,
  });
}

export function useResumeWorkflow(contentPieceId: string) {
  return useMutation({
    mutationFn: ({ threadId, body }: { threadId: string; body: ResumeRequest }) =>
      workflowsApi.resume(threadId, body),
    onSuccess: (_data, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(threadId) });
      queryClient.invalidateQueries({
        queryKey: contentPieceKeys.detail(contentPieceId),
      });
    },
  });
}
