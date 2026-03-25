import Link from "next/link";

import { ContentPiece } from "@/lib/types";
import { ReviewStateBadge } from "@/components/review-state-badge";

export function ContentPieceQueue({
  campaignId,
  pieces,
  selectedPieceId,
}: {
  campaignId: string;
  pieces: ContentPiece[];
  selectedPieceId: string;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Queue editorial</h3>
        <p>Seleccioná una pieza por vez para revisar texto, metadata y decisiones editoriales.</p>
      </div>
      <div className="queue-list">
        {pieces.map((piece) => (
          <Link
            key={piece.id}
            href={`/campaigns/${campaignId}?pieceId=${piece.id}`}
            className={`queue-item${piece.id === selectedPieceId ? " queue-item-active" : ""}`}
          >
            <div className="queue-item-header">
              <div>
                <p className="eyebrow">{piece.type}</p>
                <h4>{piece.source_language} {piece.target_language ? `→ ${piece.target_language}` : "source"}</h4>
              </div>
              <ReviewStateBadge state={piece.review_state} />
            </div>
            <p className="queue-item-copy">{piece.current_text}</p>
            <div className="queue-item-footer">
              <span>{piece.latest_reviewable_suggestion ? "Con propuesta AI" : "Sin propuesta AI"}</span>
              <span>{piece.latest_metadata ? "Metadata lista" : "Sin metadata"}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
