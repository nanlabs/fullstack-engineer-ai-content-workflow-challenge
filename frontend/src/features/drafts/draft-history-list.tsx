import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { DraftRead } from "@/api/types";

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface Props {
  drafts: DraftRead[];
  activeDraftId: string;
  viewingDraftId: string | null;
  onSelectDraft: (id: string | null) => void;
}

export function DraftHistoryList({ drafts, activeDraftId, viewingDraftId, onSelectDraft }: Props) {
  if (drafts.length <= 1) return null;

  const sorted = [...drafts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-medium">Drafts history</p>
      <div className="flex flex-wrap gap-2">
        {sorted.map((draft, idx) => {
          const isLatest = draft.id === activeDraftId;
          const isViewing = viewingDraftId === draft.id || (isLatest && viewingDraftId === null);
          const version = sorted.length - 1 - idx;
          const label = isLatest
            ? `v${version} (current)`
            : `v${version} (${draft.status}, ${formatRelativeTime(draft.created_at)})`;

          return (
            <Button
              key={draft.id}
              variant={isViewing ? "default" : "outline"}
              size="sm"
              className={cn("text-xs", isViewing && "pointer-events-none")}
              onClick={() => onSelectDraft(isLatest ? null : draft.id)}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
