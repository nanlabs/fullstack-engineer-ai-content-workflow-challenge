import { WorkflowCounts } from "@/lib/types";

const ORDER = ["draft", "ai_suggested", "in_review", "approved", "rejected"] as const;

const LABELS: Record<(typeof ORDER)[number], string> = {
  draft: "Draft",
  ai_suggested: "AI Suggested",
  in_review: "In Review",
  approved: "Approved",
  rejected: "Rejected",
};

export function CampaignWorkflowSummary({ counts }: { counts: WorkflowCounts }) {
  return (
    <div className="workflow-summary">
      {ORDER.map((state) => (
        <div key={state} className={`workflow-summary-item workflow-summary-item-${state}`}>
          <span>{LABELS[state]}</span>
          <strong>{counts[state]}</strong>
        </div>
      ))}
    </div>
  );
}
