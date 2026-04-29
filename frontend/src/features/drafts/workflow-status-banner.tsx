import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon, PauseCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DraftRead, WorkflowRunRead, WorkflowStatus } from "@/api/types";

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const STATUS_CONFIG = {
  pending: {
    icon: <Loader2Icon className="h-4 w-4 animate-spin" />,
    label: "Starting…",
    className:
      "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300",
  },
  running: {
    icon: <Loader2Icon className="h-4 w-4 animate-spin" />,
    label: "Generating…",
    className:
      "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300",
  },
  awaiting_human: {
    icon: <PauseCircleIcon className="h-4 w-4" />,
    label: "Awaiting review",
    className:
      "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300",
  },
  completed: {
    icon: <CheckCircle2Icon className="h-4 w-4" />,
    label: "Completed",
    className:
      "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300",
  },
  failed: {
    icon: <AlertCircleIcon className="h-4 w-4" />,
    label: "Failed",
    className:
      "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300",
  },
} satisfies Record<WorkflowStatus, { icon: React.ReactNode; label: string; className: string }>;

interface Props {
  workflowStatus: WorkflowStatus;
  workflowRun: WorkflowRunRead | null;
  currentDraft: DraftRead | null;
}

export function WorkflowStatusBanner({ workflowStatus, workflowRun, currentDraft }: Props) {
  const cfg = STATUS_CONFIG[workflowStatus];
  const iteration = workflowRun?.iteration;
  const startedAt = workflowRun?.started_at;
  const modelUsed = currentDraft?.model_used;

  return (
    <div
      className={cn("flex items-center gap-3 rounded-lg border px-4 py-3 text-sm", cfg.className)}
    >
      {cfg.icon}
      <span className="font-medium">
        {cfg.label}
        {workflowStatus === "awaiting_human" &&
          iteration !== undefined &&
          ` · iteration ${iteration}`}
      </span>
      {startedAt && (
        <>
          <span className="opacity-60">·</span>
          <span className="opacity-60">Started {formatRelativeTime(startedAt)}</span>
        </>
      )}
      {modelUsed && (
        <>
          <span className="opacity-60">·</span>
          <span className="font-mono text-xs opacity-60">{modelUsed}</span>
        </>
      )}
    </div>
  );
}
