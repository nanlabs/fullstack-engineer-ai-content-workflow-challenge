"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { ContentPiece } from "@/lib/types";
import { useContentEvents } from "@/lib/use-content-events";
import { ReviewStateBadge } from "@/components/review-state-badge";

const STATE_NOTES: Record<ContentPiece["review_state"], string> = {
  draft: "Generá la primera propuesta AI o ajustá el texto canónico para iniciar el flujo.",
  ai_suggested: "Hay una propuesta textual lista para revisar antes de aprobar la versión final.",
  in_review: "Esta pieza está en revisión humana.",
  approved: "El texto canónico ya fue aprobado y está listo para salir.",
  rejected: "La propuesta revisada fue rechazada. Generá una nueva opción o editá manualmente.",
};

export function ContentReviewPanel({
  piece,
}: {
  piece: ContentPiece;
}) {
  const router = useRouter();
  const initialEditedText = piece.latest_reviewable_suggestion?.output_text ?? piece.current_text;
  const [context, setContext] = useState("");
  const [targetLanguage, setTargetLanguage] = useState(piece.target_language ?? "es");
  const [editedText, setEditedText] = useState(initialEditedText);
  const [comment, setComment] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<string | null>(null);

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

  const latestSuggestion = piece.latest_suggestion;
  const latestReviewableSuggestion = piece.latest_reviewable_suggestion;

  useEffect(() => {
    setEditedText(piece.latest_reviewable_suggestion?.output_text ?? piece.current_text);
  }, [piece.current_text, piece.id, piece.latest_reviewable_suggestion?.id, piece.latest_reviewable_suggestion?.output_text]);

  return (
    <article className="panel review-panel">
      <div className="review-header">
        <div>
          <p className="eyebrow">{piece.type}</p>
          <h3>{piece.source_language} {piece.target_language ? `→ ${piece.target_language}` : "texto base"}</h3>
        </div>
        <ReviewStateBadge state={piece.review_state} />
      </div>

      <section className="state-banner">
        <div>
          <strong>Estado del flujo</strong>
          <p>{STATE_NOTES[piece.review_state]}</p>
        </div>
        <div className="realtime-note">
          <strong>Realtime</strong>
          <p>{lastLiveUpdate ? `Actualizado a las ${lastLiveUpdate}` : "Escuchando eventos SSE"}</p>
        </div>
      </section>

      <div className="text-blocks">
        <section className="content-surface">
          <h4>Texto fuente</h4>
          <p>{piece.source_text}</p>
        </section>
        <section className="content-surface">
          <h4>Texto canónico</h4>
          <p>{piece.current_text}</p>
        </section>
      </div>

      <div className="action-grid">
        <label>
          <span>Contexto AI</span>
          <input value={context} onChange={(event) => setContext(event.target.value)} />
        </label>
        <label>
          <span>Idioma objetivo</span>
          <input value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)} />
        </label>
      </div>

      <section className="control-group">
        <div className="section-heading">
          <h4>AI operations</h4>
          <span>Generate text or extract signals before review.</span>
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
        </div>
      </section>

      <section className="control-group">
        <div className="section-heading">
          <h4>Review handoff</h4>
          <span>Move the current piece into human review once the proposal is worth evaluating.</span>
        </div>
        <div className="button-row">
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
      </section>

      <div className="support-grid">
        <section className="suggestion-block">
          <div className="section-heading">
            <h4>Última sugerencia reviewable</h4>
            <span>
              {latestReviewableSuggestion ? latestReviewableSuggestion.operation_type : "Sin sugerencia reviewable"}
            </span>
          </div>
          {latestReviewableSuggestion ? (
            <>
              <p className="suggestion-status">Status: {latestReviewableSuggestion.status}</p>
              <pre>{latestReviewableSuggestion.output_text ?? "No output returned"}</pre>
            </>
          ) : (
            <p className="muted">Generá un draft o una traducción antes de pedir una aprobación editorial.</p>
          )}
        </section>

        <section className="suggestion-block">
          <div className="section-heading">
            <h4>Metadata</h4>
            <span>
              {latestSuggestion?.operation_type === "extract_metadata" ? "Última actividad AI" : "Extracción estructurada"}
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
            <p className="muted">Todavía no hay metadata extraída.</p>
          )}
        </section>
      </div>

      <label>
        <span>Comentario editorial</span>
        <input value={comment} onChange={(event) => setComment(event.target.value)} />
      </label>
      <label>
        <span>Texto editado</span>
        <textarea
          rows={4}
          value={editedText}
          onChange={(event) => setEditedText(event.target.value)}
        />
      </label>

      <div className="button-row">
        <button
          type="button"
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
          Aprobar sugerencia
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
                  ai_suggestion_id: latestReviewableSuggestion?.id ?? null,
                }),
              }),
            )
          }
        >
          Aprobar edición
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
                  ai_suggestion_id: latestReviewableSuggestion?.id ?? null,
                }),
              }),
            )
          }
        >
          Rechazar
        </button>
      </div>

      {piece.latest_review_action ? (
        <p className="muted">
          Última acción: {piece.latest_review_action.action}
          {piece.latest_review_action.comment ? ` · ${piece.latest_review_action.comment}` : ""}
        </p>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}
    </article>
  );
}
