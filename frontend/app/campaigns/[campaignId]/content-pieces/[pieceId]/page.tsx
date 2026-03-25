import Link from "next/link";

import { ContentReviewPanel } from "@/components/content-review-panel";
import { StitchShell } from "@/components/stitch-shell";
import { fetchCampaign, fetchContentPiece } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ContentPieceEditorPage({
  params,
}: {
  params: Promise<{ campaignId: string; pieceId: string }>;
}) {
  const { campaignId, pieceId } = await params;
  const [campaign, piece] = await Promise.all([
    fetchCampaign(campaignId),
    fetchContentPiece(pieceId),
  ]);

  return (
    <StitchShell activeHref="/campaigns/new" pageTitle="Campaign Manager">
      <main className="editor-page">
        <div className="workbench-page-top">
          <Link href={`/campaigns/${campaign.id}`} className="back-link">
            ← Volver a la lista de contenidos
          </Link>
          <span className="workbench-page-tag">Content Piece Editor</span>
        </div>
        <section className="editor-hero">
          <div>
            <p className="eyebrow">Campaña</p>
            <h2>{campaign.name}</h2>
            <p>{campaign.description ?? "Sin descripción editorial."}</p>
          </div>
          <div className="editor-hero-meta">
            <span>Pieza</span>
            <strong>{piece.review_state.replace("_", " ")}</strong>
          </div>
        </section>
        <ContentReviewPanel piece={piece} />
      </main>
    </StitchShell>
  );
}
