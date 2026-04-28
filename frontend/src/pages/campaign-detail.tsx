import { useParams } from "react-router";

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Campaign</h1>
      <p className="text-muted-foreground font-mono text-sm">{id}</p>
    </div>
  );
}
