import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCampaigns } from "@/api/campaigns";
import { CampaignCard } from "./campaign-card";
import { CampaignFormDialog } from "./campaign-form-dialog";

export function CampaignsList() {
  const { data, isLoading, isError, refetch } = useCampaigns();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3 py-12 text-center">
        <p className="text-muted-foreground text-sm">Failed to load campaigns.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const campaigns = data?.items ?? [];

  if (campaigns.length === 0) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-muted-foreground text-sm">No campaigns yet.</p>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Create your first campaign
        </Button>
        <CampaignFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </div>
    </div>
  );
}
