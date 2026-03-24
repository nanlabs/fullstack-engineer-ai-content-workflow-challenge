import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReviewStateBadge } from "@/components/review-state-badge";

describe("ReviewStateBadge", () => {
  it("renders the mapped label", () => {
    render(<ReviewStateBadge state="ai_suggested" />);
    expect(screen.getByText("AI Suggested")).toBeInTheDocument();
  });
});
