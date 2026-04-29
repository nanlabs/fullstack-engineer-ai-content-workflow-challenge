import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DraftRead, WorkflowRunRead } from "@/api/types";

interface DraftMeta {
  sentiment?: "positive" | "neutral" | "negative";
  tone?: string;
  keywords?: string[];
  reading_time_seconds?: number;
}

function parseMeta(raw: Record<string, unknown> | null): DraftMeta {
  if (!raw) return {};
  return {
    sentiment: (raw.sentiment as DraftMeta["sentiment"]) ?? undefined,
    tone: typeof raw.tone === "string" ? raw.tone : undefined,
    keywords: Array.isArray(raw.keywords) ? (raw.keywords as string[]) : undefined,
    reading_time_seconds:
      typeof raw.reading_time_seconds === "number" ? raw.reading_time_seconds : undefined,
  };
}

function sentimentEmoji(s: string): string {
  if (s === "positive") return "🟢";
  if (s === "negative") return "🔴";
  return "⚪";
}

interface Props {
  draft: DraftRead;
  workflowRun: WorkflowRunRead | null;
  allDrafts: DraftRead[];
}

export function DraftMetadataPanel({ draft, workflowRun, allDrafts }: Props) {
  const meta = parseMeta(draft.metadata);
  const hasMeta = meta.sentiment || meta.tone || (meta.keywords && meta.keywords.length > 0);
  const parentDraft = draft.parent_draft_id
    ? allDrafts.find((d) => d.id === draft.parent_draft_id)
    : null;

  return (
    <Card className="h-fit">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">AI Metadata</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-2">
          {hasMeta ? (
            <>
              {meta.sentiment && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Sentiment</span>
                  <span className="font-medium">
                    {sentimentEmoji(meta.sentiment)} {meta.sentiment}
                  </span>
                </div>
              )}
              {meta.tone && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Tone</span>
                  <span className="font-medium">{meta.tone}</span>
                </div>
              )}
              {meta.reading_time_seconds !== undefined && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Reading time</span>
                  <span className="font-medium">{meta.reading_time_seconds}s</span>
                </div>
              )}
              {meta.keywords && meta.keywords.length > 0 && (
                <div className="space-y-1">
                  <span className="text-muted-foreground">Keywords</span>
                  <div className="flex flex-wrap gap-1">
                    {meta.keywords.map((kw) => (
                      <Badge key={kw} variant="secondary" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-xs italic">No AI metadata for this draft</p>
          )}
        </div>

        <div className="border-t pt-3">
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
            Generation
          </p>
          <div className="space-y-1.5">
            {draft.model_used ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Model</span>
                <span className="font-mono text-xs">{draft.model_used}</span>
              </div>
            ) : null}
            {draft.provider ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-medium capitalize">{draft.provider}</span>
              </div>
            ) : null}
            {!draft.model_used && !draft.provider && (
              <p className="text-muted-foreground text-xs italic">No generation info</p>
            )}
          </div>
        </div>

        <div className="border-t pt-3">
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
            Lineage
          </p>
          <div className="space-y-1.5">
            {workflowRun && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Iteration</span>
                <span className="font-medium">{workflowRun.iteration}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className="text-xs">
                {draft.status}
              </Badge>
            </div>
            {parentDraft && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Parent</span>
                <Badge variant="outline" className="text-xs">
                  {parentDraft.status}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
