"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { type Draft, ReviewState } from "@/types";
import { TranslationModal } from "@/components/translation/TranslationModal";
import { TranslationDisplay } from "@/components/translation/TranslationDisplay";
import { translationApi } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";
import { OPERATION_MESSAGES } from "@/lib/api/errorHandler";
import { ChevronDown, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CostDisplay } from "@/components/ui/CostDisplay";

interface DraftCardProps {
  draft: Draft;
  onDraftUpdate?: () => void;
}

export const DraftCard: React.FC<DraftCardProps> = ({
  draft,
  onDraftUpdate,
}) => {
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const [isEditingOriginal, setIsEditingOriginal] = useState(false);
  const [editedContent, setEditedContent] = useState(draft.content);
  const [localDraft, setLocalDraft] = useState<Draft>(draft);
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded by default
  const { addToast } = useToast();

  // Update local draft when prop changes (from centralized state)
  useEffect(() => {
    setLocalDraft(draft);
    setEditedContent(draft.content);
  }, [draft]);

  // Note: WebSocket updates are now handled centrally by RealtimeStateContext
  // The draft prop will automatically update when the centralized state changes

  const getReviewStateColor = (state: ReviewState) => {
    const colors = {
      [ReviewState.DRAFT]: "bg-gray-100 text-gray-800",
      [ReviewState.SUGGESTED_BY_AI]: "bg-blue-100 text-blue-800",
      [ReviewState.REVIEWED]: "bg-yellow-100 text-yellow-800",
      [ReviewState.APPROVED]: "bg-green-100 text-green-800",
      [ReviewState.REJECTED]: "bg-red-100 text-red-800",
    };
    return colors[state];
  };

  const getReviewStateActions = (state: ReviewState) => {
    switch (state) {
      case ReviewState.SUGGESTED_BY_AI:
        return (
          <div className="flex space-x-2">
            <Button
              onClick={handleApproveDraft}
              variant="ghost"
              size="sm"
              className="text-green-600 hover:text-green-800"
            >
              Approve
            </Button>
            <Button
              onClick={handleRejectDraft}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-800"
            >
              Reject
            </Button>
          </div>
        );
      case ReviewState.REVIEWED:
        return (
          <div className="flex space-x-2">
            <Button
              onClick={handleApproveDraft}
              variant="ghost"
              size="sm"
              className="text-green-600 hover:text-green-800"
            >
              Approve
            </Button>
            <Button
              onClick={handleRejectDraft}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-800"
            >
              Reject
            </Button>
          </div>
        );
      case ReviewState.APPROVED:
        return (
          <div className="flex space-x-2">
            <Button
              onClick={handleRejectDraft}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-800"
            >
              Reject
            </Button>
            <Button
              onClick={handleResetToReview}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-800"
            >
              Reset to Review
            </Button>
          </div>
        );
      case ReviewState.REJECTED:
        return (
          <div className="flex space-x-2">
            <Button
              onClick={handleApproveDraft}
              variant="ghost"
              size="sm"
              className="text-green-600 hover:text-green-800"
            >
              Approve
            </Button>
            <Button
              onClick={handleResetToReview}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-800"
            >
              Reset to Review
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  const languageNames: Record<string, string> = {
    es: "Spanish",
    en: "English",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
  };

  const hasTranslations =
    localDraft.translations && Object.keys(localDraft.translations).length > 0;

  const handleEditOriginal = () => {
    setIsEditingOriginal(true);
    setEditedContent(localDraft.content);
  };

  const handleSaveOriginal = async () => {
    try {
      const response = await translationApi.updateDraftContent(
        localDraft.id,
        editedContent
      );
      if (response.success) {
        setIsEditingOriginal(false);
        // Update local state immediately
        setLocalDraft((prev) => ({ ...prev, content: editedContent }));
        // Don't call onDraftUpdate to avoid refreshing parent
      } else {
        console.error("Failed to save original content:", response.error);
      }
    } catch (error) {
      console.error("Error saving original content:", error);
    }
  };

  const handleApproveDraft = async () => {
    try {
      const response = await translationApi.updateDraftReviewState(
        localDraft.id,
        "APPROVED"
      );
      if (response.success) {
        // Update local state immediately
        setLocalDraft((prev) => ({
          ...prev,
          reviewState: "APPROVED" as ReviewState,
        }));
        // Don't call onDraftUpdate to avoid refreshing parent
      } else {
        console.error("Failed to approve draft:", response.error);
      }
    } catch (error) {
      console.error("Error approving draft:", error);
    }
  };

  const handleRejectDraft = async () => {
    try {
      const response = await translationApi.updateDraftReviewState(
        localDraft.id,
        "REJECTED"
      );
      if (response.success) {
        // Update local state immediately
        setLocalDraft((prev) => ({
          ...prev,
          reviewState: "REJECTED" as ReviewState,
        }));
        // Don't call onDraftUpdate to avoid refreshing parent
      } else {
        console.error("Failed to reject draft:", response.error);
      }
    } catch (error) {
      console.error("Error rejecting draft:", error);
    }
  };

  const handleResetToReview = async () => {
    try {
      const response = await translationApi.updateDraftReviewState(
        localDraft.id,
        "SUGGESTED_BY_AI"
      );
      if (response.success) {
        // Update local state immediately
        setLocalDraft((prev) => ({
          ...prev,
          reviewState: "SUGGESTED_BY_AI" as ReviewState,
        }));
        // Don't call onDraftUpdate to avoid refreshing parent
      } else {
        console.error("Failed to reset draft:", response.error);
      }
    } catch (error) {
      console.error("Error resetting draft:", error);
    }
  };

  const handleDeleteDraft = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this draft? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await translationApi.deleteDraft(localDraft.id);
      if (response.success) {
        addToast({
          type: "success",
          title: "Success",
          message: OPERATION_MESSAGES.DELETE_DRAFT.success,
        });
        // Call onDraftUpdate to refresh the parent component and remove this draft
        if (onDraftUpdate) {
          onDraftUpdate();
        }
      } else {
        addToast({
          type: "error",
          title: "Error",
          message:
            response.error?.message || OPERATION_MESSAGES.DELETE_DRAFT.error,
        });
      }
    } catch (error) {
      addToast({
        type: "error",
        title: "Error",
        message: OPERATION_MESSAGES.DELETE_DRAFT.error,
      });
      console.error("Error deleting draft:", error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingOriginal(false);
    setEditedContent(localDraft.content);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <div className="bg-gray-50 border rounded-md p-3">
        {/* Collapsible Header */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={toggleExpanded}
            className="flex items-center space-x-2 text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                isExpanded ? "" : "-rotate-90"
              }`}
            />

            <span>
              Language:{" "}
              {languageNames[localDraft.language] ||
                localDraft.language.toUpperCase()}
              {hasTranslations && (
                <span className="text-blue-600 font-normal">
                  {" "}
                  • {Object.keys(localDraft.translations!).length}{" "}
                  translation(s)
                </span>
              )}
            </span>
          </button>

          <div className="flex items-center space-x-2">
            <CostDisplay 
              cost={localDraft.cost || 0} 
              type="draft" 
              size="sm" 
              showLabel={false}
            />
            
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getReviewStateColor(
                localDraft.reviewState
              )}`}
            >
              {localDraft.reviewState.replace("_", " ")}
            </span>

            <Button
              onClick={() => setShowTranslationModal(true)}
              size="sm"
              variant="default"
              className="h-7"
            >
              <Languages className="w-3 h-3 mr-1" />
              Translate
            </Button>

            <Button
              onClick={handleDeleteDraft}
              size="sm"
              variant="destructive"
              className="h-7"
              title="Delete this draft"
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Collapsible Content */}
        {isExpanded && (
          <div className="space-y-3">
            {/* Original Content - Editable */}
            {isEditingOriginal ? (
              <div className="space-y-2">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-900 resize-y max-h-64"
                  rows={4}
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={handleSaveOriginal}
                    size="sm"
                    variant="default"
                  >
                    Save
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    size="sm"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <p className="text-gray-900 text-sm flex-1">
                  {localDraft.content}
                </p>
                <Button
                  onClick={handleEditOriginal}
                  size="sm"
                  variant="outline"
                  className="ml-2 bg-transparent"
                >
                  Edit
                </Button>
              </div>
            )}

            <hr className="my-2 border-gray-200" />

            {/* Translations Display */}
            {hasTranslations && <TranslationDisplay draft={localDraft} />}

            {/* Footer */}
            <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
              <div>
                {localDraft.aiModel && (
                  <span>Generated by: {localDraft.aiModel}</span>
                )}
                <span className="ml-2">
                  {new Date(localDraft.createdAt).toLocaleDateString()}
                </span>
              </div>
              {getReviewStateActions(localDraft.reviewState)}
            </div>
          </div>
        )}
      </div>

      {/* Translation Modal */}
      <TranslationModal
        isOpen={showTranslationModal}
        onClose={() => setShowTranslationModal(false)}
        draftId={localDraft.id}
        currentLanguage={localDraft.language}
        draft={localDraft} // Pass draft data to check existing translations
        onTranslationComplete={() => {}} // No need to refresh parent component
      />
    </>
  );
};
