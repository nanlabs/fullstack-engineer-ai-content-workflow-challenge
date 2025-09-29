"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { translationApi } from "@/lib/api/client";
import type { Draft } from "@/types";
import { useDraftUpdates } from "@/hooks/websocket/useDraftUpdates";
import { ChevronDown, Languages, Pencil, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";

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
          <Languages className="w-4 h-4 mr-2" />
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
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        isExpanded ? "" : "-rotate-90"
                      }`}
                    />
                    <span>
                      {languageNames[languageCode] ||
                        languageCode.toUpperCase()}
                    </span>
                  </button>
                </div>

                {/* State Actions */}
                <div className="flex items-center space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!isExpanded) {
                        handleTranslationToggle(languageCode);
                      }
                      handleEditTranslation(languageCode);
                    }}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteTranslation(languageCode)}
                    title={`Delete ${
                      languageNames[languageCode] || languageCode.toUpperCase()
                    } translation`}
                  >
                    <Trash className="w-3 h-3" />
                  </Button>
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
                      <div className="flex space-x-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleCancelEditTranslation(languageCode)
                          }
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveTranslation(languageCode)}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap flex-1 pr-4">
                        {content}
                      </p>
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
