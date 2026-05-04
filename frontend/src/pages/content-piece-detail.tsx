import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, RefreshCwIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { campaignKeys } from "@/api/campaigns";
import { contentPieceKeys, useContentPiece, useStartWorkflow } from "@/api/content-pieces";
import { useWorkflow, workflowKeys } from "@/api/workflows";
import { useEventStream, type SseEvent } from "@/lib/hooks/use-event-stream";
import { useSseContext } from "@/lib/sse-context";
import {
  DraftActions,
  DraftDiffView,
  DraftEditor,
  DraftHistoryList,
  DraftMetadataPanel,
  DraftTabs,
  TokenStreamPanel,
  WorkflowStatusBanner,
  getLatestDraftPerLanguage,
  useDraftEditor,
} from "@/features/drafts";
import type { DraftRead, GenerateResponse } from "@/api/types";

const TYPE_LABELS: Record<string, string> = {
  headline: "Headline",
  description: "Description",
  cta: "CTA",
  body: "Body",
};

export default function ContentPieceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { setConnected } = useSseContext();

  const [activeLanguage, setActiveLanguage] = useState("");
  const [viewingDraftId, setViewingDraftId] = useState<string | null>(null);
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  // Initialised from router state when navigating here straight from GenerateButton,
  // or set via handleStartWorkflow when clicking the in-page CTA.
  const [pendingThreadId, setPendingThreadId] = useState<string | null>(
    (location.state as { pendingThreadId?: string } | null)?.pendingThreadId ?? null
  );

  const { data: piece, isLoading, isError, refetch } = useContentPiece(id ?? "");
  const threadId = piece?.latest_thread_id ?? null;
  // Use the pending thread_id (from POST response) while the refetch is still in flight.
  const effectiveThreadId = pendingThreadId ?? threadId;
  const { data: workflowRun } = useWorkflow(effectiveThreadId);
  const startWorkflow = useStartWorkflow();

  const { connected } = useEventStream(
    effectiveThreadId ? `/api/workflows/${effectiveThreadId}/events` : null,
    (event: SseEvent) => {
      switch (event.type) {
        case "workflow.node.started": {
          const payload = event.payload as { node?: string } | undefined;
          if (payload?.node) setCurrentNode(payload.node);
          break;
        }
        case "workflow.node.completed":
          setCurrentNode(null);
          if (id) queryClient.invalidateQueries({ queryKey: contentPieceKeys.detail(id) });
          if (effectiveThreadId)
            queryClient.invalidateQueries({ queryKey: workflowKeys.detail(effectiveThreadId) });
          break;
        case "workflow.awaiting_human":
        case "workflow.completed":
        case "workflow.failed":
          // Workflow reached a terminal/pause state — the pending thread_id is now
          // materialised in the DB; clear it so we switch to piece.latest_thread_id.
          setPendingThreadId(null);
          if (id) queryClient.invalidateQueries({ queryKey: contentPieceKeys.detail(id) });
          if (effectiveThreadId)
            queryClient.invalidateQueries({ queryKey: workflowKeys.detail(effectiveThreadId) });
          // Invalidate the campaign so the status badge updates when the user navigates back.
          if (piece?.campaign_id)
            queryClient.invalidateQueries({ queryKey: campaignKeys.detail(piece.campaign_id) });
          break;
        case "draft.updated":
          if (id) queryClient.invalidateQueries({ queryKey: contentPieceKeys.detail(id) });
          if (effectiveThreadId)
            queryClient.invalidateQueries({ queryKey: workflowKeys.detail(effectiveThreadId) });
          break;
      }
    },
    !!effectiveThreadId
  );

  useEffect(() => {
    setConnected(connected ? true : null);
    return () => setConnected(null);
  }, [connected, setConnected]);

  // On SSE connect, refresh immediately to catch events fired before connection was ready.
  const prevConnectedRef = useRef(false);
  useEffect(() => {
    if (connected && !prevConnectedRef.current) {
      if (id) queryClient.invalidateQueries({ queryKey: contentPieceKeys.detail(id) });
      if (effectiveThreadId)
        queryClient.invalidateQueries({ queryKey: workflowKeys.detail(effectiveThreadId) });
    }
    prevConnectedRef.current = connected;
  }, [connected, id, effectiveThreadId, queryClient]);

  useEffect(() => {
    if (piece && !activeLanguage) {
      setActiveLanguage(piece.source_language ?? "en");
    }
  }, [piece, activeLanguage]);

  useEffect(() => {
    setViewingDraftId(null);
  }, [activeLanguage]);

  const workflowStatus = piece?.workflow_status ?? null;
  // Include pendingThreadId in isRunning so the panel shows immediately after the POST.
  const isRunning =
    workflowStatus === "running" || workflowStatus === "pending" || !!pendingThreadId;
  // True only when the graph is at an interrupt — determines which API to call.
  const isAwaitingHuman = workflowStatus === "awaiting_human";
  // For the banner: if the graph finished but some drafts are still suggested,
  // keep showing "Awaiting review" until every language is signed off.
  const displayWorkflowStatus =
    workflowStatus === "completed" && piece?.latest_status === "suggested"
      ? ("awaiting_human" as const)
      : workflowStatus;
  const hasDrafts = (piece?.drafts.length ?? 0) > 0;

  const latestPerLanguage = getLatestDraftPerLanguage(piece?.drafts ?? []);
  const latestDraft: DraftRead | null = latestPerLanguage.get(activeLanguage) ?? null;

  const activeDraft: DraftRead | null = viewingDraftId
    ? (piece?.drafts.find((d) => d.id === viewingDraftId) ?? latestDraft)
    : latestDraft;

  const draftsForLanguage = (piece?.drafts ?? []).filter((d) => d.language === activeLanguage);

  const isReadonly =
    viewingDraftId !== null ||
    activeDraft?.status === "approved" ||
    activeDraft?.status === "rejected" ||
    workflowStatus === "failed";

  const editor = useDraftEditor(activeDraft);

  function handleStartWorkflow() {
    startWorkflow.mutate(
      { contentPieceId: piece!.id },
      {
        onSuccess: (data: GenerateResponse) => {
          // Open the SSE connection immediately using the thread_id from the response,
          // without waiting for the piece refetch. This ensures we catch token events
          // even when the mock provider completes before the refetch returns.
          setPendingThreadId(data.thread_id);
          queryClient.invalidateQueries({ queryKey: contentPieceKeys.detail(piece!.id) });
        },
        onError: (err) => toast.error(err.message ?? "Failed to start generation"),
      }
    );
  }

  function handleActionComplete() {
    editor.reset();
    setViewingDraftId(null);
    if (piece?.campaign_id) {
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(piece.campaign_id) });
    }
  }

  if (!id) return null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-36 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !piece) {
    return (
      <div className="space-y-3 py-12 text-center">
        <p className="text-muted-foreground text-sm">Failed to load content piece.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Link
          to={`/campaigns/${piece.campaign_id}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back to campaign
        </Link>
        <h1 className="text-xl font-semibold">
          {piece.title ?? TYPE_LABELS[piece.type] ?? piece.type}
          <span className="text-muted-foreground ml-2 text-sm font-normal">
            ({TYPE_LABELS[piece.type] ?? piece.type})
          </span>
        </h1>
        {piece.source_text && (
          <p className="text-muted-foreground max-w-prose text-sm">
            <span className="font-medium">Source brief:</span> {piece.source_text}
          </p>
        )}
      </div>

      {/* Workflow status banner */}
      {displayWorkflowStatus && (
        <WorkflowStatusBanner
          workflowStatus={displayWorkflowStatus}
          workflowRun={workflowRun ?? null}
          currentDraft={latestDraft}
        />
      )}

      {/* Failed state with retry */}
      {workflowStatus === "failed" && workflowRun?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/20">
          <p className="text-sm text-red-800 dark:text-red-300">{workflowRun.error}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            disabled={startWorkflow.isPending}
            onClick={handleStartWorkflow}
          >
            <RefreshCwIcon className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Not started: generate CTA */}
      {!hasDrafts && !isRunning && workflowStatus !== "failed" && (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="text-muted-foreground mb-4 text-sm">No content generated yet.</p>
          <Button disabled={startWorkflow.isPending} onClick={handleStartWorkflow}>
            <SparklesIcon className="mr-2 h-4 w-4" />
            {startWorkflow.isPending ? "Starting…" : "Generate with AI"}
          </Button>
        </div>
      )}

      {/* Token streaming panel while running */}
      {isRunning && <TokenStreamPanel threadId={effectiveThreadId} activeNode={currentNode} />}

      {/* Main review UI */}
      {hasDrafts && activeLanguage && (
        <div className="space-y-4">
          <DraftTabs
            drafts={piece.drafts}
            sourceLanguage={piece.source_language ?? "en"}
            activeLanguage={activeLanguage}
            onLanguageChange={(lang) => setActiveLanguage(lang)}
          />

          <div className="mt-4">
            {activeDraft ? (
              <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                {/* Left: editor + diff + actions + history */}
                <div className="space-y-4">
                  <DraftEditor
                    draft={activeDraft}
                    value={editor.value}
                    isDirty={editor.isDirty}
                    onChange={editor.onChange}
                    disabled={isReadonly}
                  />

                  {(editor.isDirty || !!activeDraft.edited_content) && (
                    <DraftDiffView
                      aiContent={activeDraft.ai_content ?? ""}
                      editedContent={editor.value}
                    />
                  )}

                  {!isReadonly && threadId && (
                    <DraftActions
                      draft={activeDraft}
                      threadId={threadId}
                      contentPieceId={piece.id}
                      editorValue={editor.value}
                      isDirty={editor.isDirty}
                      isAwaitingHuman={isAwaitingHuman}
                      onSaved={handleActionComplete}
                    />
                  )}

                  <DraftHistoryList
                    drafts={draftsForLanguage}
                    activeDraftId={latestDraft?.id ?? ""}
                    viewingDraftId={viewingDraftId}
                    onSelectDraft={setViewingDraftId}
                  />
                </div>

                {/* Right: metadata */}
                <DraftMetadataPanel
                  draft={activeDraft}
                  workflowRun={workflowRun ?? null}
                  allDrafts={piece.drafts}
                />
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No draft available for {activeLanguage}.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
