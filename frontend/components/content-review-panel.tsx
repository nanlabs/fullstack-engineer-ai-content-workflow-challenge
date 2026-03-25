"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { ContentPiece } from "@/lib/types";
import { useContentEvents } from "@/lib/use-content-events";
import { ReviewStateBadge } from "@/components/review-state-badge";

const STATE_NOTES: Record<ContentPiece["review_state"], string> = {
  draft: "Start from the canonical text, then ask AI for a first draft or translate it when the content is ready.",
  ai_suggested: "There is an AI proposal ready for editorial review.",
  in_review: "This piece is currently under human review.",
  approved: "The current canonical text is approved and ready to ship.",
  rejected: "The latest proposal was rejected. You can refine or translate the canonical text again.",
};

export function ContentReviewPanel({ piece }: { piece: ContentPiece }) {
  const router = useRouter();
  const initialEditedText = piece.latest_reviewable_suggestion?.output_text ?? piece.current_text;
  const [canonicalText, setCanonicalText] = useState(piece.current_text);
  const [context, setContext] = useState("");
  const [targetLanguage, setTargetLanguage] = useState(piece.target_language ?? "en");
  const [sourceLanguage, setSourceLanguage] = useState(piece.source_language ?? "es");
  const [isTranslateModalOpen, setIsTranslateModalOpen] = useState(false);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [editedText, setEditedText] = useState(initialEditedText);
  const [comment, setComment] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<string | null>(null);

  const latestSuggestion = piece.latest_suggestion;
  const latestReviewableSuggestion = piece.latest_reviewable_suggestion;
  const title = useMemo(() => {
    const trimmed = piece.current_text.trim();
    return trimmed.length > 72 ? `${trimmed.slice(0, 72)}...` : trimmed || "Untitled Content Piece";
  }, [piece.current_text]);

  const refreshForPiece = useCallback(
    (contentPieceId: string) => {
      if (contentPieceId === piece.id) {
        setLastLiveUpdate(new Date().toLocaleTimeString());
        router.refresh();
      }
    },
    [piece.id, router],
  );

  useContentEvents(piece.campaign_id, refreshForPiece);

  async function runAction(actionKey: string, request: () => Promise<unknown>) {
    setPendingAction(actionKey);
    setError(null);
    try {
      await request();
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Request failed");
    } finally {
      setPendingAction(null);
    }
  }

  useEffect(() => {
    setCanonicalText(piece.current_text);
    setEditedText(piece.latest_reviewable_suggestion?.output_text ?? piece.current_text);
    setSourceLanguage(piece.source_language ?? "es");
    setTargetLanguage(piece.target_language ?? "en");
  }, [
    piece.current_text,
    piece.id,
    piece.latest_reviewable_suggestion?.id,
    piece.latest_reviewable_suggestion?.output_text,
    piece.source_language,
    piece.target_language,
  ]);

  const keywords = piece.latest_metadata?.keywords ?? [];
  const readabilityScore = piece.latest_metadata ? (piece.latest_metadata.sentiment === "positive" ? 85 : 62) : 0;

  return (
    <article className="editor-workspace">
      <div className="editor-canvas">
        <header className="editor-document-header">
          <div className="editor-document-meta">
            <span className="editor-section-label">Document Piece</span>
            <ReviewStateBadge state={piece.review_state} />
          </div>
          <h1>{title}</h1>
        </header>

        <section className="editor-canonical-section">
          <div className="editor-section-bar">
            <label>Canonical Text</label>
            <span>{lastLiveUpdate ? `Live updated ${lastLiveUpdate}` : "Last edited just now"}</span>
          </div>
          <div className="editor-canonical-card">
            <textarea
              value={canonicalText}
              onChange={(event) => setCanonicalText(event.target.value)}
              placeholder="Start typing your content piece here..."
            />
          </div>
          <div className="editor-inline-actions">
            <button
              type="button"
              className="editor-secondary-button"
              disabled={pendingAction === "save-canonical" || canonicalText === piece.current_text}
              onClick={() =>
                runAction("save-canonical", () =>
                  apiRequest(`/content-pieces/${piece.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ current_text: canonicalText }),
                  }),
                )
              }
            >
              {pendingAction === "save-canonical" ? "Saving..." : "Save Canonical Text"}
            </button>
          </div>
        </section>

        <section className="editor-ai-section">
          <div className="editor-ai-header">
            <div className="editor-ai-title">
              <span className="editor-ai-star">✦</span>
              <h3>AI Workspace</h3>
            </div>
            <label className="editor-context-input">
              <span>Context</span>
              <input value={context} onChange={(event) => setContext(event.target.value)} />
            </label>
          </div>

          <div className="editor-ai-actions">
            <button
              type="button"
              className="editor-ghost-button"
              disabled={pendingAction === "draft"}
              onClick={() =>
                runAction("draft", () =>
                  apiRequest(`/content-pieces/${piece.id}/ai/generate-draft`, {
                    method: "POST",
                    body: JSON.stringify({ context: context || null }),
                  }),
                )
              }
            >
              {pendingAction === "draft" ? "Generating..." : "Generate Draft"}
            </button>
            <button
              type="button"
              className="editor-primary-button"
              disabled={pendingAction === "refine"}
              onClick={() =>
                runAction("refine", () =>
                  apiRequest(`/content-pieces/${piece.id}/ai/generate-draft`, {
                    method: "POST",
                    body: JSON.stringify({ context: context || "Refine the canonical text with a stronger hook." }),
                  }),
                )
              }
            >
              {pendingAction === "refine" ? "Refining..." : "Refine with AI"}
            </button>
            <button
              type="button"
              className="editor-ghost-button"
              disabled={pendingAction === "translate"}
              onClick={() => setIsTranslateModalOpen(true)}
            >
              Translate/Localize
            </button>
          </div>

          <section className="editor-suggestion-card">
            <div className="editor-suggestion-header">
              <div className="editor-suggestion-meta">
                <span className="editor-suggestion-badge">AI Suggestion</span>
                <span className="editor-suggestion-note">
                  {latestReviewableSuggestion ? "Optimized for engagement" : "No AI suggestion yet"}
                </span>
              </div>
              <button type="button" className="editor-close-button" onClick={() => setIsEditPanelOpen(false)}>
                ×
              </button>
            </div>
            <p className="editor-suggestion-copy">
              {latestReviewableSuggestion?.output_text ??
                "Generate a first draft or refine the canonical text to bring an AI proposal into this workspace."}
            </p>
            <div className="editor-suggestion-actions">
              <button
                type="button"
                className="editor-primary-dark-button"
                disabled={!latestReviewableSuggestion || pendingAction === "accept"}
                onClick={() =>
                  runAction("accept", () =>
                    apiRequest(`/content-pieces/${piece.id}/review`, {
                      method: "POST",
                      body: JSON.stringify({
                        action: "accept",
                        comment: comment || null,
                        ai_suggestion_id: latestReviewableSuggestion?.id ?? null,
                      }),
                    }),
                  )
                }
              >
                Accept
              </button>
              <button
                type="button"
                className="editor-muted-button"
                onClick={() => setIsEditPanelOpen((current) => !current)}
              >
                Edit
              </button>
              <button
                type="button"
                className="editor-danger-button"
                disabled={!latestReviewableSuggestion || pendingAction === "reject"}
                onClick={() =>
                  runAction("reject", () =>
                    apiRequest(`/content-pieces/${piece.id}/review`, {
                      method: "POST",
                      body: JSON.stringify({
                        action: "reject",
                        comment: comment || null,
                        ai_suggestion_id: latestReviewableSuggestion?.id ?? null,
                      }),
                    }),
                  )
                }
              >
                Reject
              </button>
            </div>
          </section>

          {isEditPanelOpen ? (
            <section className="editor-review-panel">
              <label>
                <span>Editorial Comment</span>
                <input value={comment} onChange={(event) => setComment(event.target.value)} />
              </label>
              <label>
                <span>Edited Suggestion</span>
                <textarea rows={5} value={editedText} onChange={(event) => setEditedText(event.target.value)} />
              </label>
              <div className="editor-inline-actions">
                <button
                  type="button"
                  className="editor-secondary-button"
                  disabled={pendingAction === "review"}
                  onClick={() =>
                    runAction("review", () =>
                      apiRequest(`/content-pieces/${piece.id}/review`, {
                        method: "POST",
                        body: JSON.stringify({ action: "start_review", comment: comment || null }),
                      }),
                    )
                  }
                >
                  Start Review
                </button>
                <button
                  type="button"
                  className="editor-primary-button"
                  disabled={pendingAction === "edit"}
                  onClick={() =>
                    runAction("edit", () =>
                      apiRequest(`/content-pieces/${piece.id}/review`, {
                        method: "POST",
                        body: JSON.stringify({
                          action: "edit",
                          comment: comment || null,
                          edited_text: editedText,
                          ai_suggestion_id: latestReviewableSuggestion?.id ?? null,
                        }),
                      }),
                    )
                  }
                >
                  Approve Edit
                </button>
              </div>
            </section>
          ) : null}
        </section>
        {error ? <p className="error-text">{error}</p> : null}
      </div>

      <aside className="editor-side-panel">
        <section className="editor-metadata-panel">
          <header className="editor-side-header">
            <h3>Extracted Metadata</h3>
            <button
              type="button"
              className="content-list-icon-button"
              disabled={pendingAction === "metadata"}
              onClick={() =>
                runAction("metadata", () =>
                  apiRequest(`/content-pieces/${piece.id}/ai/extract-metadata`, { method: "POST" }),
                )
              }
            >
              i
            </button>
          </header>
          <div className="editor-side-section">
            <label>Tone Profile</label>
            <div className="editor-chip-row">
              {piece.latest_metadata ? (
                <span className="editor-soft-chip">{piece.latest_metadata.tone}</span>
              ) : (
                <span className="editor-soft-chip">Awaiting extraction</span>
              )}
            </div>
          </div>
          <div className="editor-side-section">
            <label>Target Keywords</label>
            <div className="editor-chip-row">
              {keywords.length > 0 ? (
                keywords.map((keyword) => (
                  <span key={keyword} className="editor-keyword-chip">
                    {keyword}
                  </span>
                ))
              ) : (
                <span className="editor-soft-chip">No keywords yet</span>
              )}
            </div>
          </div>
          <div className="editor-side-section">
            <label>Readability Index</label>
            <div className="editor-readability-row">
              <div className="editor-readability-bar">
                <span style={{ width: `${readabilityScore}%` }} />
              </div>
              <strong>{readabilityScore}/100</strong>
            </div>
          </div>
        </section>

        <section className="editor-preview-card">
          <label>Layout Context</label>
          <div className="editor-preview-visual">
            <div className="editor-preview-overlay">
              <p>Canonical Preview</p>
              <span>{piece.target_language ? `${piece.source_language ?? "?"} → ${piece.target_language}` : "Base content"}</span>
            </div>
          </div>
          <p className="editor-preview-caption">{piece.source_text}</p>
        </section>

        <section className="editor-tip-card">
          <div className="editor-tip-header">
            <span>Editor Tip</span>
          </div>
          <p>{STATE_NOTES[piece.review_state]}</p>
          {piece.latest_review_action ? (
            <p className="editor-tip-meta">
              Last action: {piece.latest_review_action.action}
              {piece.latest_review_action.comment ? ` · ${piece.latest_review_action.comment}` : ""}
            </p>
          ) : null}
        </section>
      </aside>

      {isTranslateModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="translate-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Translation</p>
                <h4 id="translate-modal-title">Translate this content</h4>
              </div>
              <button type="button" className="stitch-icon-button" onClick={() => setIsTranslateModalOpen(false)}>
                ×
              </button>
            </div>
            <p className="muted">
              Translate the current canonical text of this piece. Save the canonical text first if you want to translate a different version.
            </p>
            <section className="content-surface">
              <h4>Current text</h4>
              <p>{piece.current_text}</p>
            </section>
            <div className="action-grid">
              <label>
                <span>From</span>
                <input value={sourceLanguage} onChange={(event) => setSourceLanguage(event.target.value)} />
              </label>
              <label>
                <span>To</span>
                <input value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)} />
              </label>
            </div>
            <div className="button-row">
              <button type="button" className="button-secondary" onClick={() => setIsTranslateModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={pendingAction === "translate"}
                onClick={() =>
                  runAction("translate", async () => {
                    await apiRequest(`/content-pieces/${piece.id}/ai/translate`, {
                      method: "POST",
                      body: JSON.stringify({
                        context: context || null,
                        source_language: sourceLanguage,
                        target_language: targetLanguage,
                      }),
                    });
                    setIsTranslateModalOpen(false);
                  })
                }
              >
                {pendingAction === "translate" ? "Translating..." : "Translate"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
