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
      <main className="stack-layout">
        <Link href="/" className="back-link">
          ← Back to dashboard
        </Link>
        <section className="panel hero-panel">
          <div>
            <p className="eyebrow">Campaign</p>
            <h2>{campaign.name}</h2>
            <p>{campaign.description ?? "No description provided."}</p>
          </div>
          <div className="hero-metrics">
            <strong>{campaign.content_pieces.length}</strong>
            <span>content pieces in workflow</span>
          </div>
        </section>
        <CampaignWorkflowSummary counts={campaign.workflow_counts} />
        <section className="workbench-layout">
          <div className="stack-layout">
            <ContentPieceForm campaignId={campaign.id} />
            {campaign.content_pieces.length === 0 ? null : (
              <ContentPieceQueue
                campaignId={campaign.id}
                pieces={campaign.content_pieces}
                selectedPieceId={selectedPiece?.id ?? ""}
              />
            )}
          </div>
          {selectedPiece ? (
            <ContentReviewPanel piece={selectedPiece} />
          ) : (
            <div className="panel empty-state">No content pieces yet. Add one to start the workflow.</div>
          )}
        </section>
      </main>
    </StitchShell>
  );
}
