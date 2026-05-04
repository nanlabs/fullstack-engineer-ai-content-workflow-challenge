import { useEffect } from "react";
import { useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaign, campaignKeys } from "@/api/campaigns";
import { contentPieceKeys } from "@/api/content-pieces";
import { workflowKeys } from "@/api/workflows";
import { useEventStream } from "@/lib/hooks/use-event-stream";
import { useSseContext } from "@/lib/sse-context";
import { CampaignHeader } from "@/features/campaigns/campaign-header";
import { ContentPiecesList } from "@/features/content-pieces/content-pieces-list";
import type { SseEvent } from "@/lib/hooks/use-event-stream";

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { setConnected } = useSseContext();

  const { data: campaign, isLoading, isError, refetch } = useCampaign(id ?? "");

  const { connected } = useEventStream(
    id ? `/api/campaigns/${id}/events` : null,
    (event: SseEvent) => {
      const threadId = (event as { thread_id?: string }).thread_id;

      switch (event.type) {
        case "workflow.node.started":
        case "workflow.node.completed":
          if (threadId) {
            queryClient.invalidateQueries({ queryKey: workflowKeys.detail(threadId) });
          }
          if (id) {
            queryClient.invalidateQueries({ queryKey: campaignKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: contentPieceKeys.byCampaign(id) });
          }
          break;
        case "workflow.started":
        case "workflow.completed":
        case "workflow.failed":
        case "workflow.awaiting_human":
        case "draft.updated":
          if (id) {
            queryClient.invalidateQueries({ queryKey: campaignKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: contentPieceKeys.byCampaign(id) });
          }
          break;
      }
    }
  );

  useEffect(() => {
    setConnected(connected ? true : null);
    return () => setConnected(null);
  }, [connected, setConnected]);

  if (!id) return null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !campaign) {
    return (
      <div className="space-y-3 py-12 text-center">
        <p className="text-muted-foreground text-sm">Failed to load campaign.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <CampaignHeader campaign={campaign} />
      <ContentPiecesList pieces={campaign.content_pieces} campaignId={campaign.id} />
    </div>
  );
}
