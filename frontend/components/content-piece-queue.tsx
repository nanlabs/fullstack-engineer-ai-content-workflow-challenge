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
        <h3>Content queue</h3>
        <p>Select one content piece at a time to review the latest AI output and final editorial text.</p>
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
            <p>{piece.current_text}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
