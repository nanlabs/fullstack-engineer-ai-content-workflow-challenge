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
  return <span className={`badge badge-${state}`}>{LABELS[state]}</span>;
}
