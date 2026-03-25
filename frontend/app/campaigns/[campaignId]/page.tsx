import Link from "next/link";

import { CampaignWorkflowSummary } from "@/components/campaign-workflow-summary";
import { ContentPieceForm } from "@/components/content-piece-form";
import { ContentPieceQueue } from "@/components/content-piece-queue";
import { StitchShell } from "@/components/stitch-shell";
import { fetchCampaign } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const campaign = await fetchCampaign(campaignId);

  return (
    <StitchShell activeHref="/campaigns/new" pageTitle="Campaign Manager">
      <main className="content-list-page">
        <div className="workbench-page-top">
          <Link href="/" className="back-link">
            ← Volver al dashboard
          </Link>
          <span className="workbench-page-tag">Campaign Content List</span>
        </div>
        <section className="content-list-hero">
          <div>
            <p className="eyebrow">Campaña</p>
            <h2>{campaign.name}</h2>
            <p>{campaign.description ?? "Sin descripción editorial."}</p>
          </div>
          <div className="content-list-hero-metrics">
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
        <section className="content-list-summary-card">
          <CampaignWorkflowSummary counts={campaign.workflow_counts} />
        </section>
        <section className="content-list-layout">
          <div className="content-list-create-column">
            <ContentPieceForm campaignId={campaign.id} />
          </div>
          <div className="content-list-main-column">
            {campaign.content_pieces.length > 0 ? (
              <ContentPieceQueue campaignId={campaign.id} pieces={campaign.content_pieces} />
            ) : (
              <div className="panel empty-state">
                No hay piezas todavía. Creá una pieza simple para arrancar el flujo editorial.
              </div>
            )}
          </div>
        </section>
      </main>
    </StitchShell>
  );
}
