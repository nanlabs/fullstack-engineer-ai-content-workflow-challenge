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
  const approvedCount = campaign.workflow_counts.approved;
  const pendingCount = campaign.workflow_counts.ai_suggested + campaign.workflow_counts.in_review;
  const progress = campaign.content_pieces.length === 0 ? 0 : Math.round((approvedCount / campaign.content_pieces.length) * 100);

  return (
    <StitchShell activeHref="/" pageTitle="Campaign Editor" pageSubtitle={campaign.name}>
      <main className="campaign-content-list-screen">
        <section className="campaign-content-header">
          <div>
            <div className="campaign-content-status">
              <span>Active Project</span>
            </div>
            <h2>{campaign.name}</h2>
            <p>
              {campaign.description ??
                "Comprehensive creative oversight for this campaign. Manage content pieces, drafts, translations, and approvals from one workbench."}
            </p>
          </div>
          <ContentPieceForm campaignId={campaign.id} />
        </section>
        <section className="campaign-content-grid">
          <div className="campaign-stat-card">
            <p className="campaign-panel-label">Project Health</p>
            <div className="campaign-stat-stack">
              <div className="campaign-stat-row">
                <span>Total Pieces</span>
                <strong>{campaign.content_pieces.length}</strong>
              </div>
              <div className="campaign-progress-bar">
                <span style={{ width: `${progress}%` }} />
              </div>
              <p>{approvedCount} items approved, {pendingCount} pending review.</p>
            </div>
          </div>
          <div className="campaign-ai-card">
            <div className="campaign-ai-card-copy">
              <p className="campaign-panel-label campaign-panel-label-secondary">AI Workspace Suggestion</p>
              <h3>Tone Consistency Check</h3>
              <p>
                Your active pieces are ready for refinement. Open a content piece to improve the canonical text,
                generate a first draft, or localize it on demand.
              </p>
            </div>
          </div>
          <div className="campaign-content-main">
            {campaign.content_pieces.length > 0 ? (
              <ContentPieceQueue campaignId={campaign.id} pieces={campaign.content_pieces} />
            ) : (
              <section className="content-list-card">
                <div className="content-list-card-header">
                  <h3>Content Pieces</h3>
                </div>
                <div className="campaign-empty-list">
                  <p>No content pieces yet. Add one to start the editorial flow.</p>
                </div>
              </section>
            )}
          </div>
        </section>
      </main>
    </StitchShell>
  );
}
