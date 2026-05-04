import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampaignsList } from "@/features/campaigns/campaigns-list";
import { CampaignFormDialog } from "@/features/campaigns/campaign-form-dialog";

export default function CampaignsListPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Campaigns</h1>
          <p className="text-muted-foreground text-sm">
            Manage your content campaigns and generate multilingual drafts.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      <CampaignsList />

      <CampaignFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
