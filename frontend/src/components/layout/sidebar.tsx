import { Link, useParams } from "react-router";
import { PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaigns } from "@/api/campaigns";
import { useState } from "react";
import { CreateCampaignDialog } from "@/features/campaigns/create-campaign-dialog";

export function Sidebar() {
  const { data, isLoading } = useCampaigns();
  const { id } = useParams<{ id: string }>();
  const [open, setOpen] = useState(false);

  return (
    <aside className="bg-background flex min-h-[calc(100vh-57px)] w-64 flex-col border-r">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold">Campaigns</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setOpen(true)}
          aria-label="New campaign"
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="space-y-2 px-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        ) : !data?.items.length ? (
          <p className="text-muted-foreground px-4 py-6 text-center text-xs">No campaigns yet</p>
        ) : (
          data.items.map((campaign) => (
            <Link
              key={campaign.id}
              to={`/campaigns/${campaign.id}`}
              className={cn(
                "hover:bg-accent flex items-center px-4 py-2 text-sm transition-colors",
                id === campaign.id && "bg-accent font-medium"
              )}
            >
              <span className="truncate">{campaign.name}</span>
            </Link>
          ))
        )}
      </nav>

      <CreateCampaignDialog open={open} onOpenChange={setOpen} />
    </aside>
  );
}
