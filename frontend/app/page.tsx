import Link from "next/link";

import { CampaignForm } from "@/components/campaign-form";
import { CampaignWorkflowSummary } from "@/components/campaign-workflow-summary";
import { StitchShell } from "@/components/stitch-shell";
import { fetchCampaigns } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const campaigns = await fetchCampaigns();

  return (
    <StitchShell activeHref="/" pageTitle="Campaign Manager">
      <main className="page-grid">
        <CampaignForm />
        <section className="panel list-panel">
          <div className="panel-header">
            <h2>Campaign dashboard</h2>
            <p>Track which campaigns are waiting on AI, active review, or ready to ship.</p>
          </div>
          {campaigns.length === 0 ? (
            <p className="empty-state">No campaigns yet. Start one from the campaign brief panel and build the first review queue.</p>
          ) : (
            <div className="campaign-list">
              {campaigns.map((campaign) => (
                <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className="campaign-card">
                  <div className="campaign-card-header">
                    <h3>{campaign.name}</h3>
                    <p>{campaign.description ?? "No description"}</p>
                  </div>
                  <div className="campaign-meta">
                    <span>{campaign.content_piece_count} content pieces</span>
                    <span>{campaign.workflow_counts.in_review + campaign.workflow_counts.ai_suggested} active in workflow</span>
                  </div>
                  <CampaignWorkflowSummary counts={campaign.workflow_counts} />
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </StitchShell>
  );
}
