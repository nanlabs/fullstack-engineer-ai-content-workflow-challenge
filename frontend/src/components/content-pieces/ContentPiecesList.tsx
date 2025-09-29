"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { contentPieceApi } from "@/lib/api/client";
import type { ContentPiece, Campaign } from "@/types";
import { CreateContentPieceForm } from "./CreateContentPieceForm";
import { ContentPieceCard } from "./ContentPieceCard";
import { useToast } from "@/components/ui/ToastProvider";
import { OPERATION_MESSAGES } from "@/lib/api/errorHandler";
import { Button } from "@/components/ui/button";
import { useRealtimeState } from "@/contexts/RealtimeStateContext";

interface ContentPiecesListProps {
  campaign: Campaign;
  onRefresh: () => void;
}

export const ContentPiecesList: React.FC<ContentPiecesListProps> = ({
  campaign,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { addToast } = useToast();
  const [showAIGenerationForm, setShowAIGenerationForm] = useState<
    string | null
  >(null);
  const { getContentPiecesForCampaign, dispatch } = useRealtimeState();

  // Get content pieces from the realtime state
  const contentPieces = getContentPiecesForCampaign(campaign.id);

  const loadContentPieces = useCallback(async () => {
    try {
      setLoading(true);
      const response = await contentPieceApi.getByCampaign(campaign.id);

      if (response.success && response.data) {
        const contentPieces = response.data as ContentPiece[];
        
        // Store content pieces
        dispatch({
          type: "SET_CONTENT_PIECES",
          payload: {
            campaignId: campaign.id,
            contentPieces: contentPieces,
          },
        });
        
        // Store drafts for each content piece
        contentPieces.forEach(contentPiece => {
          if (contentPiece.drafts && contentPiece.drafts.length > 0) {
            dispatch({
              type: "SET_DRAFTS",
              payload: {
                contentPieceId: contentPiece.id,
                drafts: contentPiece.drafts,
              },
            });
          }
        });
        
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
  }, [campaign.id, addToast, dispatch]);

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
        title: data.title,
        description: data.description || "",
        contentType: data.contentType,
        language: data.language,
        campaignId: campaign.id,
      });

      if (response.success && response.data) {
        setShowCreateForm(false);
        addToast({
          type: "success",
          title: "Success",
          message: "Content piece created successfully",
        });
        onRefresh();
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
        <div className="text-gray-500">Loading content pieces...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Content Pieces ({contentPieces.length})
        </h3>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Add Content Piece
        </Button>
      </div>

      {showCreateForm && (
        <CreateContentPieceForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className="grid gap-4">
        {contentPieces.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No content pieces yet. Create your first one!
          </div>
        ) : (
          contentPieces.map((contentPiece) => (
            <ContentPieceCard
              key={contentPiece.id}
              contentPiece={contentPiece}
              onRefresh={onRefresh}
              setShowAIGenerationForm={setShowAIGenerationForm}
              showAIGenerationForm={showAIGenerationForm === contentPiece.id}
            />
          ))
        )}
      </div>
    </div>
  );
};

