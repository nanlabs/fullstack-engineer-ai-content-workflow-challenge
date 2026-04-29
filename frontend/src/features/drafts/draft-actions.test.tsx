import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/test-utils";
import { DraftActions } from "./draft-actions";
import type { DraftRead } from "@/api/types";

const BASE = "http://localhost:8000";

const mockDraft: DraftRead = {
  id: "draft-1",
  content_piece_id: "piece-1",
  language: "en",
  status: "suggested",
  ai_content: "Spring Awakening: Bold New Colors to Light Up Your Style",
  edited_content: null,
  final_content: null,
  model_used: "claude-3-5-sonnet",
  provider: "anthropic",
  metadata: { sentiment: "positive", tone: "aspirational", keywords: ["spring", "colors"] },
  parent_draft_id: null,
  reviewed_by: null,
  reviewed_at: null,
  review_notes: null,
  created_at: new Date().toISOString(),
};

const defaultProps = {
  draft: mockDraft,
  threadId: "thread-1",
  contentPieceId: "piece-1",
  editorValue: "Spring Awakening: Bold New Colors to Light Up Your Style",
  isDirty: false,
  onSaved: vi.fn(),
};

describe("DraftActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all four action buttons", () => {
    renderWithProviders(<DraftActions {...defaultProps} />);
    expect(screen.getByTestId("approve-button")).toBeInTheDocument();
    expect(screen.getByTestId("reject-button")).toBeInTheDocument();
    expect(screen.getByTestId("regenerate-button")).toBeInTheDocument();
    expect(screen.getByTestId("save-edits-button")).toBeInTheDocument();
  });

  it("save edits button is disabled when not dirty", () => {
    renderWithProviders(<DraftActions {...defaultProps} isDirty={false} />);
    expect(screen.getByTestId("save-edits-button")).toBeDisabled();
  });

  it("save edits button is enabled when dirty", () => {
    renderWithProviders(<DraftActions {...defaultProps} isDirty={true} />);
    expect(screen.getByTestId("save-edits-button")).toBeEnabled();
  });

  it("clicking approve opens confirmation dialog", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DraftActions {...defaultProps} />);
    await user.click(screen.getByTestId("approve-button"));
    expect(screen.getByText("Approve this draft?")).toBeInTheDocument();
  });

  it("clicking reject opens notes dialog", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DraftActions {...defaultProps} />);
    await user.click(screen.getByTestId("reject-button"));
    expect(screen.getByText("Reject draft")).toBeInTheDocument();
    expect(screen.getByTestId("reject-notes")).toBeInTheDocument();
  });

  it("reject confirm button is disabled when notes are empty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DraftActions {...defaultProps} />);
    await user.click(screen.getByTestId("reject-button"));
    expect(screen.getByTestId("confirm-reject-button")).toBeDisabled();
  });

  it("reject confirm button enables after typing notes", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DraftActions {...defaultProps} />);
    await user.click(screen.getByTestId("reject-button"));
    await user.type(screen.getByTestId("reject-notes"), "Does not match the brand voice");
    expect(screen.getByTestId("confirm-reject-button")).toBeEnabled();
  });

  it("clicking regenerate opens notes dialog", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DraftActions {...defaultProps} />);
    await user.click(screen.getByTestId("regenerate-button"));
    expect(screen.getByText("Regenerate draft")).toBeInTheDocument();
    expect(screen.getByTestId("regenerate-notes")).toBeInTheDocument();
  });

  it("regenerate confirm button is disabled when notes are empty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DraftActions {...defaultProps} />);
    await user.click(screen.getByTestId("regenerate-button"));
    expect(screen.getByTestId("confirm-regenerate-button")).toBeDisabled();
  });

  it("approve calls resume mutation with correct args", async () => {
    const resumeSpy = vi.fn().mockResolvedValue({
      workflow_run_id: "wr-1",
      thread_id: "thread-1",
      new_status: "completed",
      draft: mockDraft,
    });

    server.use(
      http.post(`${BASE}/api/workflows/thread-1/resume`, async ({ request }) => {
        const body = await request.json();
        resumeSpy(body);
        return HttpResponse.json({
          workflow_run_id: "wr-1",
          thread_id: "thread-1",
          new_status: "completed",
          draft: mockDraft,
        });
      })
    );

    const user = userEvent.setup();
    renderWithProviders(<DraftActions {...defaultProps} />);

    await user.click(screen.getByTestId("approve-button"));
    await user.click(screen.getByTestId("confirm-approve-button"));

    await waitFor(() => {
      expect(resumeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ action: "approve", draft_id: "draft-1" })
      );
    });
  });

  it("reject calls resume mutation with notes", async () => {
    const resumeSpy = vi.fn().mockResolvedValue({});

    server.use(
      http.post(`${BASE}/api/workflows/thread-1/resume`, async ({ request }) => {
        const body = await request.json();
        resumeSpy(body);
        return HttpResponse.json({
          workflow_run_id: "wr-1",
          thread_id: "thread-1",
          new_status: "awaiting_human",
          draft: mockDraft,
        });
      })
    );

    const user = userEvent.setup();
    renderWithProviders(<DraftActions {...defaultProps} />);

    await user.click(screen.getByTestId("reject-button"));
    await user.type(screen.getByTestId("reject-notes"), "Too generic");
    await user.click(screen.getByTestId("confirm-reject-button"));

    await waitFor(() => {
      expect(resumeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ action: "reject", draft_id: "draft-1", notes: "Too generic" })
      );
    });
  });
});
