import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { draftsApi } from '../api/drafts';

export function useDraftsByContent(contentId: string) {
  return useQuery({
    queryKey: ['drafts', contentId],
    queryFn: () => draftsApi.listByContent(contentId),
    enabled: !!contentId,
  });
}

export function useGenerate(contentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { provider: 'openai' | 'anthropic' | 'both'; tone?: string; style?: string }) =>
      draftsApi.generate(contentId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drafts', contentId] });
      qc.invalidateQueries({ queryKey: ['content', contentId] });
    },
  });
}

export function useTranslate(contentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { targetLanguages: string[]; provider: 'openai' | 'anthropic' }) =>
      draftsApi.translate(contentId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drafts', contentId] }),
  });
}

export function useExtract(contentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data?: { provider?: 'openai' | 'anthropic' }) =>
      draftsApi.extract(contentId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content', contentId] }),
  });
}

export function useReviewActions() {
  const qc = useQueryClient();
  const invalidate = (contentId: string) => {
    qc.invalidateQueries({ queryKey: ['drafts', contentId] });
    qc.invalidateQueries({ queryKey: ['content', contentId] });
  };

  return {
    markReviewed: useMutation({
      mutationFn: ({ id, contentId }: { id: string; contentId: string }) =>
        draftsApi.review(id).then((d) => { invalidate(contentId); return d; }),
    }),
    approve: useMutation({
      mutationFn: ({ id, contentId, editedText }: { id: string; contentId: string; editedText?: string }) =>
        draftsApi.approve(id, editedText).then((d) => { invalidate(contentId); return d; }),
    }),
    reject: useMutation({
      mutationFn: ({ id, contentId, reviewerNotes }: { id: string; contentId: string; reviewerNotes?: string }) =>
        draftsApi.reject(id, reviewerNotes).then((d) => { invalidate(contentId); return d; }),
    }),
    reset: useMutation({
      mutationFn: ({ id, contentId }: { id: string; contentId: string }) =>
        draftsApi.reset(id).then((d) => { invalidate(contentId); return d; }),
    }),
  };
}
