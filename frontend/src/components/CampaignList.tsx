import type { Campaign, ContentPiece } from "../types/content";
import { ContentCard } from "./ContentCard";

type Props = {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
  editingId: number | null;
  editText: string;
  targetLocaleForTranslate: Record<number, string>;
  onRefresh: () => void;
  onEditTextChange: (value: string) => void;
  onTargetLocaleChange: (contentId: number, value: string) => void;
  onStartEditing: (content: ContentPiece) => void;
  onCancelEditing: () => void;
  onSaveEdit: (contentId: number) => void;
  onGenerateDraft: (contentId: number) => void;
  onTranslate: (contentId: number, targetLocale: string) => void;
  onApprove: (content: ContentPiece) => void;
  onReject: (content: ContentPiece) => void;
  onRunPipeline: (contentId: number) => void;
};

export function CampaignList({
  campaigns,
  loading,
  error,
  editingId,
  editText,
  targetLocaleForTranslate,
  onRefresh,
  onEditTextChange,
  onTargetLocaleChange,
  onStartEditing,
  onCancelEditing,
  onSaveEdit,
  onGenerateDraft,
  onTranslate,
  onApprove,
  onReject,
  onRunPipeline,
}: Props) {
  return (
    <section className="card">
      <div className="card-header-row">
        <h2>Campaigns</h2>
        <div className="header-actions">
          <span className="live-badge" title="Refreshes every 10s">
            Live
          </span>
          <button onClick={onRefresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>
      {loading && <p>Loading campaigns...</p>}
      {error && <p className="error">{error}</p>}

      <div className="campaign-list">
        {campaigns.map((c) => (
          <div key={c.id} className="campaign-item">
            <div className="campaign-header">
              <div>
                <h3>{c.name}</h3>
                {c.description && <p className="muted">{c.description}</p>}
              </div>
              <span className="badge">
                {c.contents.length} content pieces
              </span>
            </div>

            <div className="content-grid">
              {c.contents.map((content) => (
                <ContentCard
                  key={content.id}
                  content={content}
                  editingId={editingId}
                  editText={editText}
                  targetLocale={targetLocaleForTranslate[content.id] ?? ""}
                  onEditTextChange={onEditTextChange}
                  onTargetLocaleChange={(value) =>
                    onTargetLocaleChange(content.id, value)
                  }
                  onStartEditing={() => onStartEditing(content)}
                  onCancelEditing={onCancelEditing}
                  onSaveEdit={() => onSaveEdit(content.id)}
                  onGenerateDraft={() => onGenerateDraft(content.id)}
                  onTranslate={() =>
                    onTranslate(
                      content.id,
                      targetLocaleForTranslate[content.id] ?? "",
                    )
                  }
                  onApprove={() => onApprove(content)}
                  onReject={() => onReject(content)}
                  onRunPipeline={() => onRunPipeline(content.id)}
                />
              ))}
              {c.contents.length === 0 && (
                <p className="muted">
                  No content pieces yet. Add pieces via API or create campaign
                  with contents.
                </p>
              )}
            </div>
          </div>
        ))}
        {campaigns.length === 0 && !loading && (
          <p className="muted">
            No campaigns yet. Create one to get started.
          </p>
        )}
      </div>
    </section>
  );
}
