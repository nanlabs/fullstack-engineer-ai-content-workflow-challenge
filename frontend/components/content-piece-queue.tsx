import Link from "next/link";

import { ContentPiece } from "@/lib/types";
import { ReviewStateBadge } from "@/components/review-state-badge";

export function ContentPieceQueue({
  campaignId,
  pieces,
}: {
  campaignId: string;
  pieces: ContentPiece[];
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Contenido de la campaña</h3>
        <p>Entrá a una pieza para editar el canonical text, generar drafts, traducir y revisar.</p>
      </div>
      <div className="queue-list">
        {pieces.map((piece) => (
          <Link
            key={piece.id}
            href={`/campaigns/${campaignId}/content-pieces/${piece.id}`}
            className="queue-item"
          >
            <div className="queue-item-header">
              <div>
                <p className="eyebrow">Contenido</p>
                <h4>{piece.current_text.slice(0, 56) || "Sin texto"}</h4>
              </div>
              <ReviewStateBadge state={piece.review_state} />
            </div>
            <p className="queue-item-copy">{piece.current_text}</p>
            <div className="queue-item-footer">
              <span>{piece.latest_reviewable_suggestion ? "Con propuesta AI" : "Sin propuesta AI"}</span>
              <span>{piece.latest_metadata ? "Metadata lista" : "Sin metadata"}</span>
              <span>{piece.target_language ? `${piece.source_language ?? "?"} → ${piece.target_language}` : "Sin traducción"}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
