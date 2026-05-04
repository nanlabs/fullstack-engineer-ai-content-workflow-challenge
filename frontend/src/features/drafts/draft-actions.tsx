import { useState } from "react";
import { CheckIcon, RefreshCwIcon, SaveIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useReviewDraft } from "@/api/drafts";
import { useResumeWorkflow } from "@/api/workflows";
import type { DraftRead } from "@/api/types";

interface Props {
  draft: DraftRead;
  threadId: string;
  contentPieceId: string;
  editorValue: string;
  isDirty: boolean;
  isAwaitingHuman: boolean;
  onSaved: () => void;
}

export function DraftActions({
  draft,
  threadId,
  contentPieceId,
  editorValue,
  isDirty,
  isAwaitingHuman,
  onSaved,
}: Props) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [regenerateNotes, setRegenerateNotes] = useState("");

  const reviewDraft = useReviewDraft(contentPieceId);
  const resumeWorkflow = useResumeWorkflow(contentPieceId);
  const isPending = reviewDraft.isPending || resumeWorkflow.isPending;

  function handleSaveEdits() {
    reviewDraft.mutate(
      { draftId: draft.id, body: { action: "edit", edited_content: editorValue } },
      {
        onSuccess: () => {
          toast.success("Edits saved");
          onSaved();
        },
        onError: (err) => toast.error(err.message ?? "Failed to save edits"),
      }
    );
  }

  function handleApprove() {
    if (isAwaitingHuman) {
      resumeWorkflow.mutate(
        {
          threadId,
          body: {
            action: "approve",
            draft_id: draft.id,
            edited_content: isDirty ? editorValue : undefined,
          },
        },
        {
          onSuccess: () => {
            toast.success("Draft approved");
            onSaved();
          },
          onError: (err) => toast.error(err.message ?? "Failed to approve draft"),
        }
      );
    } else {
      reviewDraft.mutate(
        { draftId: draft.id, body: { action: "approve" } },
        {
          onSuccess: () => {
            toast.success("Draft approved");
            onSaved();
          },
          onError: (err) => toast.error(err.message ?? "Failed to approve draft"),
        }
      );
    }
  }

  function handleReject() {
    if (isAwaitingHuman) {
      resumeWorkflow.mutate(
        { threadId, body: { action: "reject", draft_id: draft.id, notes: rejectNotes } },
        {
          onSuccess: () => {
            toast.success("Draft rejected");
            setRejectOpen(false);
            setRejectNotes("");
            onSaved();
          },
          onError: (err) => toast.error(err.message ?? "Failed to reject draft"),
        }
      );
    } else {
      reviewDraft.mutate(
        { draftId: draft.id, body: { action: "reject", review_notes: rejectNotes } },
        {
          onSuccess: () => {
            toast.success("Draft rejected");
            setRejectOpen(false);
            setRejectNotes("");
            onSaved();
          },
          onError: (err) => toast.error(err.message ?? "Failed to reject draft"),
        }
      );
    }
  }

  function handleRegenerate() {
    resumeWorkflow.mutate(
      { threadId, body: { action: "regenerate", draft_id: draft.id, notes: regenerateNotes } },
      {
        onSuccess: () => {
          toast.success("Regeneration started");
          setRegenerateOpen(false);
          setRegenerateNotes("");
          onSaved();
        },
        onError: (err) => toast.error(err.message ?? "Failed to start regeneration"),
      }
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Approve */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="sm"
            className="bg-green-600 text-white hover:bg-green-700"
            disabled={isPending}
            data-testid="approve-button"
          >
            <CheckIcon className="mr-1.5 h-4 w-4" />
            Approve
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              {isDirty
                ? "Your edits will be included in the approval."
                : "The AI-generated content will be marked as approved."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} data-testid="confirm-approve-button">
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject */}
      <Button
        size="sm"
        variant="outline"
        className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
        disabled={isPending}
        onClick={() => setRejectOpen(true)}
        data-testid="reject-button"
      >
        <XIcon className="mr-1.5 h-4 w-4" />
        Reject
      </Button>

      {/* Regenerate — only available while workflow is still at the interrupt */}
      {isAwaitingHuman && (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => setRegenerateOpen(true)}
          data-testid="regenerate-button"
        >
          <RefreshCwIcon className="mr-1.5 h-4 w-4" />
          Regenerate
        </Button>
      )}

      {/* Save edits */}
      <Button
        size="sm"
        variant="outline"
        disabled={!isDirty || isPending}
        onClick={handleSaveEdits}
        data-testid="save-edits-button"
      >
        <SaveIcon className="mr-1.5 h-4 w-4" />
        Save edits
      </Button>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject draft</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Rejection notes (required)</label>
            <Textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Explain why this draft is being rejected…"
              rows={4}
              data-testid="reject-notes"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectOpen(false);
                setRejectNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectNotes.trim() || isPending}
              onClick={handleReject}
              data-testid="confirm-reject-button"
            >
              {resumeWorkflow.isPending ? "Rejecting…" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate dialog */}
      <Dialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate draft</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Feedback for the AI (required)</label>
            <Textarea
              value={regenerateNotes}
              onChange={(e) => setRegenerateNotes(e.target.value)}
              placeholder="What should be different in the next version?"
              rows={4}
              data-testid="regenerate-notes"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRegenerateOpen(false);
                setRegenerateNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!regenerateNotes.trim() || isPending}
              onClick={handleRegenerate}
              data-testid="confirm-regenerate-button"
            >
              {resumeWorkflow.isPending ? "Starting…" : "Regenerate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
