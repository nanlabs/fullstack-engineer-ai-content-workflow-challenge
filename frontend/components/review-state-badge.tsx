import React from "react";
import { ReviewState } from "@/lib/types";

const LABELS: Record<ReviewState, string> = {
  draft: "Draft",
  ai_suggested: "AI Suggested",
  in_review: "In Review",
  approved: "Approved",
  rejected: "Rejected",
};

export function ReviewStateBadge({ state }: { state: ReviewState }) {
  return <span className={`review-state-pill review-state-pill-${state}`}>{LABELS[state]}</span>;
}
