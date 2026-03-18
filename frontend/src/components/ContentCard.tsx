import type { ContentPiece } from "../types/content";

type Props = {
  content: ContentPiece;
  editingId: number | null;
  editText: string;
  targetLocale: string;
  onEditTextChange: (value: string) => void;
  onTargetLocaleChange: (value: string) => void;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSaveEdit: () => void;
  onGenerateDraft: () => void;
  onTranslate: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRunPipeline: () => void;
};

export function ContentCard({
  content,
  editingId,
  editText,
  targetLocale,
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
  const isEditing = editingId === content.id;
  const canTranslate = !!(content.original_text || content.ai_suggested_text);
  const canEdit = !!content.ai_suggested_text && !isEditing;
  const canApprove = !!content.ai_suggested_text || isEditing;
  const canReject =
    content.review_state === "suggested_by_ai" ||
    content.review_state === "reviewed";

  return (
    <div className="content-card">
      <div className="content-meta">
        <span className="pill">{content.type}</span>
        <span className="pill pill-secondary">{content.locale}</span>
      </div>
      <p className="label">Original</p>
      <p className="text-block">{content.original_text || "No original text"}</p>
      <p className="label">AI Suggestion</p>
      {isEditing ? (
        <div className="edit-block">
          <textarea
            value={editText}
            onChange={(e) => onEditTextChange(e.target.value)}
            rows={4}
            className="edit-textarea"
          />
          <div className="edit-actions">
            <button onClick={onSaveEdit}>Save edit</button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancelEditing}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-block">
          {content.ai_suggested_text || "No AI suggestion yet. Generate one!"}
        </p>
      )}
      <p className="label">Review State</p>
      <p className="pill pill-state">{content.review_state}</p>

      <div className="translate-row">
        <input
          type="text"
          placeholder="Target locale (e.g. es-ES)"
          value={targetLocale}
          onChange={(e) => onTargetLocaleChange(e.target.value)}
          className="locale-input"
        />
        <button
          onClick={onTranslate}
          disabled={!canTranslate}
          title="Translate original or current suggestion to target locale"
        >
          Translate
        </button>
      </div>
      <div className="actions-row">
        <button onClick={onGenerateDraft}>Generate AI Draft</button>
        <button onClick={onStartEditing} disabled={!canEdit}>
          Edit
        </button>
        <button onClick={onApprove} disabled={!canApprove}>
          Approve
        </button>
        <button
          type="button"
          className="btn-danger"
          onClick={onReject}
          disabled={!canReject}
        >
          Reject
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={onRunPipeline}
        >
          Run Full Pipeline
        </button>
      </div>
    </div>
  );
}
