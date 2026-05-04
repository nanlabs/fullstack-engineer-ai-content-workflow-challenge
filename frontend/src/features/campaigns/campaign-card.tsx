import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Campaign } from "@/api/types";

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface Props {
  campaign: Campaign;
}

export function CampaignCard({ campaign }: Props) {
  return (
    <Link to={`/campaigns/${campaign.id}`}>
      <Card className="hover:bg-accent/50 cursor-pointer transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{campaign.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {campaign.brief && (
            <p className="text-muted-foreground line-clamp-2 text-sm">{campaign.brief}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {campaign.content_pieces_count}{" "}
              {campaign.content_pieces_count === 1 ? "piece" : "pieces"}
            </span>
            <span className="text-muted-foreground text-xs">·</span>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">
                {campaign.source_language}
              </Badge>
              {campaign.target_languages.map((lang) => (
                <Badge key={lang} variant="secondary" className="text-xs">
                  {lang}
                </Badge>
              ))}
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Updated {formatRelativeTime(campaign.updated_at)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
