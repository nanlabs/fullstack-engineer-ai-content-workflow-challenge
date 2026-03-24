import Link from "next/link";

import { CampaignForm } from "@/components/campaign-form";
import { ReviewStateBadge } from "@/components/review-state-badge";
import { fetchCampaigns } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const campaigns = await fetchCampaigns();

  return (
    <main className="page-grid">
      <CampaignForm />
      <section className="panel list-panel">
        <div className="panel-header">
          <h2>Campaign dashboard</h2>
          <p>Open a campaign to manage content pieces and review the latest AI output.</p>
        </div>
        {campaigns.length === 0 ? (
          <p className="empty-state">No campaigns yet. Create the first one from the panel on the left.</p>
        ) : (
          <div className="campaign-list">
            {campaigns.map((campaign) => (
              <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className="campaign-card">
                <div>
                  <h3>{campaign.name}</h3>
                  <p>{campaign.description ?? "No description"}</p>
                </div>
                <div className="campaign-meta">
                  <ReviewStateBadge state={campaign.content_piece_count > 0 ? "in_review" : "draft"} />
                  <span>{campaign.content_piece_count} content pieces</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
