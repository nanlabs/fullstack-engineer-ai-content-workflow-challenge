import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentPieceSummary } from "@/api/types";

const NODE_LABELS: Record<string, string> = {
  generate_draft: "Generating draft",
  extract_metadata: "Analyzing content",
  translate_to_language: "Translating",
  refine: "Refining based on feedback",
};

export type DisplayStatus =
  | "draft"
  | "generating"
  | "awaiting_review"
  | "completed"
  | "rejected"
  | "failed";

export function getDisplayStatus(piece: ContentPieceSummary): DisplayStatus {
  const ws = piece.workflow_status;

  if (ws === "running" || ws === "pending") return "generating";
  if (ws === "awaiting_human") return "awaiting_review";
  if (ws === "failed") return "failed";
  // Workflow completed but translations may still need human sign-off:
  // stay on "awaiting_review" until latest_status is no longer "suggested".
  if (ws === "completed") {
    return piece.latest_status === "suggested" ? "awaiting_review" : "completed";
  }

  if (!piece.has_drafts) return "draft";
  if (piece.latest_status === "approved") return "completed";
  if (piece.latest_status === "rejected") return "rejected";
  if (piece.latest_status === "suggested" || piece.latest_status === "reviewed") {
    return "awaiting_review";
  }

  return "draft";
}

interface Props {
  piece: ContentPieceSummary;
  currentNode?: string | null;
  className?: string;
}

export function ContentPieceStatusBadge({ piece, currentNode, className }: Props) {
  const status = getDisplayStatus(piece);

  const baseClass = cn(
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
    className
  );

  switch (status) {
    case "draft":
      return (
        <span className={cn(baseClass, "bg-secondary text-secondary-foreground")}>📝 Draft</span>
      );

    case "generating": {
      const nodeLabel = currentNode ? (NODE_LABELS[currentNode] ?? currentNode) : null;
      return (
        <span
          className={cn(
            baseClass,
            "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
          )}
        >
          <Loader2Icon className="h-3 w-3 animate-spin" />
          {nodeLabel ? `Generating… (${nodeLabel.toLowerCase()})` : "Generating…"}
        </span>
      );
    }

    case "awaiting_review":
      return (
        <span
          className={cn(
            baseClass,
            "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
          )}
        >
          ⚡ Awaiting review
          {piece.drafts_count > 0
            ? ` (${piece.drafts_count} draft${piece.drafts_count !== 1 ? "s" : ""})`
            : ""}
        </span>
      );

    case "completed":
      return (
        <span
          className={cn(
            baseClass,
            "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
          )}
        >
          ✅ Completed
        </span>
      );

    case "rejected":
      return (
        <span
          className={cn(baseClass, "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300")}
        >
          ❌ Rejected
        </span>
      );

    case "failed":
      return (
        <span
          className={cn(baseClass, "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300")}
        >
          ❌ Failed
        </span>
      );
  }
}
