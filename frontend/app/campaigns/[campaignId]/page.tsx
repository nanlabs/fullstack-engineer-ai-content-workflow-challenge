import Link from "next/link";

import { ContentPieceForm } from "@/components/content-piece-form";
import { ContentReviewPanel } from "@/components/content-review-panel";
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
      <ContentPieceForm campaignId={campaign.id} />
      <section className="stack-layout">
        {campaign.content_pieces.length === 0 ? (
          <div className="panel empty-state">No content pieces yet. Add one to start the workflow.</div>
        ) : (
          campaign.content_pieces.map((piece) => <ContentReviewPanel key={piece.id} piece={piece} />)
        )}
      </section>
    </main>
  );
}
