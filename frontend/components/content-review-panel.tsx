"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { ContentPiece, DraftDecisionStatus, ProviderSettings, ReviewState } from "@/lib/types";
import { ProviderSettingsModal } from "@/components/provider-settings-modal";
import { useContentEvents } from "@/lib/use-content-events";
import { ReviewStateBadge } from "@/components/review-state-badge";
import { SettingsIcon } from "@/components/stitch-icons";

const STATE_NOTES: Record<ContentPiece["review_state"], string> = {
  draft:
    "Start from the canonical text, then ask AI for a first draft or translate it when the content is ready.",
  ai_suggested: "There is an AI proposal ready for editorial review.",
  in_review: "This piece is currently under human review.",
  approved: "The current canonical text is approved and ready to ship.",
  rejected:
    "The latest proposal was rejected. You can refine or translate the canonical text again.",
};

const OPERATION_LABELS: Record<
  ContentPiece["ai_call_history"][number]["operation_type"],
  string
> = {
  generate_draft: "Generate Draft",
  translate: "Translate/Localize",
  extract_metadata: "Extract Metadata",
};

const REVIEW_STATE_LABELS: Record<ReviewState, string> = {
  draft: "Draft",
  ai_suggested: "AI Suggested",
  in_review: "In Review",
  approved: "Approved",
  rejected: "Rejected",
};

const DRAFT_DECISION_LABELS: Record<DraftDecisionStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
};

