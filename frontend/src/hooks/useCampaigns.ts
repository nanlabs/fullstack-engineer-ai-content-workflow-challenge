import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi } from '../api/campaigns';

export function useCampaigns(params?: { page?: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: ['campaigns', params],
    queryFn: () => campaignsApi.list(params),
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: campaignsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}
