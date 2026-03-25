import Link from "next/link";

import { CampaignSummary } from "@/lib/types";

function deriveStatus(campaign: CampaignSummary) {
  const { approved, in_review, ai_suggested, draft } = campaign.workflow_counts;
  if (campaign.content_piece_count > 0 && approved === campaign.content_piece_count) {
    return { label: "Finalizado", tone: "approved", action: "Ver archivo" };
  }
  if (in_review > 0) {
    return { label: "Activa", tone: "active", action: "Workbench" };
  }
  if (ai_suggested > 0) {
    return { label: "Planificación", tone: "planning", action: "Workbench" };
  }
  if (draft > 0) {
    return { label: "Borrador", tone: "draft", action: "Iniciar" };
  }
  return { label: "Nueva", tone: "planning", action: "Iniciar" };
}

export function DashboardCampaignCard({ campaign }: { campaign: CampaignSummary }) {
  const pending = campaign.workflow_counts.ai_suggested + campaign.workflow_counts.in_review;
  const progress = campaign.content_piece_count === 0 ? 0 : Math.round((campaign.workflow_counts.approved / campaign.content_piece_count) * 100);
  const status = deriveStatus(campaign);

  return (
    <article className="dashboard-card">
      <div className="dashboard-card-top">
        <div className="dashboard-card-icon" aria-hidden="true" />
        <span className={`dashboard-status dashboard-status-${status.tone}`}>{status.label}</span>
      </div>
      <div className="dashboard-card-copy">
        <h3>{campaign.name}</h3>
        <p>{campaign.description ?? "Campaña sin descripción editorial cargada."}</p>
      </div>
      <div className="dashboard-stats">
        <div>
          <span>Aprobadas</span>
          <strong>{campaign.workflow_counts.approved}</strong>
        </div>
        <div>
          <span>Pendientes</span>
          <strong>{pending}</strong>
        </div>
        <div>
          <span>Draft</span>
          <strong>{campaign.workflow_counts.draft}</strong>
        </div>
      </div>
      <div className="dashboard-progress">
        <div className="dashboard-progress-copy">
          <span>Progreso general</span>
          <strong>{progress}%</strong>
        </div>
        <div className="dashboard-progress-bar">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="dashboard-card-actions">
        <Link href={`/campaigns/${campaign.id}`} className="dashboard-primary-link">
          {status.action}
        </Link>
        <button type="button" className="dashboard-ghost-button" aria-label={`Opciones para ${campaign.name}`}>
          ⚙
        </button>
      </div>
    </article>
  );
}
