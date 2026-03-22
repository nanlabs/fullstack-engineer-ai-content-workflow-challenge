import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, ContentTypeBadge } from '@/components/ui/badge';
import { truncate, formatDate } from '@/lib/utils';
import type { ContentPiece } from '@/types';

interface ContentCardProps {
  content: ContentPiece;
  campaignId: string;
}

export function ContentCard({ content, campaignId }: ContentCardProps) {
  const draftCount = content.aiDrafts?.length ?? 0;

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center gap-2 flex-wrap">
              <ContentTypeBadge type={content.type} />
              <StatusBadge status={content.status} />
              {draftCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <Sparkles className="h-3 w-3" />
                  {draftCount} draft{draftCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Original text */}
            <p className="mt-2 text-sm text-gray-700 leading-relaxed">
              {truncate(content.originalText, 160)}
            </p>

            {/* Review notes */}
            {content.reviewNotes && (
              <p className="mt-1.5 text-xs text-gray-500 italic line-clamp-1">
                Note: {content.reviewNotes}
              </p>
            )}

            {/* Date */}
            <p className="mt-2 text-xs text-gray-400">
              Created {formatDate(content.createdAt)}
            </p>
          </div>

          {/* Action */}
          <Link
            href={`/campaigns/${campaignId}/content/${content.id}`}
            className="shrink-0"
          >
            <Button variant="outline" size="sm" className="group">
              View
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
