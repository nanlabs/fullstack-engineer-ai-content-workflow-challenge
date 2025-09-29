"use client";

import type React from "react";
import { useState } from "react";
import type { Document } from "@/types";
import { useToast } from "@/components/ui/ToastProvider";
import { documentApi } from "@/lib/api/client";
import { OPERATION_MESSAGES } from "@/lib/api/errorHandler";
import { File, FileText, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentListProps {
  documents: Document[];
  onDocumentDeleted?: () => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onDocumentDeleted,
}) => {
  const [expandedDocument, setExpandedDocument] = useState<string | null>(null);
  const { addToast } = useToast();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case "pdf":
        return <FileText className="w-6 h-6 text-red-600" />;
      case "txt":
        return <FileType className="w-6 h-6 text-gray-600" />;
      default:
        return <File className="w-6 h-6 text-gray-600" />;
    }
  };

  const handleDeleteDocument = async (
    documentId: string,
    documentName: string
  ) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${documentName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await documentApi.deleteDocument(documentId);

      if (response.success) {
        addToast({
          type: "success",
          title: "Success",
          message: OPERATION_MESSAGES.DELETE_DOCUMENT.success,
        });

        if (onDocumentDeleted) {
          onDocumentDeleted();
        }
      } else {
        addToast({
          type: "error",
          title: "Delete Failed",
          message:
            response.error?.message || OPERATION_MESSAGES.DELETE_DOCUMENT.error,
        });
      }
    } catch (error) {
      addToast({
        type: "error",
        title: "Delete Failed",
        message: OPERATION_MESSAGES.DELETE_DOCUMENT.error,
      });
      console.error("Error deleting document:", error);
    }
  };

  const toggleExpanded = (documentId: string) => {
    setExpandedDocument(expandedDocument === documentId ? null : documentId);
  };

  // Safety check to ensure documents is an array
  if (!Array.isArray(documents) || documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <File className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
        <p className="mt-1 text-sm text-gray-500">
          Upload your first document to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((document) => (
        <div
          key={document.id}
          className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              {getFileIcon(document.fileType)}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {document.originalName}
                </h4>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>{document.fileType.toUpperCase()}</span>
                  <span>{formatFileSize(document.fileSize)}</span>
                  <span>
                    Uploaded{" "}
                    {new Date(document.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpanded(document.id)}
              >
                {expandedDocument === document.id ? "Hide" : "Preview"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  handleDeleteDocument(document.id, document.originalName)
                }
              >
                Delete
              </Button>
            </div>
          </div>

          {expandedDocument === document.id && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="space-y-3">
                <div>
                  <h5 className="text-xs font-medium text-gray-700 mb-2">
                    Document Content Preview
                  </h5>
                  <div className="bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto">
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {document.content.length > 500
                        ? `${document.content.substring(0, 500)}...`
                        : document.content}
                    </p>
                  </div>
                </div>

                {document.chunks && document.chunks.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-700 mb-2">
                      Processing Status
                    </h5>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-gray-600">
                        Processed into {document.chunks.length} chunks for AI
                        context
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
