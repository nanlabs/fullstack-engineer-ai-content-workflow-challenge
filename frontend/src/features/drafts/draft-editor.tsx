import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { DraftRead } from "@/api/types";

export interface DraftEditorHandle {
  value: string;
  isDirty: boolean;
  onChange: (v: string) => void;
  reset: () => void;
}

export function useDraftEditor(draft: DraftRead | null): DraftEditorHandle {
  const getInitial = () => draft?.edited_content ?? draft?.ai_content ?? "";
  const [value, setValue] = useState(getInitial);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const next = draft?.edited_content ?? draft?.ai_content ?? "";
    setValue(next);
    setIsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id]);

  function onChange(newValue: string) {
    setValue(newValue);
    setIsDirty(newValue !== (draft?.edited_content ?? draft?.ai_content ?? ""));
  }

  function reset() {
    setValue(draft?.edited_content ?? draft?.ai_content ?? "");
    setIsDirty(false);
  }

  return { value, isDirty, onChange, reset };
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

interface Props {
  draft: DraftRead;
  value: string;
  isDirty: boolean;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function DraftEditor({ draft, value, isDirty, onChange, disabled = false }: Props) {
  const meta = draft.metadata as { sentiment?: string; keywords?: string[] } | null;
  const count = wordCount(value);
  const sentiment = meta?.sentiment;
  const keywords = meta?.keywords?.slice(0, 4).join(", ");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          Draft (suggested by AI
          {count > 0 && ` · ${count} ${count === 1 ? "word" : "words"}`}
          {sentiment && ` · ${sentiment}`}
          {keywords && ` · keywords: ${keywords}`})
        </p>
        {isDirty && (
          <Badge variant="outline" className="shrink-0 text-xs">
            Modified
          </Badge>
        )}
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[120px] resize-y font-mono text-sm"
        disabled={disabled}
        placeholder="No content available"
        data-testid="draft-editor-textarea"
      />
    </div>
  );
}
