import { apiConfig } from "./config";
import { apiRequest, OPERATION_MESSAGES, ApiResponse } from "./errorHandler";
import { SupportedLanguagesResponse } from "@/types";

// Campaign API functions
export const campaignApi = {
  // Get all campaigns
  getAll: async (): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/campaigns`,
      { method: "GET" },
      OPERATION_MESSAGES.LOAD_CAMPAIGNS
    );
  },

  // Get campaign by ID
  getById: async (id: string): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/campaigns/${id}`,
      { method: "GET" },
      OPERATION_MESSAGES.LOAD_CAMPAIGNS
    );
  },

  // Create new campaign
  create: async (data: {
    name: string;
    description?: string;
  }): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/campaigns`,
      {
        method: "POST",
        headers: apiConfig.headers,
        body: JSON.stringify(data),
      },
      OPERATION_MESSAGES.CREATE_CAMPAIGN
    );
  },

  // Update campaign
  update: async (
    id: string,
    data: { name?: string; description?: string }
  ): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/campaigns/${id}`,
      {
        method: "PATCH",
        headers: apiConfig.headers,
        body: JSON.stringify(data),
      },
      OPERATION_MESSAGES.UPDATE_CAMPAIGN
    );
  },

  // Delete campaign
  delete: async (id: string): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/campaigns/${id}`,
      { method: "DELETE" },
      OPERATION_MESSAGES.DELETE_CAMPAIGN
    );
  },
};

// Content Piece API functions
export const contentPieceApi = {
  // Get all content pieces
  getAll: async (): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/content-pieces`,
      { method: "GET" },
      OPERATION_MESSAGES.LOAD_CONTENT_PIECES
    );
  },

  // Get content pieces by campaign
  getByCampaign: async (campaignId: string): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/content-pieces?campaignId=${campaignId}`,
      { method: "GET" },
      OPERATION_MESSAGES.LOAD_CONTENT_PIECES
    );
  },

  // Create new content piece
  create: async (data: {
    title: string;
    description?: string;
    contentType: string;
    campaignId: string;
    language?: string;
  }): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/content-pieces`,
      {
        method: "POST",
        headers: apiConfig.headers,
        body: JSON.stringify(data),
      },
      OPERATION_MESSAGES.CREATE_CONTENT_PIECE
    );
  },

  // Update content piece
  update: async (
    id: string,
    data: {
      title?: string;
      description?: string;
      contentType?: string;
      language?: string;
    }
  ): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/content-pieces/${id}`,
      {
        method: "PATCH",
        headers: apiConfig.headers,
        body: JSON.stringify(data),
      },
      OPERATION_MESSAGES.UPDATE_CONTENT_PIECE
    );
  },

  // Delete content piece
  delete: async (id: string): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/content-pieces/${id}`,
      { method: "DELETE" },
      OPERATION_MESSAGES.DELETE_CONTENT_PIECE
    );
  },
};

// AI Generation API functions
export const aiGenerationApi = {
  // Generate AI draft
  generateDraft: async (data: {
    contentPieceId: string;
    prompt: string;
    contentType?: string;
    language?: string;
    modelName?: string;
  }): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/ai-generation/generate-draft`,
      {
        method: "POST",
        headers: apiConfig.headers,
        body: JSON.stringify(data),
      },
      OPERATION_MESSAGES.GENERATE_DRAFT
    );
  },

  // Get available AI models
  getAvailableModels: async (): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/ai-generation/models`,
      { method: "GET" },
      OPERATION_MESSAGES.LOAD_AI_MODELS
    );
  },

  // Get campaign cost summary
  getCampaignCostSummary: async (campaignId: string): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/ai-generation/cost-summary/campaign/${campaignId}`,
      { method: "GET" },
      OPERATION_MESSAGES.LOAD_COST_SUMMARY
    );
  },

  // Get global cost statistics
  getGlobalCostStats: async (): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/ai-generation/cost-summary/global`,
      { method: "GET" },
      OPERATION_MESSAGES.LOAD_GLOBAL_COST_STATS
    );
  },
};

// Translation API functions
export const translationApi = {
  // Translate draft to multiple languages
  translateDraft: async (data: {
    draftId: string;
    targetLanguages: string[];
  }): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/translation/translate`,
      {
        method: "POST",
        headers: apiConfig.headers,
        body: JSON.stringify(data),
      },
      OPERATION_MESSAGES.TRANSLATE_DRAFT
    );
  },

  // Get supported languages
  getSupportedLanguages: async (): Promise<
    ApiResponse<SupportedLanguagesResponse>
  > => {
    return apiRequest(
      `${apiConfig.baseURL}/translation/supported-languages`,
      { method: "GET" },
      OPERATION_MESSAGES.LOAD_SUPPORTED_LANGUAGES
    );
  },

  // Update draft content
  updateDraftContent: async (
    draftId: string,
    content: string
  ): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/translation/${draftId}/content`,
      {
        method: "PATCH",
        headers: apiConfig.headers,
        body: JSON.stringify({ content }),
      },
      OPERATION_MESSAGES.UPDATE_DRAFT_CONTENT
    );
  },

  // Update draft review state
  updateDraftReviewState: async (
    draftId: string,
    reviewState: string
  ): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/translation/${draftId}/review-state/${reviewState}`,
      { method: "PATCH" },
      OPERATION_MESSAGES.UPDATE_DRAFT_REVIEW_STATE
    );
  },

  // Update translation content
  updateTranslationContent: async (
    draftId: string,
    language: string,
    content: string
  ): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/translation/${draftId}/translation/${language}`,
      {
        method: "PATCH",
        headers: apiConfig.headers,
        body: JSON.stringify({ content }),
      },
      OPERATION_MESSAGES.UPDATE_TRANSLATION_CONTENT
    );
  },

  // Delete translation content
  deleteTranslation: async (
    draftId: string,
    language: string
  ): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/translation/${draftId}/translation/${language}`,
      { method: "DELETE" },
      OPERATION_MESSAGES.DELETE_TRANSLATION
    );
  },

  // Delete draft
  deleteDraft: async (draftId: string): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/translation/${draftId}`,
      { method: "DELETE" },
      OPERATION_MESSAGES.DELETE_DRAFT
    );
  },
};

// Document API functions
export const documentApi = {
  // Upload document
  uploadDocument: async (
    campaignId: string,
    file: File
  ): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    return apiRequest(
      `${apiConfig.baseURL}/documents/upload/${campaignId}`,
      {
        method: "POST",
        body: formData,
      },
      OPERATION_MESSAGES.UPLOAD_DOCUMENT
    );
  },

  // Get documents by campaign
  getDocumentsByCampaign: async (campaignId: string): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/documents/campaign/${campaignId}`,
      { method: "GET" },
      OPERATION_MESSAGES.LOAD_DOCUMENTS
    );
  },

  // Delete document
  deleteDocument: async (documentId: string): Promise<ApiResponse> => {
    return apiRequest(
      `${apiConfig.baseURL}/documents/${documentId}`,
      { method: "DELETE" },
      OPERATION_MESSAGES.DELETE_DOCUMENT
    );
  },
};
