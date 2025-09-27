"use client";

import React, { useState, useEffect } from "react";
import { translationApi } from "@/lib/api/client";
import { Draft } from "@/types";
import { useDraftUpdates } from "@/hooks/websocket/useDraftUpdates";

interface TranslationDisplayProps {
  draft: Draft;
}

export const TranslationDisplay: React.FC<TranslationDisplayProps> = ({
  draft,
}) => {
  const [expandedTranslations, setExpandedTranslations] = useState<string[]>(
    []
  );
  const [editingTranslations, setEditingTranslations] = useState<Set<string>>(
    new Set()
  );
  const [editedTranslations, setEditedTranslations] = useState<
    Record<string, string>
  >({});
  const [localDraft, setLocalDraft] = useState<Draft>(draft);

  // Update local draft when prop changes
  useEffect(() => {
    setLocalDraft(draft);
  }, [draft]);

  // Handle WebSocket updates for this specific draft
  const handleDraftUpdate = (updatedDraft: Draft) => {
    setLocalDraft(updatedDraft);
    // Don't call onTranslationUpdate to avoid refreshing parent
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

  const translations = localDraft.translations || {};

  const handleTranslationToggle = (languageCode: string) => {
    setExpandedTranslations((prev) =>
      prev.includes(languageCode)
        ? prev.filter((lang) => lang !== languageCode)
        : [...prev, languageCode]
    );
  };

  const handleEditTranslation = (languageCode: string) => {
    setEditingTranslations((prev) => new Set(prev).add(languageCode));
    setEditedTranslations((prev) => ({
      ...prev,
      [languageCode]: translations[languageCode] || "",
    }));
  };

  const handleSaveTranslation = async (languageCode: string) => {
    try {
      const response = await translationApi.updateTranslationContent(
        localDraft.id,
        languageCode,
        editedTranslations[languageCode]
      );
      if (response.success) {
        setEditingTranslations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(languageCode);
          return newSet;
        });
        // Update local state immediately
        setLocalDraft((prev) => ({
          ...prev,
          translations: {
            ...prev.translations,
            [languageCode]: editedTranslations[languageCode],
          },
        }));
        // Don't call onTranslationUpdate to avoid refreshing parent
      } else {
        console.error("Failed to save translation:", response.error);
      }
    } catch (error) {
      console.error("Error saving translation:", error);
    }
  };

  const handleDeleteTranslation = async (languageCode: string) => {
    const languageName =
      languageNames[languageCode] || languageCode.toUpperCase();

    if (
      !window.confirm(
        `Are you sure you want to delete the ${languageName} translation? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await translationApi.deleteTranslation(
        localDraft.id,
        languageCode
      );
      if (response.success) {
        // Update local state immediately
        setLocalDraft((prev) => {
          const newTranslations = { ...prev.translations };
          const newTranslationStates = { ...prev.translationStates };
          delete newTranslations[languageCode];
          delete newTranslationStates[languageCode];

          return {
            ...prev,
            translations: newTranslations,
            translationStates: newTranslationStates,
          };
        });

        // Remove from editing states if it was being edited
        setEditingTranslations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(languageCode);
          return newSet;
        });

        // Remove from expanded states
        setExpandedTranslations((prev) =>
          prev.filter((lang) => lang !== languageCode)
        );

        // Don't call onTranslationUpdate to avoid refreshing parent
      } else {
        console.error("Failed to delete translation:", response.error);
      }
    } catch (error) {
      console.error("Error deleting translation:", error);
    }
  };

  const handleCancelEditTranslation = (languageCode: string) => {
    setEditingTranslations((prev) => {
      const newSet = new Set(prev);
      newSet.delete(languageCode);
      return newSet;
    });
    setEditedTranslations((prev) => {
      const newEdited = { ...prev };
      delete newEdited[languageCode];
      return newEdited;
    });
  };

  const languageNames: Record<string, string> = {
    es: "Spanish",
    en: "English",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
  };

  if (Object.keys(translations).length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 flex items-center">
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
              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
            />
          </svg>
          Translations ({Object.keys(translations).length})
        </h4>
      </div>

      <div className="space-y-3">
        {Object.entries(translations).map(([languageCode, content]) => {
          const isExpanded = expandedTranslations.includes(languageCode);

          return (
            <div
              key={languageCode}
              className="border rounded-lg p-3 bg-gray-50"
            >
              {/* Translation Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleTranslationToggle(languageCode)}
                    className="flex items-center space-x-2 text-sm font-medium text-gray-900 hover:text-blue-600"
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
                      {languageNames[languageCode] ||
                        languageCode.toUpperCase()}
                    </span>
                  </button>

                  {/* <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStateColor(
                      state
                    )}`}
                  >
                    {getStateIcon(state)}
                    <span className="ml-1">{state.replace("_", " ")}</span>
                  </span> */}
                </div>

                {/* State Actions */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleDeleteTranslation(languageCode)}
                    className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center space-x-1"
                    title={`Delete ${
                      languageNames[languageCode] || languageCode.toUpperCase()
                    } translation`}
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Translation Content */}
              {isExpanded && (
                <div className="mt-2 p-3 bg-white rounded border">
                  {editingTranslations.has(languageCode) ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedTranslations[languageCode] || content}
                        onChange={(e) =>
                          setEditedTranslations((prev) => ({
                            ...prev,
                            [languageCode]: e.target.value,
                          }))
                        }
                        className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-700 resize-none"
                        rows={4}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSaveTranslation(languageCode)}
                          className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() =>
                            handleCancelEditTranslation(languageCode)
                          }
                          className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap flex-1">
                        {content}
                      </p>
                      <button
                        onClick={() => handleEditTranslation(languageCode)}
                        className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors ml-2"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
