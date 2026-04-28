export type ContentPieceType = "headline" | "description" | "cta" | "body";
export type DraftStatus = "draft" | "suggested" | "reviewed" | "approved" | "rejected";
export type WorkflowStatus = "pending" | "running" | "awaiting_human" | "completed" | "failed";
export type ReviewAction = "approve" | "reject" | "edit" | "regenerate";

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface Campaign {
  id: string;
  name: string;
  brief: string | null;
  target_languages: string[];
  source_language: string;
  created_at: string;
  updated_at: string;
  content_pieces_count: number;
}

export interface CampaignCreate {
  name: string;
  brief?: string | null;
  target_languages?: string[];
  source_language?: string;
}

export interface CampaignUpdate {
  name?: string;
  brief?: string | null;
  target_languages?: string[];
}

export interface ContentPieceSummary {
  id: string;
  type: ContentPieceType;
  title: string | null;
  has_drafts: boolean;
  latest_status: DraftStatus | null;
}

export interface CampaignDetail extends Campaign {
  content_pieces: ContentPieceSummary[];
}

export interface ContentPieceCreate {
  type: ContentPieceType;
  title?: string | null;
  source_text?: string | null;
}

export interface ContentPieceUpdate {
  title?: string | null;
  source_text?: string | null;
}

export interface ContentPieceDetail extends ContentPieceSummary {
  campaign_id: string;
  source_text: string | null;
  drafts: DraftRead[];
  created_at: string;
  updated_at: string;
}

export interface DraftRead {
  id: string;
  content_piece_id: string;
  language: string;
  status: DraftStatus;
  ai_content: string | null;
  edited_content: string | null;
  final_content: string | null;
  model_used: string | null;
  provider: string | null;
  metadata: Record<string, unknown> | null;
  parent_draft_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

export interface DraftReviewAction {
  action: "approve" | "reject" | "edit";
  edited_content?: string | null;
  review_notes?: string | null;
}

export interface WorkflowRunRead {
  thread_id: string;
  content_piece_id: string;
  status: WorkflowStatus;
  current_node: string | null;
  iteration: number;
  started_at: string;
  finished_at: string | null;
  error: string | null;
  drafts: DraftRead[];
}

export interface WorkflowRunListItem {
  workflow_run_id: string;
  thread_id: string;
  content_piece_id: string;
  status: WorkflowStatus;
  started_at: string;
  finished_at: string | null;
}

export interface ResumeRequest {
  action: ReviewAction;
  draft_id: string;
  edited_content?: string | null;
  notes?: string | null;
}

export interface ResumeResponse {
  workflow_run_id: string;
  thread_id: string;
  new_status: WorkflowStatus;
  draft: DraftRead;
}

export interface GenerateRequest {
  provider?: string;
}

export interface GenerateResponse {
  workflow_run_id: string;
  thread_id: string;
  status: string;
}
