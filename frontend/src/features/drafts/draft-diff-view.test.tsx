import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { DraftDiffView } from "./draft-diff-view";

describe("DraftDiffView", () => {
  it("renders the diff header label", () => {
    renderWithProviders(
      <DraftDiffView
        aiContent="Spring Awakening: Bold New Colors to Light Up Your Style"
        editedContent="Spring Awakening: Vibrant Colors to Brighten Your Style"
      />
    );
    expect(screen.getByText("Diff vs original")).toBeInTheDocument();
  });

  it("renders with identical content (no diff)", () => {
    const content = "Spring Awakening: Bold New Colors";
    renderWithProviders(<DraftDiffView aiContent={content} editedContent={content} />);
    expect(screen.getByText("Diff vs original")).toBeInTheDocument();
  });

  it("renders with empty strings", () => {
    renderWithProviders(<DraftDiffView aiContent="" editedContent="New content added" />);
    expect(screen.getByText("Diff vs original")).toBeInTheDocument();
  });
});
