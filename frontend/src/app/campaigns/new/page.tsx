'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useCampaigns } from '@/hooks/use-campaigns';
import { useToast } from '@/components/ui/toast';
import { CampaignForm } from '@/components/campaigns/campaign-form';
import { Card, CardContent } from '@/components/ui/card';
import type { CreateCampaignData } from '@/types';

export default function NewCampaignPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const { createCampaign } = useCampaigns();
  const { addToast } = useToast();

  async function handleCreate(data: CreateCampaignData) {
    setIsCreating(true);
    try {
      const campaign = await createCampaign(data);
      addToast('Campaign created successfully', 'success');
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to create campaign',
        'error',
      );
      setIsCreating(false);
    }
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaigns
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-gray-900 tracking-tight">
          New Campaign
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a new content campaign for AI-powered copy generation.
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <CampaignForm onSubmit={handleCreate} isLoading={isCreating} />
        </CardContent>
      </Card>
    </div>
  );
}
