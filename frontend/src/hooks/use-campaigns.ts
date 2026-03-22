'use client';

import { useState, useEffect, useCallback } from 'react';
import * as api from '@/lib/api';
import type { Campaign, CreateCampaignData } from '@/types';

interface UseCampaignsReturn {
  campaigns: Campaign[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createCampaign: (data: CreateCampaignData) => Promise<Campaign>;
  deleteCampaign: (id: string) => Promise<void>;
}

export function useCampaigns(): UseCampaignsReturn {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getCampaigns();
      setCampaigns(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const createCampaign = useCallback(
    async (data: CreateCampaignData): Promise<Campaign> => {
      const campaign = await api.createCampaign(data);
      setCampaigns((prev) => [campaign, ...prev]);
      return campaign;
    },
    [],
  );

  const deleteCampaign = useCallback(async (id: string): Promise<void> => {
    await api.deleteCampaign(id);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return {
    campaigns,
    isLoading,
    error,
    refresh: fetchCampaigns,
    createCampaign,
    deleteCampaign,
  };
}

interface UseCampaignReturn {
  campaign: Campaign | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCampaign(id: string): UseCampaignReturn {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaign = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getCampaign(id);
      setCampaign(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  return { campaign, isLoading, error, refresh: fetchCampaign };
}
