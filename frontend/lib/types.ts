export type ReviewState = "draft" | "ai_suggested" | "in_review" | "approved" | "rejected";

export type WorkflowCounts = Record<ReviewState, number>;

export type CampaignSummary = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  content_piece_count: number;
  workflow_counts: WorkflowCounts;
};

export type AISuggestion = {
  id: string;
  content_piece_id: string;
  provider: string;
  model: string;
  operation_type: "generate_draft" | "translate" | "extract_metadata";
  input_text: string;
  output_text: string | null;
  structured_output_json: Record<string, unknown> | null;
  status: "success" | "failed";
  created_at: string;
};

export type ReviewAction = {
  id: string;
  content_piece_id: string;
  ai_suggestion_id: string | null;
  action: "start_review" | "accept" | "edit" | "reject";
  comment: string | null;
  edited_text: string | null;
  created_at: string;
};

export type MetadataPayload = {
  keywords: string[];
  tone: string;
  sentiment: string;
};

export type ContentPiece = {
  id: string;
  campaign_id: string;
  type: string;
  source_text: string;
  current_text: string;
  source_language: string;
  target_language: string | null;
  review_state: ReviewState;
  created_at: string;
  updated_at: string;
  latest_suggestion: AISuggestion | null;
  latest_review_action: ReviewAction | null;
  latest_metadata: MetadataPayload | null;
};

export type CampaignDetail = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  workflow_counts: WorkflowCounts;
  content_pieces: ContentPiece[];
};
