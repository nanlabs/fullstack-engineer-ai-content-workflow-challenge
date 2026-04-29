import { memo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEventStream, type SseEvent } from "@/lib/hooks/use-event-stream";

const NODE_LABELS: Record<string, string> = {
  generate_draft: "generating draft",
  extract_metadata: "analyzing content",
  translate_to_language: "translating",
  refine: "refining based on feedback",
};

interface Props {
  threadId: string | null;
  activeNode: string | null;
}

export const TokenStreamPanel = memo(function TokenStreamPanel({ threadId, activeNode }: Props) {
  const [streamedText, setStreamedText] = useState("");

  useEventStream(
    threadId ? `/api/workflows/${threadId}/events` : null,
    (event: SseEvent) => {
      if (event.type === "workflow.tokens") {
        const payload = event.payload as { delta?: string } | undefined;
        if (payload?.delta) {
          setStreamedText((prev) => prev + payload.delta);
        }
      }
      if (event.type === "workflow.node.completed") {
        setStreamedText("");
      }
    },
    !!threadId
  );

  if (!activeNode && !streamedText) return null;

  const nodeLabel = activeNode ? (NODE_LABELS[activeNode] ?? activeNode) : "generating";

  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-blue-800 dark:text-blue-300">
          ⏳ Generating… ({nodeLabel})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="min-h-[1.5em] font-mono text-sm whitespace-pre-wrap text-blue-900 dark:text-blue-200">
          {streamedText}
          <span className="animate-pulse">█</span>
        </p>
      </CardContent>
    </Card>
  );
});
