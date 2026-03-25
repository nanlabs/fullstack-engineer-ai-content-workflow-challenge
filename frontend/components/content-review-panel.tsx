"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { ContentPiece } from "@/lib/types";
import { useContentEvents } from "@/lib/use-content-events";
import { ReviewStateBadge } from "@/components/review-state-badge";

export function ContentReviewPanel({
  piece,
}: {
  piece: ContentPiece;
}) {
  const router = useRouter();
  const [context, setContext] = useState("");
  const [targetLanguage, setTargetLanguage] = useState(piece.target_language ?? "es");
  const [editedText, setEditedText] = useState(piece.current_text);
  const [comment, setComment] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshForPiece = useCallback(
    (contentPieceId: string) => {
      if (contentPieceId === piece.id) {
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

  const latestSuggestion = piece.latest_suggestion;
  const latestReviewableSuggestion = piece.latest_reviewable_suggestion;

  return (
    <article className="panel review-panel">
      <div className="review-header">
        <div>
          <p className="eyebrow">{piece.type}</p>
          <h3>{piece.source_language} {piece.target_language ? `→ ${piece.target_language}` : "source"}</h3>
        </div>
        <ReviewStateBadge state={piece.review_state} />
      </div>

      <div className="text-blocks">
        <section className="content-surface">
          <h4>Source text</h4>
          <p>{piece.source_text}</p>
        </section>
        <section className="content-surface">
          <h4>Canonical text</h4>
          <p>{piece.current_text}</p>
        </section>
      </div>

      <div className="action-grid">
        <label>
          <span>AI context</span>
          <input value={context} onChange={(event) => setContext(event.target.value)} />
        </label>
        <label>
          <span>Target language</span>
          <input value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)} />
        </label>
      </div>

      <div className="button-row">
        <button
          type="button"
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
          {pendingAction === "draft" ? "Generating..." : "Generate draft"}
        </button>
        <button
          type="button"
          disabled={pendingAction === "translate"}
          onClick={() =>
            runAction("translate", () =>
              apiRequest(`/content-pieces/${piece.id}/ai/translate`, {
                method: "POST",
                body: JSON.stringify({
                  context: context || null,
                  target_language: targetLanguage || null,
                }),
              }),
            )
          }
        >
          {pendingAction === "translate" ? "Translating..." : "Translate"}
        </button>
        <button
          type="button"
          disabled={pendingAction === "metadata"}
          onClick={() =>
            runAction("metadata", () =>
              apiRequest(`/content-pieces/${piece.id}/ai/extract-metadata`, { method: "POST" }),
            )
          }
        >
          {pendingAction === "metadata" ? "Extracting..." : "Extract metadata"}
        </button>
        <button
          type="button"
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
          Start review
        </button>
      </div>

      <div className="support-grid">
        <section className="suggestion-block">
          <div className="section-heading">
            <h4>Latest reviewable suggestion</h4>
            <span>
              {latestReviewableSuggestion ? latestReviewableSuggestion.operation_type : "No reviewable suggestion"}
            </span>
          </div>
          {latestReviewableSuggestion ? (
            <>
              <p className="suggestion-status">Status: {latestReviewableSuggestion.status}</p>
              <pre>{latestReviewableSuggestion.output_text ?? "No output returned"}</pre>
            </>
          ) : (
            <p className="muted">Generate a draft or translation before asking a reviewer to approve text.</p>
          )}
        </section>

        <section className="suggestion-block">
          <div className="section-heading">
            <h4>Metadata</h4>
            <span>
              {latestSuggestion?.operation_type === "extract_metadata" ? "Latest AI activity" : "Structured extraction"}
            </span>
          </div>
          {piece.latest_metadata ? (
            <dl className="metadata-grid">
              <div>
                <dt>Keywords</dt>
                <dd>{piece.latest_metadata.keywords.join(", ")}</dd>
              </div>
              <div>
                <dt>Tone</dt>
                <dd>{piece.latest_metadata.tone}</dd>
              </div>
              <div>
                <dt>Sentiment</dt>
                <dd>{piece.latest_metadata.sentiment}</dd>
              </div>
            </dl>
          ) : (
            <p className="muted">No metadata extracted yet.</p>
          )}
        </section>
      </div>

      <label>
        <span>Review comment</span>
        <input value={comment} onChange={(event) => setComment(event.target.value)} />
      </label>
      <label>
        <span>Edited text</span>
        <textarea
          rows={4}
          value={editedText}
          onChange={(event) => setEditedText(event.target.value)}
        />
      </label>

      <div className="button-row">
        <button
          type="button"
          disabled={!latestSuggestion || pendingAction === "accept"}
          onClick={() =>
            runAction("accept", () =>
              apiRequest(`/content-pieces/${piece.id}/review`, {
                method: "POST",
                body: JSON.stringify({
                  action: "accept",
                  comment: comment || null,
                  ai_suggestion_id: latestSuggestion?.id ?? null,
                }),
              }),
            )
          }
        >
          Accept latest suggestion
        </button>
        <button
          type="button"
          disabled={pendingAction === "edit"}
          onClick={() =>
            runAction("edit", () =>
              apiRequest(`/content-pieces/${piece.id}/review`, {
                method: "POST",
                body: JSON.stringify({
                  action: "edit",
                  comment: comment || null,
                  edited_text: editedText,
                  ai_suggestion_id: latestSuggestion?.id ?? null,
                }),
              }),
            )
          }
        >
          Approve edited text
        </button>
        <button
          type="button"
          className="button-danger"
          disabled={pendingAction === "reject"}
          onClick={() =>
            runAction("reject", () =>
              apiRequest(`/content-pieces/${piece.id}/review`, {
                method: "POST",
                body: JSON.stringify({
                  action: "reject",
                  comment: comment || null,
                  ai_suggestion_id: latestSuggestion?.id ?? null,
                }),
              }),
            )
          }
        >
          Reject
        </button>
      </div>

      {piece.latest_review_action ? (
        <p className="muted">
          Last review action: {piece.latest_review_action.action}
          {piece.latest_review_action.comment ? ` · ${piece.latest_review_action.comment}` : ""}
        </p>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}
    </article>
  );
}