export function ContentReviewPanel({
  piece,
  labMode = false,
  initialProviderSettings,
}: {
  piece: ContentPiece;
  labMode?: boolean;
  initialProviderSettings: ProviderSettings;
}) {
  const router = useRouter();
  const [canonicalText, setCanonicalText] = useState(piece.current_text);
  const [context, setContext] = useState("");
  const [targetLanguage, setTargetLanguage] = useState(
    piece.target_language ?? "en",
  );
  const [sourceLanguage, setSourceLanguage] = useState(
    piece.source_language ?? "es",
  );
  const [isTranslateModalOpen, setIsTranslateModalOpen] = useState(false);
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [draftToReject, setDraftToReject] = useState<
    ContentPiece["draft_history"][number] | null
  >(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<string | null>(null);
  const [providerSettings, setProviderSettings] = useState(initialProviderSettings);
  const [pendingProviderAction, setPendingProviderAction] = useState<null | (() => Promise<void>)>(null);

  const title = useMemo(() => {
    const trimmed = piece.current_text.trim();
    return trimmed.length > 72
      ? `${trimmed.slice(0, 72)}...`
      : trimmed || "Untitled Content Piece";
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
      setError(
        actionError instanceof Error ? actionError.message : "Request failed",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function runProviderAwareAction(
    actionKey: string,
    request: () => Promise<unknown>,
  ) {
    if (!providerSettings.configured) {
      setPendingProviderAction(() => () => runAction(actionKey, request));
      setIsProviderModalOpen(true);
      return;
    }
    await runAction(actionKey, request);
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
            <label className="editor-status-select">
              <span>Content Status</span>
              <select
                value={piece.review_state}
                disabled={pendingAction === "status"}
                onChange={(event) =>
                  runAction("status", () =>
                    apiRequest(`/content-pieces/${piece.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({
                        review_state: event.target.value,
                      }),
                    }),
                  )
                }
              >
                {Object.entries(REVIEW_STATE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <h1>{title}</h1>
        </header>

        <section className="editor-canonical-section">
          <div className="editor-section-bar">
            <label>Canonical Text</label>
            <span>
              {lastLiveUpdate
                ? `Live updated ${lastLiveUpdate}`
                : "Last edited just now"}
            </span>
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
              disabled={
                pendingAction === "save-canonical" ||
                canonicalText === piece.current_text
              }
              onClick={() =>
                runAction("save-canonical", () =>
                  apiRequest(`/content-pieces/${piece.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ current_text: canonicalText }),
                  }),
                )
              }
            >
              {pendingAction === "save-canonical"
                ? "Saving..."
                : "Save Canonical Text"}
            </button>
            <button
              type="button"
              className="editor-primary-button"
              disabled={pendingAction === "metadata"}
              onClick={() =>
                runProviderAwareAction("metadata", () =>
                  apiRequest(
                    `/content-pieces/${piece.id}/ai/extract-metadata`,
                    { method: "POST" },
                  ),
                )
              }
            >
              {pendingAction === "metadata"
                ? "Extracting..."
                : "Extract Metadata"}
            </button>
          </div>
          <p className="editor-canonical-note">
            Extract metadata from the latest saved canonical text.
          </p>
        </section>

        <section className="editor-ai-section">
          <div className="editor-ai-header">
            <div className="editor-ai-title">
              <span className="editor-ai-star">✦</span>
              <h3>AI Workspace</h3>
              <button
                type="button"
                className="stitch-icon-button editor-provider-button"
                aria-label="Configure AI provider"
                onClick={() => setIsProviderModalOpen(true)}
              >
                <SettingsIcon />
              </button>
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
          </div>

          <label className="editor-context-input">
            <span>Context</span>
            <input
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="Optional generation context"
            />
          </label>

          <div className="editor-ai-actions">
            <button
              type="button"
              className="editor-ghost-button"
              disabled={pendingAction === "draft"}
              onClick={() =>
                runProviderAwareAction("draft", () =>
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
              onClick={() => {
                if (!providerSettings.configured) {
                  setPendingProviderAction(() => async () => {
                    setIsTranslateModalOpen(true);
                  });
                  setIsProviderModalOpen(true);
                  return;
                }
                setIsTranslateModalOpen(true);
              }}
            >
              Translate/Localize
            </button>
          </div>

          <section className="editor-draft-history">
            <div className="editor-draft-history-header">
              <div>
                <span className="editor-suggestion-badge">Draft History</span>
                <p className="editor-suggestion-note">
                  Draft decisions stay in AI history. Content status is managed
                  separately.
                </p>
              </div>
            </div>
            {piece.draft_history.length > 0 ? (
              <div className="editor-draft-history-list">
                {piece.draft_history.map((draft, index) => (
                  <article key={draft.id} className="editor-suggestion-card">
                    <div className="editor-suggestion-header">
                      <div className="editor-suggestion-meta">
                        <span className="editor-suggestion-badge">
                          Draft {piece.draft_history.length - index}
                        </span>
                        <span
                          className={`editor-soft-chip editor-draft-decision editor-draft-decision-${draft.decision_status}`}
                        >
                          {DRAFT_DECISION_LABELS[draft.decision_status]}
                        </span>
                      </div>
                      <span className="editor-suggestion-note">
                        {new Date(draft.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="editor-suggestion-copy">
                      {draft.output_text}
                    </p>
                    <div className="editor-suggestion-footer">
                      <span className="editor-suggestion-note">
                        {draft.provider} · {draft.model}
                      </span>
                    </div>
                    {draft.decision_status === "pending" ? (
                      <div className="editor-suggestion-actions">
                        <button
                          type="button"
                          className="editor-primary-dark-button"
                          disabled={pendingAction === `accept-${draft.id}`}
                          onClick={() =>
                            runAction(`accept-${draft.id}`, () =>
                              apiRequest(`/content-pieces/${piece.id}/review`, {
                                method: "POST",
                                body: JSON.stringify({
                                  action: "accept",
                                  ai_suggestion_id: draft.id,
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
                          disabled={pendingAction === `reject-${draft.id}`}
                          onClick={() => setDraftToReject(draft)}
                        >
                          Reject
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <section className="editor-suggestion-card editor-draft-history-empty">
                <p className="editor-suggestion-copy">
                  Generate a first draft from the current canonical text to
                  start the AI history for this piece.
                </p>
              </section>
            )}
          </section>
        </section>
        {error ? <p className="error-text">{error}</p> : null}
      </div>

      <aside className="editor-side-panel">
        <section className="editor-metadata-panel">
          <header className="editor-side-header">
            <div className="editor-metadata-heading">
              <h3>Extracted Metadata</h3>
              <p>Based on the latest saved canonical text.</p>
            </div>
            <span className="editor-soft-chip">
              {metadata ? "Ready" : metadataFailed ? "Failed" : "Pending"}
            </span>
          </header>
          {metadata ? (
            <>
              <div className="editor-metadata-grid">
                <div className="editor-side-section editor-side-section--card">
                  <label>Tone</label>
                  <span className="editor-soft-chip">{metadata.tone}</span>
                </div>
                <div className="editor-side-section editor-side-section--card">
                  <label>Sentiment</label>
                  <span className="editor-soft-chip">{metadata.sentiment}</span>
                </div>
                <div className="editor-side-section editor-side-section--card">
                  <label>Channel Fit</label>
                  <p>{metadata.channel_fit}</p>
                </div>
                <div className="editor-side-section editor-side-section--card">
                  <label>CTA Strength</label>
                  <span className="editor-keyword-chip">
                    {metadata.cta_strength}
                  </span>
                </div>
              </div>
              <div className="editor-metadata-summary-grid">
                <div className="editor-side-section editor-side-section--card">
                  <label>Audience</label>
                  <p>{metadata.audience}</p>
                </div>
                <div className="editor-side-section editor-side-section--card">
                  <label>Goal</label>
                  <p>{metadata.goal}</p>
                </div>
              </div>
              <div className="editor-side-section editor-side-section--keywords">
                <label>Keywords</label>
                <div className="editor-chip-row">
                  {keywords.length > 0 ? (
                    keywords.map((keyword) => (
                      <span key={keyword} className="editor-keyword-chip">
                        {keyword}
                      </span>
                    ))
                  ) : (
                    <span className="editor-soft-chip">
                      No keywords returned
                    </span>
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
              <p>
                Metadata extraction failed for the latest saved canonical text.
              </p>
              <pre>
                {latestMetadataAttempt?.output_text ??
                  "Unknown metadata extraction error."}
              </pre>
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
                <span className="editor-soft-chip">
                  Awaiting extraction from canonical text
                </span>
              </div>
            </div>
          )}
        </section>

        <section className="editor-preview-card">
          <label>Translation Versions</label>
          <div className="editor-translation-history">
            {piece.translation_versions.length > 0 ? (
              piece.translation_versions.map((translation) => (
                <article
                  key={translation.id}
                  className="editor-translation-item"
                >
                  <div className="editor-translation-meta">
                    <strong>
                      {translation.source_language ?? "?"} →{" "}
                      {translation.target_language ?? "?"}
                    </strong>
                    <span>
                      {new Date(translation.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p>
                    {translation.output_text ??
                      "No translated output returned."}
                  </p>
                </article>
              ))
            ) : (
              <p className="editor-preview-caption">
                No translations yet. Use Translate/Localize to generate
                localized versions from the canonical text.
              </p>
            )}
          </div>
        </section>
      </aside>

      {isTranslateModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="translate-modal-title"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Translation</p>
                <h4 id="translate-modal-title">Translate this content</h4>
              </div>
              <button
                type="button"
                className="stitch-icon-button"
                onClick={() => setIsTranslateModalOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="muted">
              Translate the current canonical text of this piece. Save the
              canonical text first if you want to translate a different version.
            </p>
            <section className="content-surface">
              <h4>Current text</h4>
              <p>{piece.current_text}</p>
            </section>
            <div className="action-grid">
              <label>
                <span>From</span>
                <input
                  value={sourceLanguage}
                  onChange={(event) => setSourceLanguage(event.target.value)}
                />
              </label>
              <label>
                <span>To</span>
                <input
                  value={targetLanguage}
                  onChange={(event) => setTargetLanguage(event.target.value)}
                />
              </label>
            </div>
            <div className="button-row">
              <button
                type="button"
                className="button-secondary"
                onClick={() => setIsTranslateModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pendingAction === "translate"}
                onClick={() =>
                  runAction("translate", async () => {
                    await apiRequest(
                      `/content-pieces/${piece.id}/ai/translate`,
                      {
                        method: "POST",
                        body: JSON.stringify({
                          context: context || null,
                          source_language: sourceLanguage,
                          target_language: targetLanguage,
                        }),
                      },
                    );
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

      {draftToReject ? (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-draft-modal-title"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Draft Review</p>
                <h4 id="reject-draft-modal-title">Reject this AI draft</h4>
              </div>
              <button
                type="button"
                className="stitch-icon-button"
                onClick={() => setDraftToReject(null)}
              >
                ×
              </button>
            </div>
            <p className="muted">
              Rejecting this suggestion does not change the content status. You
              can reject it and stop there, or reject it and generate a new
              draft from the current canonical text.
            </p>
            <section className="content-surface">
              <h4>Selected draft</h4>
              <p>{draftToReject.output_text}</p>
            </section>
            <div className="button-row">
              <button
                type="button"
                className="button-secondary"
                onClick={() => setDraftToReject(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button-secondary"
                disabled={pendingAction === `reject-${draftToReject.id}`}
                onClick={() =>
                  runAction(`reject-${draftToReject.id}`, async () => {
                    await apiRequest(`/content-pieces/${piece.id}/review`, {
                      method: "POST",
                      body: JSON.stringify({
                        action: "reject",
                        ai_suggestion_id: draftToReject.id,
                      }),
                    });
                    setDraftToReject(null);
                  })
                }
              >
                Reject only
              </button>
              <button
                type="button"
                disabled={
                  pendingAction === `reject-regenerate-${draftToReject.id}`
                }
                onClick={() =>
                  runAction(
                    `reject-regenerate-${draftToReject.id}`,
                    async () => {
                      await apiRequest(`/content-pieces/${piece.id}/review`, {
                        method: "POST",
                        body: JSON.stringify({
                          action: "reject",
                          ai_suggestion_id: draftToReject.id,
                        }),
                      });
                      if (!providerSettings.configured) {
                        setDraftToReject(null);
                        setPendingProviderAction(() => () =>
                          runAction("draft", () =>
                            apiRequest(`/content-pieces/${piece.id}/ai/generate-draft`, {
                              method: "POST",
                              body: JSON.stringify({ context: context || null }),
                            }),
                          ),
                        );
                        setIsProviderModalOpen(true);
                        return;
                      }
                      await apiRequest(`/content-pieces/${piece.id}/ai/generate-draft`, {
                        method: "POST",
                        body: JSON.stringify({ context: context || null }),
                      });
                      setDraftToReject(null);
                    },
                  )
                }
              >
                Reject and generate another
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {labMode && isLabModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal-card editor-lab-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lab-modal-title"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Lab Mode</p>
                <h4 id="lab-modal-title">AI Call History</h4>
              </div>
              <button
                type="button"
                className="stitch-icon-button"
                onClick={() => setIsLabModalOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="muted">
              Metadata extraction uses the canonical text saved at the time of
              the call. This view is visible only when the editor URL includes{" "}
              <code>lab=1</code>.
            </p>
            <div className="editor-lab-history">
              {piece.ai_call_history.length > 0 ? (
                piece.ai_call_history.map((call, index) => (
                  <article key={call.id} className="editor-lab-entry">
                    <div className="editor-lab-entry-header">
                      <div className="editor-lab-step">
                        <span className="editor-suggestion-badge">
                          Step {index + 1}
                        </span>
                        <h5>{OPERATION_LABELS[call.operation_type]}</h5>
                      </div>
                      <div className="editor-lab-meta">
                        <span>{call.provider}</span>
                        <span>{call.model}</span>
                        <span>
                          {new Date(call.created_at).toLocaleString()}
                        </span>
                        <span className="editor-soft-chip">{call.status}</span>
                      </div>
                    </div>
                    {call.source_language || call.target_language ? (
                      <p className="editor-lab-language">
                        {call.source_language ?? "?"} →{" "}
                        {call.target_language ?? "?"}
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
                            ? JSON.stringify(
                                call.structured_output_json ?? {},
                                null,
                                2,
                              )
                            : (call.output_text ?? "No output returned.")}
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
      <ProviderSettingsModal
        open={isProviderModalOpen}
        blocking={!providerSettings.configured}
        settings={providerSettings}
        onClose={() => {
          if (!providerSettings.configured) {
            return;
          }
          setIsProviderModalOpen(false);
        }}
        onSaved={(nextSettings) => {
          setProviderSettings(nextSettings);
          setIsProviderModalOpen(false);
          const pending = pendingProviderAction;
          setPendingProviderAction(null);
          if (pending) {
            void pending();
          }
        }}
      />
    </article>
  );
}
