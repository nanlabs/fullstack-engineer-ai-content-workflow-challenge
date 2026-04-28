import { useParams } from "react-router";

export default function ContentPieceDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Content Piece</h1>
      <p className="text-muted-foreground font-mono text-sm">{id}</p>
    </div>
  );
}
