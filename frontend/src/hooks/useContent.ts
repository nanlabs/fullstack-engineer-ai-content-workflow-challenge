import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contentApi } from '../api/content';
import type { ContentType } from '../types';

export function useContentByCampaign(campaignId: string) {
  return useQuery({
    queryKey: ['content', 'campaign', campaignId],
    queryFn: () => contentApi.listByCampaign(campaignId),
    enabled: !!campaignId,
  });
}

export function useContentPiece(id: string) {
  return useQuery({
    queryKey: ['content', id],
    queryFn: () => contentApi.get(id),
    enabled: !!id,
  });
}

export function useCreateContent(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: ContentType; originalText?: string; language?: string }) =>
      contentApi.create(campaignId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content', 'campaign', campaignId] });
      qc.invalidateQueries({ queryKey: ['campaign', campaignId] });
    },
  });
}
