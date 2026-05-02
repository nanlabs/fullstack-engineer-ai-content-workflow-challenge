import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentPieceRow } from "./content-piece-row";
import { ContentPieceFormDialog } from "./content-piece-form-dialog";
import type { ContentPieceSummary } from "@/api/types";

interface Props {
  pieces: ContentPieceSummary[];
  campaignId: string;
  isLoading?: boolean;
}

export function ContentPiecesList({ pieces, campaignId, isLoading }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Content pieces</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <PlusIcon className="mr-1.5 h-4 w-4" />
          New piece
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : pieces.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Add content pieces to start generating drafts with AI.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {pieces.map((piece) => (
            <ContentPieceRow key={piece.id} piece={piece} campaignId={campaignId} />
          ))}
        </div>
      )}

      <ContentPieceFormDialog
        campaignId={campaignId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
