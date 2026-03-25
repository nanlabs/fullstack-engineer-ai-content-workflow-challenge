import { ContentReviewPanel } from "@/components/content-review-panel";
import { StitchShell } from "@/components/stitch-shell";
import { fetchContentPiece } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ContentPieceEditorPage({
  params,
}: {
  params: Promise<{ campaignId: string; pieceId: string }>;
}) {
  const { pieceId } = await params;
  const piece = await fetchContentPiece(pieceId);

  return (
    <StitchShell activeHref="/" pageTitle="Campaign Editor">
      <main className="editor-screen">
        <ContentReviewPanel piece={piece} />
      </main>
    </StitchShell>
  );
}
