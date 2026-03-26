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

const OPERATION_LABELS: Record<ContentPiece["ai_call_history"][number]["operation_type"], string> = {
  generate_draft: "Generate Draft",
  translate: "Translate/Localize",
  extract_metadata: "Extract Metadata",
};

export function ContentReviewPanel({ piece, labMode = false }: { piece: ContentPiece; labMode?: boolean }) {
  const router = useRouter();
  const [canonicalText, setCanonicalText] = useState(piece.current_text);
  const [context, setContext] = useState("");
  const [targetLanguage, setTargetLanguage] = useState(piece.target_language ?? "en");
  const [sourceLanguage, setSourceLanguage] = useState(piece.source_language ?? "es");
  const [isTranslateModalOpen, setIsTranslateModalOpen] = useState(false);
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<string | null>(null);

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
    setSourceLanguage(piece.source_language ?? "es");
    setTargetLanguage(piece.target_language ?? "en");
  }, [
    piece.current_text,
    piece.id,
    piece.source_language,
    piece.target_language,
  ]);

  const keywords = piece.latest_metadata?.keywords ?? [];
  const metadata = piece.latest_metadata;
  const latestMetadataAttempt = piece.latest_metadata_attempt;
  const metadataFailed = latestMetadataAttempt?.status === "failed";

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
            <button
              type="button"
              className="editor-primary-button"
              disabled={pendingAction === "metadata"}
              onClick={() =>
                runAction("metadata", () =>
                  apiRequest(`/content-pieces/${piece.id}/ai/extract-metadata`, { method: "POST" }),
                )
              }
            >
              {pendingAction === "metadata" ? "Extracting..." : "Extract Metadata"}
            </button>
          </div>
          <p className="editor-canonical-note">Extract metadata from the latest saved canonical text.</p>
        </section>

        <section className="editor-ai-section">
          <div className="editor-ai-header">
            <div className="editor-ai-title">
              <span className="editor-ai-star">✦</span>
              <h3>AI Workspace</h3>
            </div>
            {labMode ? (
              <button
                type="button"
                className="editor-secondary-button editor-lab-button"
                onClick={() => setIsLabModalOpen(true)}
              >
                View AI Logs
              </button>
            ) : null}
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
            </div>
            <p className="editor-suggestion-copy">
              {latestReviewableSuggestion?.output_text ??
                "Generate a first draft from the current canonical text to bring an AI proposal into this workspace."}
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
                className="editor-danger-button"
                disabled={!latestReviewableSuggestion || pendingAction === "reject"}
                onClick={() =>
                  runAction("reject", () =>
                    apiRequest(`/content-pieces/${piece.id}/review`, {
                      method: "POST",
                      body: JSON.stringify({
                        action: "reject",
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
        </section>
        {error ? <p className="error-text">{error}</p> : null}
      </div>

      <aside className="editor-side-panel">
        <section className="editor-metadata-panel">
          <header className="editor-side-header">
            <div className="editor-metadata-heading">
              <h3>Extracted Metadata</h3>
              <p>Reflects the latest saved canonical text.</p>
            </div>
            <span className="editor-soft-chip">
              {metadata ? "Ready" : metadataFailed ? "Failed" : "Pending"}
            </span>
          </header>
          {metadata ? (
            <>
              <div className="editor-metadata-grid">
                <div className="editor-side-section">
                  <label>Tone</label>
                  <span className="editor-soft-chip">{metadata.tone}</span>
                </div>
                <div className="editor-side-section">
                  <label>Sentiment</label>
                  <span className="editor-soft-chip">{metadata.sentiment}</span>
                </div>
                <div className="editor-side-section">
                  <label>Audience</label>
                  <p>{metadata.audience}</p>
                </div>
                <div className="editor-side-section">
                  <label>Goal</label>
                  <p>{metadata.goal}</p>
                </div>
                <div className="editor-side-section">
                  <label>Campaign Theme</label>
                  <p>{metadata.campaign_theme}</p>
                </div>
                <div className="editor-side-section">
                  <label>Channel Fit</label>
                  <p>{metadata.channel_fit}</p>
                </div>
                <div className="editor-side-section">
                  <label>CTA Strength</label>
                  <span className="editor-keyword-chip">{metadata.cta_strength}</span>
                </div>
              </div>
              <div className="editor-side-section">
                <label>Keywords</label>
                <div className="editor-chip-row">
                  {keywords.length > 0 ? (
                    keywords.map((keyword) => (
                      <span key={keyword} className="editor-keyword-chip">
                        {keyword}
                      </span>
                    ))
                  ) : (
                    <span className="editor-soft-chip">No keywords returned</span>
                  )}
                </div>
              </div>
            </>
          ) : metadataFailed ? (
            <div className="editor-side-section editor-metadata-failure">
              <label>Metadata Status</label>
              <div className="editor-chip-row">
                <span className="editor-failure-chip">Failed</span>
              </div>
              <p>Metadata extraction failed for the latest saved canonical text.</p>
              <pre>{latestMetadataAttempt?.output_text ?? "Unknown metadata extraction error."}</pre>
              {labMode ? (
                <button
                  type="button"
                  className="editor-secondary-button editor-lab-button"
                  onClick={() => setIsLabModalOpen(true)}
                >
                  View failed call in Lab Mode
                </button>
              ) : null}
            </div>
          ) : (
            <div className="editor-side-section">
              <label>Metadata Status</label>
              <div className="editor-chip-row">
                <span className="editor-soft-chip">Awaiting extraction from canonical text</span>
              </div>
            </div>
          )}
        </section>

        <section className="editor-preview-card">
          <label>Translation Versions</label>
          <div className="editor-translation-history">
            {piece.translation_versions.length > 0 ? (
              piece.translation_versions.map((translation) => (
                <article key={translation.id} className="editor-translation-item">
                  <div className="editor-translation-meta">
                    <strong>
                      {translation.source_language ?? "?"} → {translation.target_language ?? "?"}
                    </strong>
                    <span>{new Date(translation.created_at).toLocaleString()}</span>
                  </div>
                  <p>{translation.output_text ?? "No translated output returned."}</p>
                </article>
              ))
            ) : (
              <p className="editor-preview-caption">
                No translations yet. Use Translate/Localize to generate localized versions from the canonical text.
              </p>
            )}
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

      {labMode && isLabModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card editor-lab-modal" role="dialog" aria-modal="true" aria-labelledby="lab-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Lab Mode</p>
                <h4 id="lab-modal-title">AI Call History</h4>
              </div>
              <button type="button" className="stitch-icon-button" onClick={() => setIsLabModalOpen(false)}>
                ×
              </button>
            </div>
            <p className="muted">
              Metadata extraction uses the canonical text saved at the time of the call. This view is visible only when
              the editor URL includes <code>lab=1</code>.
            </p>
            <div className="editor-lab-history">
              {piece.ai_call_history.length > 0 ? (
                piece.ai_call_history.map((call, index) => (
                  <article key={call.id} className="editor-lab-entry">
                    <div className="editor-lab-entry-header">
                      <div className="editor-lab-step">
                        <span className="editor-suggestion-badge">Step {index + 1}</span>
                        <h5>{OPERATION_LABELS[call.operation_type]}</h5>
                      </div>
                      <div className="editor-lab-meta">
                        <span>{call.provider}</span>
                        <span>{call.model}</span>
                        <span>{new Date(call.created_at).toLocaleString()}</span>
                        <span className="editor-soft-chip">{call.status}</span>
                      </div>
                    </div>
                    {call.source_language || call.target_language ? (
                      <p className="editor-lab-language">
                        {call.source_language ?? "?"} → {call.target_language ?? "?"}
                      </p>
                    ) : null}
                    <div className="editor-lab-panels">
                      <section className="editor-lab-block">
                        <label>Input text</label>
                        <pre>{call.input_text}</pre>
                      </section>
                      <section className="editor-lab-block">
                        <label>
                          {call.operation_type === "extract_metadata"
                            ? "Extracted metadata"
                            : call.status === "failed"
                              ? "Failure output"
                              : "Output"}
                        </label>
                        <pre>
                          {call.operation_type === "extract_metadata"
                            ? JSON.stringify(call.structured_output_json ?? {}, null, 2)
                            : call.output_text ?? "No output returned."}
                        </pre>
                      </section>
                    </div>
                  </article>
                ))
              ) : (
                <section className="editor-lab-empty">
                  <p>No AI calls recorded yet for this content piece.</p>
                </section>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
