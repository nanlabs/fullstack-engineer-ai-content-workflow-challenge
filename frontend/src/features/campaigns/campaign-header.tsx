import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeftIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CampaignFormDialog } from "./campaign-form-dialog";
import { DeleteCampaignConfirm } from "./delete-campaign-confirm";
import type { CampaignDetail } from "@/api/types";

interface Props {
  campaign: CampaignDetail;
}

export function CampaignHeader({ campaign }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="space-y-3">
      <Link
        to="/campaigns"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Campaigns
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{campaign.name}</h1>
          {campaign.brief && (
            <p className="text-muted-foreground max-w-prose text-sm">{campaign.brief}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-muted-foreground text-xs">Languages:</span>
            <Badge variant="outline" className="text-xs">
              {campaign.source_language}
            </Badge>
            {campaign.target_languages.length > 0 && (
              <>
                <span className="text-muted-foreground text-xs">→</span>
                {campaign.target_languages.map((lang) => (
                  <Badge key={lang} variant="secondary" className="text-xs">
                    {lang}
                  </Badge>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <PencilIcon className="mr-1.5 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2Icon className="mr-1.5 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <CampaignFormDialog open={editOpen} onOpenChange={setEditOpen} campaign={campaign} />
      <DeleteCampaignConfirm
        campaignId={campaign.id}
        campaignName={campaign.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
