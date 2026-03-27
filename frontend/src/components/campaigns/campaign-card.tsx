import Link from 'next/link';
import { Calendar, FileText, ArrowRight, Trash2 } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { Campaign } from '@/types';

interface CampaignCardProps {
  campaign: Campaign;
  onDelete?: (id: string) => void;
}

export function CampaignCard({ campaign, onDelete }: CampaignCardProps) {
  const contentCount = campaign._count?.contents ?? campaign.contents?.length ?? 0;

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow duration-200">
      <CardContent className="flex-1 pt-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 text-base leading-snug line-clamp-2">
            {campaign.name}
          </h3>
          {onDelete && (
            <button
              onClick={() => onDelete(campaign.id)}
              className="shrink-0 text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded"
              aria-label="Delete campaign"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {campaign.description && (
          <p className="mt-1.5 text-sm text-gray-500 line-clamp-2">
            {campaign.description}
          </p>
        )}

        {/* Target languages */}
        {campaign.targetLangs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {campaign.targetLangs.slice(0, 4).map((lang) => (
              <Badge
                key={lang}
                className="bg-violet-50 text-violet-700 border-violet-200 text-xs"
              >
                {lang.toUpperCase()}
              </Badge>
            ))}
            {campaign.targetLangs.length > 4 && (
              <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs">
                +{campaign.targetLangs.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Meta */}
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            {contentCount} {contentCount === 1 ? 'piece' : 'pieces'}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(campaign.createdAt)}
          </span>
        </div>
      </CardContent>

      <CardFooter>
        <Link href={`/campaigns/${campaign.id}`} className="w-full">
          <Button variant="outline" size="sm" className="w-full group">
            View Campaign
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
