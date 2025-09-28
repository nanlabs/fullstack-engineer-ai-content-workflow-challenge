"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Document } from "@/types";
import { DocumentUpload } from "./DocumentUpload";
import { DocumentList } from "./DocumentList";
import { documentApi } from "@/lib/api/client";

interface DocumentManagementProps {
  campaignId: string;
}

export const DocumentManagement: React.FC<DocumentManagementProps> = ({
  campaignId,
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

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
        setDocuments(documentsData as Document[]);
      } else {
        // If no documents or error, set empty array
        setDocuments([]);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
      setDocuments([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUploadSuccess = () => {
    setShowUpload(false);
    loadDocuments(); // Refresh the document list
  };

  const handleDocumentDeleted = () => {
    loadDocuments(); // Refresh the document list
  };

  return (
    <div className="space-y-6">
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
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          {showUpload ? "Cancel Upload" : "Upload Document"}
        </button>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div className="bg-gray-50 rounded-lg p-6">
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
            <svg
              className="w-5 h-5 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-900">
              How Document Context Works
            </h4>
            <p className="text-sm text-blue-700 mt-1">
              When you generate AI content, the system will automatically use relevant
              information from your uploaded documents to create more accurate and
              contextually-aware content. Documents are processed and chunked to
              provide the most relevant context for each generation request.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
