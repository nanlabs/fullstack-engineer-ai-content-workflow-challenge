import { useEffect, useMemo, useState } from 'react';
import { getCampaigns } from '../services/campaign.service';
import type { CampaignSummary, ReviewStatus } from '../types/campaign';
import './DashboardPage.css';

export function DashboardPage() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCampaigns() {
      setLoading(true);
      setError(null);
      try {
        const result = await getCampaigns();
        setCampaigns(result);
        setSelectedCampaignId(result[0]?.id ?? null);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Unexpected error');
      } finally {
        setLoading(false);
      }
    }

    void loadCampaigns();
  }, []);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? campaigns[0],
    [campaigns, selectedCampaignId],
  );

  if (loading) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-page__card">
          <p>Loading campaigns...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-page__card">
          <p className="dashboard-page__error">{error}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-page__card">
        <div className="dashboard-page__header">
          <div>
            <h1>Campaign Dashboard</h1>
            <p className="dashboard-page__subtitle">See all campaigns and review piece statuses.</p>
          </div>
          <a className="dashboard-page__create-link" href="/create">
            Create campaign
          </a>
        </div>

        {campaigns.length === 0 ? (
          <p>No campaigns yet. Create your first campaign.</p>
        ) : (
          <div className="dashboard-page__content">
            <aside className="dashboard-page__list">
              {campaigns.map((campaign) => {
                const isSelected = campaign.id === selectedCampaign?.id;
                return (
                  <button
                    key={campaign.id}
                    className={`dashboard-page__item ${isSelected ? 'dashboard-page__item--active' : ''}`}
                    onClick={() => setSelectedCampaignId(campaign.id)}
                  >
                    <strong>{campaign.topic}</strong>
                    <span>
                      {campaign.llmProvider} / {campaign.model}
                    </span>
                    <span>{campaign.languages.join(', ')}</span>
                  </button>
                );
              })}
            </aside>

            {selectedCampaign ? (
              <section className="dashboard-page__details">
                <div className="dashboard-page__details-head">
                  <div>
                    <h2>{selectedCampaign.topic}</h2>
                    <p>{selectedCampaign.description || 'No description'}</p>
                  </div>
                  <a href={`/campaigns/${selectedCampaign.id}`}>Go to campaign detail</a>
                </div>

                <div className="dashboard-page__pieces">
                  {selectedCampaign.pieces.map((piece) => (
                    <article key={piece.id} className="dashboard-page__piece-card">
                      <h3>{piece.name}</h3>
                      <p>{piece.type}</p>
                      <div className="dashboard-page__locs">
                        {piece.localizations.map((loc) => (
                          <span
                            key={loc.id}
                            className={`dashboard-page__loc-badge ${getStatusClassName(loc.status)}`}
                          >
                            {loc.languageCode.toUpperCase()} - {loc.status}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}

function getStatusClassName(status: ReviewStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'dashboard-page__loc-badge--draft';
    case 'AI_SUGGESTED':
      return 'dashboard-page__loc-badge--ai-suggested';
    case 'REVIEWED':
      return 'dashboard-page__loc-badge--reviewed';
    case 'APPROVED':
      return 'dashboard-page__loc-badge--approved';
    case 'REJECTED':
      return 'dashboard-page__loc-badge--rejected';
    default:
      return '';
  }
}
