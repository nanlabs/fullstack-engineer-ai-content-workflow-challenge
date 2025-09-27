"use client";

import React, { useState, useEffect, useCallback } from "react";
import { contentPieceApi } from "@/lib/api/client";
import { ContentPiece, Campaign } from "@/types";
import { CreateContentPieceForm } from "./CreateContentPieceForm";
import { ContentPieceCard } from "./ContentPieceCard";
import { useToast } from "@/components/ui/ToastProvider";
import { useLanguage } from "@/components/translation/LanguageProvider";
import { OPERATION_MESSAGES } from "@/lib/api/errorHandler";

interface ContentPiecesListProps {
  campaign: Campaign;
  onRefresh: () => void;
}

export const ContentPiecesList: React.FC<ContentPiecesListProps> = ({
  campaign,
  onRefresh,
}) => {
  const [contentPieces, setContentPieces] = useState<ContentPiece[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { addToast } = useToast();
  const { userLanguage } = useLanguage();

  const loadContentPieces = useCallback(async () => {
    try {
      setLoading(true);
      const response = await contentPieceApi.getByCampaign(campaign.id);

      if (response.success && response.data) {
        setContentPieces(response.data as ContentPiece[]);
        setError(null);
      } else {
        setError(response.error?.message || "Failed to load content pieces");
        addToast({
          type: "error",
          title: "Error",
          message:
            response.error?.message ||
            OPERATION_MESSAGES.LOAD_CONTENT_PIECES.error,
        });
      }
    } catch (err) {
      const errorMessage = "Failed to load content pieces";
      setError(errorMessage);
      addToast({
        type: "error",
        title: "Error",
        message: errorMessage,
      });
      console.error("Error loading content pieces:", err);
    } finally {
      setLoading(false);
    }
  }, [campaign.id, addToast]);

  useEffect(() => {
    loadContentPieces();
  }, [loadContentPieces]);

  const handleCreate = async (data: {
    title: string;
    description?: string;
    contentType: string;
    language?: string;
  }) => {
    try {
      const response = await contentPieceApi.create({
        ...data,
        campaignId: campaign.id,
      });

      if (response.success) {
        setShowCreateForm(false);
        loadContentPieces();
        onRefresh();
        addToast({
          type: "success",
          title: "Success",
          message: OPERATION_MESSAGES.CREATE_CONTENT_PIECE.success,
        });
      } else {
        addToast({
          type: "error",
          title: "Error",
          message:
            response.error?.message ||
            OPERATION_MESSAGES.CREATE_CONTENT_PIECE.error,
        });
      }
    } catch (err) {
      addToast({
        type: "error",
        title: "Error",
        message: OPERATION_MESSAGES.CREATE_CONTENT_PIECE.error,
      });
      console.error("Error creating content piece:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-gray-600">Loading content pieces...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Content Pieces</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
        >
          Add Content Piece
        </button>
      </div>

      {showCreateForm && (
        <CreateContentPieceForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreateForm(false)}
          defaultLanguage={userLanguage}
        />
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
          <button
            onClick={loadContentPieces}
            className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
          >
            Try again
          </button>
        </div>
      )}

      {contentPieces.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No content pieces yet. Create your first one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {contentPieces.map((piece) => (
            <ContentPieceCard
              key={piece.id}
              contentPiece={piece}
              onRefresh={() => {
                loadContentPieces();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
