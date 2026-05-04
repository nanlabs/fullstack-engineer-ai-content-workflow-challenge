import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderHook, act } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { DraftEditor, useDraftEditor } from "./draft-editor";
import type { DraftRead } from "@/api/types";

const mockDraft: DraftRead = {
  id: "draft-1",
  content_piece_id: "piece-1",
  language: "en",
  status: "suggested",
  ai_content: "Spring Awakening: Bold New Colors",
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

describe("useDraftEditor", () => {
  it("initializes with ai_content when no edited_content", () => {
    const { result } = renderHook(() => useDraftEditor(mockDraft));
    expect(result.current.value).toBe("Spring Awakening: Bold New Colors");
    expect(result.current.isDirty).toBe(false);
  });

  it("initializes with edited_content when present", () => {
    const draftWithEdit = { ...mockDraft, edited_content: "My edited version" };
    const { result } = renderHook(() => useDraftEditor(draftWithEdit));
    expect(result.current.value).toBe("My edited version");
  });

  it("marks isDirty true when value changes", () => {
    const { result } = renderHook(() => useDraftEditor(mockDraft));
    act(() => {
      result.current.onChange("Something different");
    });
    expect(result.current.isDirty).toBe(true);
    expect(result.current.value).toBe("Something different");
  });

  it("isDirty is false when value matches original", () => {
    const { result } = renderHook(() => useDraftEditor(mockDraft));
    act(() => {
      result.current.onChange("Spring Awakening: Bold New Colors");
    });
    expect(result.current.isDirty).toBe(false);
  });

  it("reset restores original value and clears dirty", () => {
    const { result } = renderHook(() => useDraftEditor(mockDraft));
    act(() => {
      result.current.onChange("Changed text");
    });
    expect(result.current.isDirty).toBe(true);
    act(() => {
      result.current.reset();
    });
    expect(result.current.value).toBe("Spring Awakening: Bold New Colors");
    expect(result.current.isDirty).toBe(false);
  });

  it("returns empty string for null draft", () => {
    const { result } = renderHook(() => useDraftEditor(null));
    expect(result.current.value).toBe("");
    expect(result.current.isDirty).toBe(false);
  });
});

describe("DraftEditor", () => {
  it("renders textarea with the current value", () => {
    renderWithProviders(
      <DraftEditor
        draft={mockDraft}
        value="Spring Awakening: Bold New Colors"
        isDirty={false}
        onChange={vi.fn()}
      />
    );
    const textarea = screen.getByTestId("draft-editor-textarea") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Spring Awakening: Bold New Colors");
  });

  it("shows Modified badge when isDirty is true", () => {
    renderWithProviders(
      <DraftEditor draft={mockDraft} value="Something new" isDirty={true} onChange={vi.fn()} />
    );
    expect(screen.getByText("Modified")).toBeInTheDocument();
  });

  it("does not show Modified badge when not dirty", () => {
    renderWithProviders(
      <DraftEditor
        draft={mockDraft}
        value="Spring Awakening: Bold New Colors"
        isDirty={false}
        onChange={vi.fn()}
      />
    );
    expect(screen.queryByText("Modified")).not.toBeInTheDocument();
  });

  it("calls onChange when user types", async () => {
    const onChangeFn = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <DraftEditor draft={mockDraft} value="" isDirty={false} onChange={onChangeFn} />
    );
    const textarea = screen.getByTestId("draft-editor-textarea");
    await user.type(textarea, "Hello");
    expect(onChangeFn).toHaveBeenCalled();
  });

  it("textarea is disabled when disabled prop is true", () => {
    renderWithProviders(
      <DraftEditor draft={mockDraft} value="content" isDirty={false} onChange={vi.fn()} disabled />
    );
    expect(screen.getByTestId("draft-editor-textarea")).toBeDisabled();
  });

  it("shows word count and sentiment from metadata", () => {
    renderWithProviders(
      <DraftEditor
        draft={mockDraft}
        value="Spring Awakening Bold New Colors"
        isDirty={false}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText(/5 words/)).toBeInTheDocument();
    expect(screen.getByText(/positive/)).toBeInTheDocument();
  });
});
