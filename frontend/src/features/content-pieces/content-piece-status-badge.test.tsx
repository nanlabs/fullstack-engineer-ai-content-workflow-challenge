import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContentPieceStatusBadge } from "./content-piece-status-badge";
import type { ContentPieceSummary } from "@/api/types";

function makePiece(overrides: Partial<ContentPieceSummary> = {}): ContentPieceSummary {
  return {
    id: "cp-1",
    type: "headline",
    title: "Test piece",
    has_drafts: false,
    latest_status: null,
    drafts_count: 0,
    workflow_status: null,
    latest_thread_id: null,
    ...overrides,
  };
}

describe("ContentPieceStatusBadge", () => {
  it("shows Draft when no drafts and no workflow", () => {
    render(<ContentPieceStatusBadge piece={makePiece()} />);
    expect(screen.getByText(/Draft/)).toBeInTheDocument();
  });

  it("shows Generating with spinner when workflow is running", () => {
    render(<ContentPieceStatusBadge piece={makePiece({ workflow_status: "running" })} />);
    expect(screen.getByText(/Generating/)).toBeInTheDocument();
  });

  it("shows node label hint when currentNode is provided", () => {
    render(
      <ContentPieceStatusBadge
        piece={makePiece({ workflow_status: "running" })}
        currentNode="translate_to_language"
      />
    );
    expect(screen.getByText(/translating/i)).toBeInTheDocument();
  });

  it("shows Awaiting review when workflow is awaiting_human", () => {
    render(
      <ContentPieceStatusBadge
        piece={makePiece({ workflow_status: "awaiting_human", has_drafts: true, drafts_count: 4 })}
      />
    );
    expect(screen.getByText(/Awaiting review/)).toBeInTheDocument();
    expect(screen.getByText(/4 drafts/)).toBeInTheDocument();
  });

  it("shows Awaiting review for suggested draft status (no active workflow)", () => {
    render(
      <ContentPieceStatusBadge
        piece={makePiece({ has_drafts: true, latest_status: "suggested" })}
      />
    );
    expect(screen.getByText(/Awaiting review/)).toBeInTheDocument();
  });

  it("shows Completed when latest_status is approved", () => {
    render(
      <ContentPieceStatusBadge piece={makePiece({ has_drafts: true, latest_status: "approved" })} />
    );
    expect(screen.getByText(/Completed/)).toBeInTheDocument();
  });

  it("shows Rejected when latest_status is rejected", () => {
    render(
      <ContentPieceStatusBadge piece={makePiece({ has_drafts: true, latest_status: "rejected" })} />
    );
    expect(screen.getByText(/Rejected/)).toBeInTheDocument();
  });

  it("shows Failed when workflow_status is failed", () => {
    render(<ContentPieceStatusBadge piece={makePiece({ workflow_status: "failed" })} />);
    expect(screen.getByText(/Failed/)).toBeInTheDocument();
  });
});
