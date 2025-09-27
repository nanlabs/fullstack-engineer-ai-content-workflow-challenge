"use client";

import React, { useState, useEffect } from "react";
import { Draft, ReviewState } from "@/types";
import { TranslationModal } from "@/components/translation/TranslationModal";
import { TranslationDisplay } from "@/components/translation/TranslationDisplay";
import { translationApi } from "@/lib/api/client";
import { useDraftUpdates } from "@/hooks/websocket/useDraftUpdates";
import { useToast } from "@/components/ui/ToastProvider";
import { OPERATION_MESSAGES } from "@/lib/api/errorHandler";

interface DraftCardProps {
  draft: Draft;
  onDraftUpdate?: () => void;
}

export const DraftCard: React.FC<DraftCardProps> = ({ draft, onDraftUpdate }) => {
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const [isEditingOriginal, setIsEditingOriginal] = useState(false);
  const [editedContent, setEditedContent] = useState(draft.content);
  const [localDraft, setLocalDraft] = useState<Draft>(draft);
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded by default
  const { addToast } = useToast();

  // Update local draft when prop changes
  useEffect(() => {
    setLocalDraft(draft);
    setEditedContent(draft.content);
  }, [draft]);

  // Handle WebSocket updates for this specific draft
  const handleDraftUpdate = (updatedDraft: Draft) => {
    setLocalDraft(updatedDraft);
    setEditedContent(updatedDraft.content);
    // Don't call onDraftUpdate to avoid refreshing the parent component
  };

  const handleTranslationStateUpdate = (language: string, state: string) => {
    setLocalDraft((prev) => ({
      ...prev,
      translationStates: {
        ...prev.translationStates,
        [language]: state,
      },
    }));
  };

  useDraftUpdates({
    draftId: draft.id,
    onDraftUpdate: handleDraftUpdate,
    onTranslationStateUpdate: handleTranslationStateUpdate,
  });

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
            <button
              onClick={handleApproveDraft}
              className="text-green-600 hover:text-green-800 text-sm font-medium"
            >
              Approve
            </button>
            <button
              onClick={handleRejectDraft}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Reject
            </button>
          </div>
        );
      case ReviewState.REVIEWED:
        return (
          <div className="flex space-x-2">
            <button
              onClick={handleApproveDraft}
              className="text-green-600 hover:text-green-800 text-sm font-medium"
            >
              Approve
            </button>
            <button
              onClick={handleRejectDraft}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Reject
            </button>
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

  const handleDeleteDraft = async () => {
    if (!window.confirm("Are you sure you want to delete this draft? This action cannot be undone.")) {
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
          message: response.error?.message || OPERATION_MESSAGES.DELETE_DRAFT.error,
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
            <svg
              className={`w-4 h-4 transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
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
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getReviewStateColor(
                localDraft.reviewState
              )}`}
            >
              {localDraft.reviewState.replace("_", " ")}
            </span>

            {/* Translation Button */}
            <button
              onClick={() => setShowTranslationModal(true)}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                />
              </svg>
              <span>Translate</span>
            </button>

            {/* Delete Draft Button */}
            <button
              onClick={handleDeleteDraft}
              className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center space-x-1 cursor-pointer"
              title="Delete this draft"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>Delete</span>
            </button>
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
                  <button
                    onClick={handleSaveOriginal}
                    className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <p className="text-gray-900 text-sm flex-1">
                  {localDraft.content}
                </p>
                <button
                  onClick={handleEditOriginal}
                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors ml-2"
                >
                  Edit
                </button>
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
