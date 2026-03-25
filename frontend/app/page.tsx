import Link from "next/link";

import { DashboardAiBanner } from "@/components/dashboard-ai-banner";
import { DashboardCampaignCard } from "@/components/dashboard-campaign-card";
import { StitchShell } from "@/components/stitch-shell";
import { fetchCampaigns } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const campaigns = await fetchCampaigns();

  return (
    <StitchShell activeHref="/" pageTitle="Campaign Manager">
      <main className="dashboard-layout">
        <section className="dashboard-heading">
          <div>
            <h2>Panel de Campañas</h2>
            <p>Supervisión editorial y progreso operativo en tiempo real.</p>
          </div>
          <Link href="/campaigns/new" className="dashboard-create-button">
            + Nueva Campaña
          </Link>
        </section>

        {campaigns.length === 0 ? (
          <section className="dashboard-empty">
            <h3>No hay campañas todavía</h3>
            <p>Iniciá una campaña nueva para empezar a poblar el workbench editorial.</p>
          </section>
        ) : (
          <section className="dashboard-grid">
            {campaigns.map((campaign) => (
              <DashboardCampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </section>
        )}

        <DashboardAiBanner />
      </main>
    </StitchShell>
  );
}
