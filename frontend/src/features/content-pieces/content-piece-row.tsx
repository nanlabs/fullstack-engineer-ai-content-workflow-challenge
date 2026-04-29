import { useNavigate } from "react-router";
import { RefreshCwIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkflow } from "@/api/workflows";
import { useStartWorkflow } from "@/api/content-pieces";
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
}

export function ContentPieceRow({ piece }: Props) {
  const navigate = useNavigate();
  const displayStatus = getDisplayStatus(piece);

  const isGenerating = displayStatus === "generating";

  const { data: workflowRun } = useWorkflow(isGenerating ? (piece.latest_thread_id ?? null) : null);

  const regenerate = useStartWorkflow();

  function handleRegenerate() {
    regenerate.mutate(
      { contentPieceId: piece.id },
      {
        onError: (err) => {
          toast.error(err.message ?? "Failed to start generation");
        },
      }
    );
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
        {displayStatus === "draft" && <GenerateButton contentPieceId={piece.id} />}

        {displayStatus === "awaiting_review" && (
          <Button size="sm" onClick={() => navigate(`/content-pieces/${piece.id}`)}>
            Review
          </Button>
        )}

        {(displayStatus === "completed" ||
          displayStatus === "rejected" ||
          displayStatus === "failed") && (
          <Button
            size="sm"
            variant="outline"
            disabled={regenerate.isPending}
            onClick={handleRegenerate}
          >
            <RefreshCwIcon className="mr-1.5 h-4 w-4" />
            {regenerate.isPending ? "Starting…" : "Regenerate"}
          </Button>
        )}
      </div>
    </div>
  );
}
