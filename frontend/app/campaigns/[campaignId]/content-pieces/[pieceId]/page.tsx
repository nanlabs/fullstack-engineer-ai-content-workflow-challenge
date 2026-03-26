import { ContentReviewPanel } from "@/components/content-review-panel";
import { StitchShell } from "@/components/stitch-shell";
import { fetchContentPiece, fetchProviderSettings } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ContentPieceEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ campaignId: string; pieceId: string }>;
  searchParams: Promise<{ lab?: string }>;
}) {
  const { pieceId } = await params;
  const { lab } = await searchParams;
  const [piece, providerSettings] = await Promise.all([
    fetchContentPiece(pieceId),
    fetchProviderSettings(),
  ]);
  const labMode = lab === "1";

  return (
    <StitchShell activeHref="/" pageTitle="Campaign Editor">
      <main className="editor-screen">
        <ContentReviewPanel piece={piece} labMode={labMode} initialProviderSettings={providerSettings} />
      </main>
    </StitchShell>
  );
}
