"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import type { Document } from "@/types";
import { DocumentUpload } from "./DocumentUpload";
import { DocumentList } from "./DocumentList";
import { documentApi } from "@/lib/api/client";
import { Info, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRealtimeState } from "@/contexts/RealtimeStateContext";

interface DocumentManagementProps {
  campaignId: string;
}

export const DocumentManagement: React.FC<DocumentManagementProps> = ({
  campaignId,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const { getDocumentsForCampaign, dispatch } = useRealtimeState();
  
  // Get documents from centralized state
  const documents = getDocumentsForCampaign(campaignId);

  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await documentApi.getDocumentsByCampaign(campaignId);

      if (response.success && response.data) {
        // Handle nested data structure: response.data.data
        const responseData = response.data as Document[] | { data: Document[] };
        const documentsData = Array.isArray(responseData)
          ? responseData
          : Array.isArray(responseData.data)
          ? responseData.data
          : [];
        
        // Store documents in centralized state
        dispatch({
          type: "SET_DOCUMENTS",
          payload: {
            campaignId: campaignId,
            documents: documentsData as Document[],
          },
        });
      } else {
        // If no documents or error, set empty array in centralized state
        dispatch({
          type: "SET_DOCUMENTS",
          payload: {
            campaignId: campaignId,
            documents: [],
          },
        });
      }
    } catch (error) {
      console.error("Error loading documents:", error);
      // Set empty array in centralized state on error
      dispatch({
        type: "SET_DOCUMENTS",
        payload: {
          campaignId: campaignId,
          documents: [],
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, dispatch]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Note: WebSocket updates are now handled centrally by RealtimeStateContext
  // The documents will automatically update when the centralized state changes

  const handleUploadSuccess = () => {
    setShowUpload(false);
    
    // Don't call loadDocuments() here - centralized state will handle the real-time update
    // The WebSocket event will be received and handled by RealtimeStateContext
  };

  const handleDocumentDeleted = () => {
    // Don't call loadDocuments() here - centralized state will handle the real-time update
  };

  return (
    <div className="space-y-6 w-full max-w-6xl min-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Document Management
          </h2>
          <p className="text-sm text-gray-600">
            Upload documents to provide context for AI content generation
          </p>
        </div>
        <Button
          onClick={() => setShowUpload(!showUpload)}
          variant={showUpload ? "outline" : "default"}
        >
          {showUpload ? (
            <X className="w-4 h-4 mr-2" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          {showUpload ? "Cancel Upload" : "Upload Document"}
        </Button>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div className="bg-gray-50 rounded-lg ">
          <h3 className="text-md font-medium text-gray-900 mb-4">
            Upload New Document
          </h3>
          <DocumentUpload
            campaignId={campaignId}
            onUploadSuccess={handleUploadSuccess}
          />
        </div>
      )}

      {/* Documents List */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-md font-medium text-gray-900">
            Uploaded Documents ({documents.length})
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            These documents will be used as context when generating AI content
          </p>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading documents...</span>
            </div>
          ) : (
            <DocumentList
              documents={documents}
              onDocumentDeleted={handleDocumentDeleted}
            />
          )}
        </div>
      </div>

      {/* RAG Information */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-900">
              How Document Context Works
            </h4>
            <p className="text-sm text-blue-700 mt-1">
              When you generate AI content, the system will automatically use
              relevant information from your uploaded documents to create more
              accurate and contextually-aware content. Documents are processed
              and chunked to provide the most relevant context for each
              generation request.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
