"use client";

import React, { useState } from "react";
import { ContentPiece } from "@/types";
import { DraftCard } from "./DraftCard";
import { EditContentPieceForm } from "./EditContentPieceForm";
import { AIGenerationForm } from "./AIGenerationForm";
import { useToast } from "@/components/ui/ToastProvider";
import { contentPieceApi, aiGenerationApi } from "@/lib/api/client";
import { OPERATION_MESSAGES } from "@/lib/api/errorHandler";

interface ContentPieceCardProps {
  contentPiece: ContentPiece;
  onRefresh: () => void;
}

export const ContentPieceCard: React.FC<ContentPieceCardProps> = ({
  contentPiece,
  onRefresh,
}) => {
  const [showDrafts, setShowDrafts] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAIGenerationForm, setShowAIGenerationForm] = useState(false);
  const { addToast } = useToast();

  const getContentTypeColor = (type: string) => {
    const colors = {
      headline: "bg-blue-100 text-blue-800",
      description: "bg-green-100 text-green-800",
      translation: "bg-purple-100 text-purple-800",
      tagline: "bg-yellow-100 text-yellow-800",
      "call-to-action": "bg-red-100 text-red-800",
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const handleEdit = async (data: {
    title: string;
    description?: string;
    contentType: string;
    language?: string;
  }) => {
    try {
      const response = await contentPieceApi.update(contentPiece.id, data);

      if (response.success) {
        setShowEditForm(false);
        onRefresh();
        addToast({
          type: "success",
          title: "Success",
          message: OPERATION_MESSAGES.UPDATE_CONTENT_PIECE.success,
        });
      } else {
        addToast({
          type: "error",
          title: "Error",
          message:
            response.error?.message ||
            OPERATION_MESSAGES.UPDATE_CONTENT_PIECE.error,
        });
      }
    } catch (err) {
      addToast({
        type: "error",
        title: "Error",
        message: OPERATION_MESSAGES.UPDATE_CONTENT_PIECE.error,
      });
      console.error("Error updating content piece:", err);
    }
  };

  const handleAIGeneration = async (data: {
    contentPieceId: string;
    prompt: string;
    contentType?: string;
    language?: string;
  }) => {
    try {
      const response = await aiGenerationApi.generateDraft(data);

      if (response.success) {
        setShowAIGenerationForm(false);
        onRefresh();
        addToast({
          type: "success",
          title: "Success",
          message: OPERATION_MESSAGES.GENERATE_DRAFT.success,
        });
      } else {
        addToast({
          type: "error",
          title: "Error",
          message:
            response.error?.message || OPERATION_MESSAGES.GENERATE_DRAFT.error,
        });
      }
    } catch (err) {
      addToast({
        type: "error",
        title: "Error",
        message: OPERATION_MESSAGES.GENERATE_DRAFT.error,
      });
      console.error("Error generating AI draft:", err);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this content piece? This will also delete all its drafts."
      )
    ) {
      return;
    }

    try {
      const response = await contentPieceApi.delete(contentPiece.id);

      if (response.success) {
        onRefresh();
        addToast({
          type: "success",
          title: "Success",
          message: OPERATION_MESSAGES.DELETE_CONTENT_PIECE.success,
        });
      } else {
        addToast({
          type: "error",
          title: "Error",
          message:
            response.error?.message ||
            OPERATION_MESSAGES.DELETE_CONTENT_PIECE.error,
        });
      }
    } catch (err) {
      addToast({
        type: "error",
        title: "Error",
        message: OPERATION_MESSAGES.DELETE_CONTENT_PIECE.error,
      });
      console.error("Error deleting content piece:", err);
    }
  };

  if (showEditForm) {
    return (
      <EditContentPieceForm
        contentPiece={contentPiece}
        onSubmit={handleEdit}
        onCancel={() => setShowEditForm(false)}
      />
    );
  }

  if (showAIGenerationForm) {
    return (
      <AIGenerationForm
        contentPiece={contentPiece}
        onSubmit={handleAIGeneration}
        onCancel={() => setShowAIGenerationForm(false)}
      />
    );
  }

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-gray-900 mb-1">
            {contentPiece.title}
          </h4>
          {contentPiece.description && (
            <p className="text-gray-600 text-sm mb-2">
              {contentPiece.description}
            </p>
          )}
        </div>
        <div className="flex space-x-2">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getContentTypeColor(
              contentPiece.contentType
            )}`}
          >
            {contentPiece.contentType}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
            {contentPiece.language.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Created: {new Date(contentPiece.createdAt).toLocaleDateString()}
          {contentPiece.drafts && contentPiece.drafts.length > 0 && (
            <span className="ml-2 text-blue-600">
              • {contentPiece.drafts.length} draft
              {contentPiece.drafts.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex space-x-2">
          {contentPiece.drafts && contentPiece.drafts.length > 0 && (
            <button
              onClick={() => setShowDrafts(!showDrafts)}
              className="text-blue-600 hover:text-blue-800 text-sm ml-2 mr-2 border border-blue-300 rounded-md px-2 py-1 hover:bg-blue-100 transition-colors hover:border-blue-400 cursor-pointer"
            >
              {showDrafts ? "Hide" : "Show"} Drafts
            </button>
          )}
          <button
            onClick={() => setShowEditForm(true)}
            className="text-gray-600 hover:text-gray-800 text-sm ml-2 mr-2 border border-gray-300 rounded-md px-2 py-1 hover:bg-gray-100 transition-colors hover:border-gray-400 cursor-pointer"
          >
            Edit
          </button>
          <button
            onClick={() => setShowAIGenerationForm(true)}
            className="text-purple-600 hover:text-purple-800 text-sm ml-2 mr-2 border border-purple-300 rounded-md px-2 py-1 hover:bg-purple-100 transition-colors hover:border-purple-400 cursor-pointer"
          >
            Generate AI Draft
          </button>
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-800 text-sm mr-2 border border-red-300 rounded-md px-2 py-1 hover:bg-red-100 transition-colors hover:border-red-400 cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>

      {showDrafts && contentPiece.drafts && contentPiece.drafts.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h5 className="text-sm font-medium text-gray-900 mb-2">
            AI Generated Drafts
          </h5>
          <div className="space-y-2">
            {contentPiece.drafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                onDraftUpdate={onRefresh}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
