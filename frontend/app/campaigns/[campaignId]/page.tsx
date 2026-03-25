import Link from "next/link";

import { CampaignWorkflowSummary } from "@/components/campaign-workflow-summary";
import { ContentPieceForm } from "@/components/content-piece-form";
import { ContentPieceQueue } from "@/components/content-piece-queue";
import { ContentReviewPanel } from "@/components/content-review-panel";
import { StitchShell } from "@/components/stitch-shell";
import { fetchCampaign } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function CampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ pieceId?: string }>;
}) {
  const { campaignId } = await params;
  const { pieceId } = await searchParams;
  const campaign = await fetchCampaign(campaignId);
  const selectedPiece =
    campaign.content_pieces.find((piece) => piece.id === pieceId) ?? campaign.content_pieces[0] ?? null;

  return (
    <StitchShell activeHref="/campaigns/new" pageTitle="Campaign Manager">
      <main className="workbench-page">
        <div className="workbench-page-top">
          <Link href="/" className="back-link">
            ← Volver al dashboard
          </Link>
          <span className="workbench-page-tag">Mesa de trabajo editorial</span>
        </div>
        <section className="workbench-hero">
          <div>
            <p className="eyebrow">Campaña</p>
            <h2>{campaign.name}</h2>
            <p>{campaign.description ?? "Sin descripción editorial."}</p>
          </div>
          <div className="workbench-hero-metrics">
            <div>
              <span>Piezas</span>
              <strong>{campaign.content_pieces.length}</strong>
            </div>
            <div>
              <span>Activas</span>
              <strong>{campaign.workflow_counts.in_review + campaign.workflow_counts.ai_suggested}</strong>
            </div>
          </div>
        </section>
        <section className="workbench-summary-card">
          <CampaignWorkflowSummary counts={campaign.workflow_counts} />
        </section>
        <section className="workbench-layout">
          <aside className="workbench-sidebar-column">
            <ContentPieceForm campaignId={campaign.id} />
            {campaign.content_pieces.length === 0 ? null : (
              <ContentPieceQueue
                campaignId={campaign.id}
                pieces={campaign.content_pieces}
                selectedPieceId={selectedPiece?.id ?? ""}
              />
            )}
          </aside>
          <section className="workbench-main-column">
            {selectedPiece ? (
              <ContentReviewPanel piece={selectedPiece} />
            ) : (
              <div className="panel empty-state">No hay piezas todavía. Creá una pieza para empezar el flujo editorial.</div>
            )}
          </section>
        </section>
      </main>
    </StitchShell>
  );
}
