"use client";

import type React from "react";
import { useState } from "react";
import type { ContentPiece } from "@/types";
import { DraftCard } from "./DraftCard";
import { EditContentPieceForm } from "./EditContentPieceForm";
import { AIGenerationForm } from "./AIGenerationForm";
import { useToast } from "@/components/ui/ToastProvider";
import { contentPieceApi, aiGenerationApi } from "@/lib/api/client";
import { OPERATION_MESSAGES } from "@/lib/api/errorHandler";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContentPieceCardProps {
  contentPiece: ContentPiece;
  onRefresh: () => void;
  setShowAIGenerationForm: (contentPieceId: string | null) => void;
  showAIGenerationForm: boolean;
}

export const ContentPieceCard: React.FC<ContentPieceCardProps> = ({
  contentPiece,
  onRefresh,
  setShowAIGenerationForm,
  showAIGenerationForm,
}) => {
  const [showDrafts, setShowDrafts] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
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
        setShowAIGenerationForm(null);
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
        onCancel={() => setShowAIGenerationForm(null)}
      />
    );
  }

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow w-full min-w-6xl max-w-6xl">
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
        <div className="flex space-x-2 items-center justify-center border bg-gray-50/50 border-gray-300 rounded-md px-2 py-1">
          <button
            onClick={() => setShowEditForm(true)}
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 text-sm py-1 transition-all rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-1 cursor-pointer"
          >
            <Pencil className="w-3 h-3 text-gray-500 hover:text-gray-900" />
            <span className="text-gray-500 text-xs">Default settings</span>
          </button>
          <div className="flex items-center border-r border-gray-300 h-4" />
          <span
            className={`px-2 py-px rounded-sm text-xs font-medium ${getContentTypeColor(
              contentPiece.contentType
            )}`}
          >
            {contentPiece.contentType}
          </span>
          <span className="px-2 py-px bg-gray-100 text-gray-600 rounded-sm text-xs">
            {contentPiece.language.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center border-t border-gray-300 pt-2">
        <div className="text-sm text-gray-500">
          Created: {new Date(contentPiece.createdAt).toLocaleDateString()}
          {contentPiece.drafts && contentPiece.drafts.length > 0 && (
            <span
              className="ml-2 text-blue-600 cursor-pointer"
              onClick={() => setShowDrafts(!showDrafts)}
            >
              • {showDrafts ? "Hide" : "Show"} {contentPiece.drafts.length}{" "}
              draft
              {contentPiece.drafts.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex space-x-3 items-center">
          <Button
            onClick={() => setShowAIGenerationForm(contentPiece.id)}
            variant="default"
            size="sm"
          >
            Generate AI Draft
          </Button>

          <Button onClick={handleDelete} variant="destructive" size="sm">
            Delete
          </Button>
        </div>
      </div>

      {showDrafts && contentPiece.drafts && contentPiece.drafts.length > 0 && (
        <div className="mt-2 pt-4 border-t border-gray-300">
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
