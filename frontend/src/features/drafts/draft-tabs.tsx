import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DraftRead, DraftStatus } from "@/api/types";

const STATUS_EMOJI: Record<DraftStatus, string> = {
  draft: "⬜",
  suggested: "🟡",
  reviewed: "🔵",
  approved: "✅",
  rejected: "❌",
};

export function getLatestDraftPerLanguage(drafts: DraftRead[]): Map<string, DraftRead> {
  const map = new Map<string, DraftRead>();
  const sorted = [...drafts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  for (const draft of sorted) {
    if (!map.has(draft.language)) {
      map.set(draft.language, draft);
    }
  }
  return map;
}

interface Props {
  drafts: DraftRead[];
  sourceLanguage: string;
  activeLanguage: string;
  onLanguageChange: (lang: string) => void;
}

export function DraftTabs({ drafts, sourceLanguage, activeLanguage, onLanguageChange }: Props) {
  const latestPerLanguage = getLatestDraftPerLanguage(drafts);
  const otherLanguages = Array.from(latestPerLanguage.keys()).filter((l) => l !== sourceLanguage);
  const languages = [sourceLanguage, ...otherLanguages];

  return (
    <Tabs value={activeLanguage} onValueChange={onLanguageChange}>
      <TabsList className="h-auto flex-wrap gap-1">
        {languages.map((lang) => {
          const draft = latestPerLanguage.get(lang);
          const emoji = draft ? STATUS_EMOJI[draft.status] : "";
          const isSource = lang === sourceLanguage;
          return (
            <TabsTrigger key={lang} value={lang} className="gap-1.5">
              <span className="font-medium uppercase">{lang}</span>
              {isSource && <span className="text-muted-foreground text-xs">(source)</span>}
              {emoji && <span>{emoji}</span>}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
