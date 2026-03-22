import { Card, CardContent } from '@/components/ui/card';
import { LanguageBadge, ModelBadge, StatusBadge } from '@/components/ui/badge';
import { formatDateTime, getLanguageLabel } from '@/lib/utils';
import type { Translation } from '@/types';

interface TranslationCardProps {
  translation: Translation;
}

export function TranslationCard({ translation }: TranslationCardProps) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="py-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <LanguageBadge language={translation.targetLanguage} />
          <span className="text-xs text-gray-500">
            {getLanguageLabel(translation.targetLanguage)}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <ModelBadge model={translation.model} />
          </div>
        </div>

        {/* Translated text */}
        <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
          <p className="text-sm text-gray-800 leading-relaxed">
            {translation.translatedText}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400">
          <StatusBadge status={translation.status} />
          <span>{formatDateTime(translation.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
