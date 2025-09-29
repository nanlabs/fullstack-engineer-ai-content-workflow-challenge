"use client";

import type React from "react";
import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { documentApi } from "@/lib/api/client";
import { OPERATION_MESSAGES } from "@/lib/api/errorHandler";
import { CloudUpload, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentUploadProps {
  campaignId: string;
  onUploadSuccess?: () => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  campaignId,
  onUploadSuccess,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { addToast } = useToast();

  const handleFileUpload = useCallback(
    async (file: File) => {
      // Validate file type
      const allowedTypes = ["application/pdf", "text/plain"];
      if (!allowedTypes.includes(file.type)) {
        addToast({
          type: "error",
          title: "Invalid File Type",
          message: "Only PDF and TXT files are allowed",
        });
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        addToast({
          type: "error",
          title: "File Too Large",
          message: "File size must be less than 10MB",
        });
        return;
      }

      setIsUploading(true);

      try {
        const response = await documentApi.uploadDocument(campaignId, file);

        if (response.success) {
          addToast({
            type: "success",
            title: "Success",
            message: OPERATION_MESSAGES.UPLOAD_DOCUMENT.success,
          });

          if (onUploadSuccess) {
            onUploadSuccess();
          }
        } else {
          addToast({
            type: "error",
            title: "Upload Failed",
            message:
              response.error?.message ||
              OPERATION_MESSAGES.UPLOAD_DOCUMENT.error,
          });
        }
      } catch (error) {
        addToast({
          type: "error",
          title: "Upload Failed",
          message: OPERATION_MESSAGES.UPLOAD_DOCUMENT.error,
        });
        console.error("Error uploading document:", error);
      } finally {
        setIsUploading(false);
      }
    },
    [campaignId, onUploadSuccess, addToast]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        isDragging
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-gray-400"
      } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="space-y-4">
        <div className="mx-auto w-12 h-12 text-gray-400">
          <CloudUpload className="w-12 h-12" />
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {isUploading ? "Uploading..." : "Upload Document"}
          </h3>
          <p className="text-sm text-gray-500">
            Drag and drop a PDF or TXT file here, or click to select
          </p>
        </div>

        <div className="space-y-2">
          <input
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
            disabled={isUploading}
          />
          <Button variant="outline" size="sm" asChild disabled={isUploading}>
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </label>
          </Button>

          <p className="text-xs text-gray-400">
            Supported formats: PDF, TXT • Max size: 10MB
          </p>
        </div>

        {isUploading && (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">
              Processing document...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
