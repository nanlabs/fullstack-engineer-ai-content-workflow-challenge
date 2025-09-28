// Centralized error handling and API response management

export interface ApiError {
  message: string;
  error: string;
  statusCode: number;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

// HTTP Status Code to User Message Mapping
const ERROR_MESSAGES: Record<number, string> = {
  400: "Invalid request. Please check your input and try again.",
  401: "You are not authorized to perform this action.",
  403: "Access denied. You do not have permission to perform this action.",
  404: "The requested resource was not found.",
  409: "This action conflicts with existing data.",
  422: "The data you provided is invalid.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Server error. Please try again later.",
  502: "Service temporarily unavailable. Please try again later.",
  503: "Service temporarily unavailable. Please try again later.",
};

// Default error messages for different operations
export const OPERATION_MESSAGES = {
  CREATE_CAMPAIGN: {
    success: "Campaign created successfully!",
    error: "Failed to create campaign. Please try again.",
  },
  UPDATE_CAMPAIGN: {
    success: "Campaign updated successfully!",
    error: "Failed to update campaign. Please try again.",
  },
  DELETE_CAMPAIGN: {
    success: "Campaign deleted successfully!",
    error: "Failed to delete campaign. Please try again.",
  },
  CREATE_CONTENT_PIECE: {
    success: "Content piece created successfully!",
    error: "Failed to create content piece. Please try again.",
  },
  UPDATE_CONTENT_PIECE: {
    success: "Content piece updated successfully!",
    error: "Failed to update content piece. Please try again.",
  },
  DELETE_CONTENT_PIECE: {
    success: "Content piece deleted successfully!",
    error: "Failed to delete content piece. Please try again.",
  },
  GENERATE_DRAFT: {
    success: "AI draft generated successfully!",
    error: "Failed to generate AI draft. Please try again.",
  },
  TRANSLATE_DRAFT: {
    success: "Draft translated successfully!",
    error: "Failed to translate draft. Please try again.",
  },
      LOAD_SUPPORTED_LANGUAGES: {
        success: "Supported languages loaded successfully!",
        error: "Failed to load supported languages. Please try again.",
      },
      UPDATE_DRAFT_CONTENT: {
        success: "Draft content updated successfully!",
        error: "Failed to update draft content. Please try again.",
      },
      UPDATE_DRAFT_REVIEW_STATE: {
        success: "Draft review state updated successfully!",
        error: "Failed to update draft review state. Please try again.",
      },
      UPDATE_TRANSLATION_CONTENT: {
        success: "Translation content updated successfully!",
        error: "Failed to update translation content. Please try again.",
      },
      DELETE_TRANSLATION: {
        success: "Translation deleted successfully!",
        error: "Failed to delete translation. Please try again.",
      },
      DELETE_DRAFT: {
        success: "Draft deleted successfully!",
        error: "Failed to delete draft. Please try again.",
      },
      UPLOAD_DOCUMENT: {
        success: "Document uploaded and processed successfully!",
        error: "Failed to upload document. Please try again.",
      },
      LOAD_DOCUMENTS: {
        success: "Documents loaded successfully!",
        error: "Failed to load documents. Please try again.",
      },
      DELETE_DOCUMENT: {
        success: "Document deleted successfully!",
        error: "Failed to delete document. Please try again.",
      },
      LOAD_CAMPAIGNS: {
        success: "Campaigns loaded successfully!",
        error: "Failed to load campaigns. Please try again.",
      },
      LOAD_CONTENT_PIECES: {
        success: "Content pieces loaded successfully!",
        error: "Failed to load content pieces. Please try again.",
      },
    };

// Get user-friendly error message from status code
export const getErrorMessage = (
  statusCode: number,
  defaultMessage?: string
): string => {
  return (
    ERROR_MESSAGES[statusCode] ||
    defaultMessage ||
    "An unexpected error occurred."
  );
};

// Parse API response and handle errors
export const handleApiResponse = async <T>(
  response: Response,
  operationMessages: { success: string; error: string }
): Promise<ApiResponse<T>> => {
  try {
    const data = await response.json();

    if (!response.ok) {
      const errorMessage = getErrorMessage(
        response.status,
        operationMessages.error
      );
      return {
        success: false,
        error: {
          message: errorMessage,
          error: data.message || "Unknown error",
          statusCode: response.status,
        },
      };
    }

    return {
      success: true,
      data,
    };
  } catch {
    return {
      success: false,
      error: {
        message: operationMessages.error,
        error: "Failed to parse response",
        statusCode: response.status || 500,
      },
    };
  }
};

// Generic API request wrapper with error handling
export const apiRequest = async <T>(
  url: string,
  options: RequestInit = {},
  operationMessages: { success: string; error: string }
): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(url, options);
    return await handleApiResponse<T>(response, operationMessages);
  } catch {
    return {
      success: false,
      error: {
        message: "Network error. Please check your connection and try again.",
        error: "Network error",
        statusCode: 0,
      },
    };
  }
};
