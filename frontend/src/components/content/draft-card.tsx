'use client';

import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ModelBadge } from '@/components/ui/badge';
import { cn, formatDateTime } from '@/lib/utils';
import type { AIDraft } from '@/types';

interface DraftCardProps {
  draft: AIDraft;
  onSelect: (id: string) => Promise<void> | void;
  isSelecting?: boolean;
}

export function DraftCard({ draft, onSelect, isSelecting }: DraftCardProps) {
  return (
    <Card
      className={cn(
        'transition-all duration-200',
        draft.isSelected
          ? 'border-indigo-300 ring-2 ring-indigo-100 shadow-md'
          : 'hover:shadow-md',
      )}
    >
      <CardContent className="py-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <ModelBadge model={draft.model} />
            {draft.isSelected && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-0.5">
                <CheckCircle2 className="h-3 w-3" />
                Selected
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400 shrink-0">
            {formatDateTime(draft.createdAt)}
          </span>
        </div>

        {/* Generated text */}
        <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {draft.generatedText}
          </p>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
          {draft.tone && (
            <span>
              Tone: <span className="font-medium text-gray-700">{draft.tone}</span>
            </span>
          )}
          {draft.sentiment && (
            <span>
              Sentiment:{' '}
              <span className="font-medium text-gray-700">{draft.sentiment}</span>
            </span>
          )}
        </div>

        {/* Keywords */}
        {draft.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {draft.keywords.map((kw) => (
              <span
                key={kw}
                className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 border border-gray-200"
              >
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* Prompt used */}
        {draft.prompt && (
          <div className="text-xs text-gray-400 border-t border-gray-100 pt-2">
            <span className="font-medium">Prompt:</span> {draft.prompt}
          </div>
        )}

        {/* Select button */}
        {!draft.isSelected && (
          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelect(draft.id)}
              isLoading={isSelecting}
              className="w-full border-dashed"
            >
              Use this draft
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
