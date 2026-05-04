import { useNavigate } from "react-router";
import { EyeIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useWorkflow } from "@/api/workflows";
import { useStartWorkflow, useDeleteContentPiece } from "@/api/content-pieces";
import { toast } from "sonner";
import { ContentPieceStatusBadge, getDisplayStatus } from "./content-piece-status-badge";
import { GenerateButton } from "./generate-button";
import type { ContentPieceSummary } from "@/api/types";

const TYPE_LABELS: Record<string, string> = {
  headline: "Headline",
  description: "Description",
  cta: "CTA",
  body: "Body",
};

interface Props {
  piece: ContentPieceSummary;
  campaignId: string;
}

export function ContentPieceRow({ piece, campaignId }: Props) {
  const navigate = useNavigate();
  const displayStatus = getDisplayStatus(piece);

  const isGenerating = displayStatus === "generating";

  const { data: workflowRun } = useWorkflow(isGenerating ? (piece.latest_thread_id ?? null) : null);

  const regenerate = useStartWorkflow();
  const deletePiece = useDeleteContentPiece(campaignId);

  function handleRegenerate() {
    regenerate.mutate(
      { contentPieceId: piece.id },
      {
        onSuccess: (data) =>
          navigate(`/content-pieces/${piece.id}`, {
            state: { pendingThreadId: data.thread_id },
          }),
        onError: (err) => {
          toast.error(err.message ?? "Failed to start generation");
        },
      }
    );
  }

  function handleDelete() {
    deletePiece.mutate(piece.id, {
      onError: (err) => {
        toast.error(err.message ?? "Failed to delete content piece");
      },
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="shrink-0 text-xs">
            {TYPE_LABELS[piece.type] ?? piece.type}
          </Badge>
          {piece.title && <span className="truncate text-sm font-medium">{piece.title}</span>}
        </div>
        <ContentPieceStatusBadge piece={piece} currentNode={workflowRun?.current_node} />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {displayStatus === "draft" && (
          <GenerateButton
            contentPieceId={piece.id}
            onStart={(threadId) =>
              navigate(`/content-pieces/${piece.id}`, {
                state: { pendingThreadId: threadId },
              })
            }
          />
        )}

        {displayStatus === "awaiting_review" && (
          <Button size="sm" onClick={() => navigate(`/content-pieces/${piece.id}`)}>
            Review
          </Button>
        )}

        {(displayStatus === "completed" ||
          displayStatus === "rejected" ||
          displayStatus === "failed") && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/content-pieces/${piece.id}`)}
            >
              <EyeIcon className="mr-1.5 h-4 w-4" />
              View
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={regenerate.isPending}
              onClick={handleRegenerate}
            >
              <RefreshCwIcon className="mr-1.5 h-4 w-4" />
              {regenerate.isPending ? "Starting…" : "Regenerate"}
            </Button>
          </>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost" disabled={deletePiece.isPending}>
              <Trash2Icon className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete content piece?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this content piece and all its drafts. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
