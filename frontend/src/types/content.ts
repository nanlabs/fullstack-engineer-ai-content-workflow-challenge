export type ReviewState =
  | "draft"
  | "suggested_by_ai"
  | "reviewed"
  | "approved"
  | "rejected";

export type ContentPiece = {
  id: number;
  locale: string;
  type: string;
  original_text?: string | null;
  ai_suggested_text?: string | null;
  final_text?: string | null;
  review_state: ReviewState;
};

export type Campaign = {
  id: number;
  name: string;
  description?: string | null;
  contents: ContentPiece[];
};

export type ContentInput = {
  type: string;
  locale: string;
  original_text: string;
};

