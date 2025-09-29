"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { translationApi } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";
import type {
  SupportedLanguages,
  TranslationRequest,
  Draft,
  SupportedLanguagesResponse,
} from "@/types";
import { Languages, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftId: string;
  currentLanguage: string;
  draft?: Draft; // Add draft prop to check existing translations
  onTranslationComplete: () => void;
}

export const TranslationModal: React.FC<TranslationModalProps> = ({
  isOpen,
  onClose,
  draftId,
  currentLanguage,
  draft,
  onTranslationComplete,
}) => {
  const [supportedLanguages, setSupportedLanguages] =
    useState<SupportedLanguages>({});
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const loadSupportedLanguages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await translationApi.getSupportedLanguages();

      if (response.success && response.data) {
        const languagesResponse = response.data as SupportedLanguagesResponse;
        const languages = languagesResponse.data;
        setSupportedLanguages(languages);
      } else {
        addToast({
          type: "error",
          title: "Error",
          message: "Failed to load supported languages",
        });
      }
    } catch (error) {
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to load supported languages: " + error,
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Load supported languages on component mount
  useEffect(() => {
    if (isOpen) {
      loadSupportedLanguages();
    }
  }, [isOpen, currentLanguage, loadSupportedLanguages]);

  const handleLanguageToggle = (languageCode: string) => {
    // Don't allow selecting the current language
    if (languageCode === currentLanguage) return;

    setSelectedLanguages((prev) =>
      prev.includes(languageCode)
        ? prev.filter((lang) => lang !== languageCode)
        : [...prev, languageCode]
    );
  };

  const handleTranslate = async () => {
    if (selectedLanguages.length === 0) {
      addToast({
        type: "warning",
        title: "No Languages Selected",
        message: "Please select at least one language to translate to",
      });
      return;
    }

    // Check for existing translations and warn user
    const existingTranslations = draft?.translations || {};
    const languagesToOverwrite = selectedLanguages.filter(
      (lang) => existingTranslations[lang]
    );

    if (languagesToOverwrite.length > 0) {
      const overwriteMessage = `You are about to overwrite existing translations for: ${languagesToOverwrite
        .map((lang) => (supportedLanguages && supportedLanguages[lang]) || lang)
        .join(", ")}. This action cannot be undone.`;

      if (!window.confirm(`${overwriteMessage}\n\nDo you want to continue?`)) {
        return;
      }
    }

    try {
      setIsTranslating(true);

      const translationRequest: TranslationRequest = {
        draftId,
        targetLanguages: selectedLanguages,
      };

      const response = await translationApi.translateDraft(translationRequest);

      if (response.success) {
        const newLanguages = selectedLanguages.filter(
          (lang) => !existingTranslations[lang]
        );
        const overwrittenLanguages = selectedLanguages.filter(
          (lang) => existingTranslations[lang]
        );

        let message = `Translating to ${selectedLanguages.length} language(s). You'll see progress updates in real-time.`;

        if (newLanguages.length > 0 && overwrittenLanguages.length > 0) {
          message = `Adding ${newLanguages.length} new translation(s) and updating ${overwrittenLanguages.length} existing translation(s).`;
        } else if (overwrittenLanguages.length > 0) {
          message = `Updating ${overwrittenLanguages.length} existing translation(s).`;
        } else {
          message = `Adding ${newLanguages.length} new translation(s).`;
        }

        addToast({
          type: "success",
          title: "Translation Started",
          message,
        });

        onTranslationComplete();
        onClose();
      } else {
        addToast({
          type: "error",
          title: "Translation Failed",
          message: response.error?.message || "Failed to start translation",
        });
      }
    } catch (error) {
      addToast({
        type: "error",
        title: "Translation Error",
        message: "Failed to start translation process: " + error,
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleClose = () => {
    if (!isTranslating) {
      setSelectedLanguages([]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Translate Draft
          </h2>
          <button
            onClick={handleClose}
            disabled={isTranslating}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading languages...</span>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-4">
                  Select the languages you want to translate this draft to:
                </p>

                {/* Current Language Display */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Current Language:</strong>{" "}
                    {typeof currentLanguage === "string"
                      ? supportedLanguages[currentLanguage] || currentLanguage
                      : String(currentLanguage)}
                  </p>
                </div>

                {/* Language Selection */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {supportedLanguages &&
                  typeof supportedLanguages === "object" ? (
                    Object.entries(supportedLanguages).map(([code, name]) => {
                      const hasExistingTranslation =
                        draft?.translations && draft.translations[code];
                      const isSelected = selectedLanguages.includes(code);

                      return (
                        <label
                          key={code}
                          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                            code === currentLanguage
                              ? "bg-gray-100 border-gray-300 cursor-not-allowed opacity-50"
                              : isSelected
                              ? "bg-blue-50 border-blue-300"
                              : hasExistingTranslation
                              ? "bg-yellow-50 border-yellow-300"
                              : "bg-white border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleLanguageToggle(code)}
                            disabled={code === currentLanguage}
                            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">
                              {typeof name === "string" ? name : String(name)}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({code.toUpperCase()})
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {code === currentLanguage && (
                              <span className="text-xs text-gray-500">
                                Current
                              </span>
                            )}
                            {hasExistingTranslation && (
                              <span className="text-xs text-yellow-600 font-medium">
                                Has Translation
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      Loading languages...
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Languages Summary */}
              {selectedLanguages.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm">
                    <p className="text-blue-800 mb-2">
                      <strong>Selected Languages:</strong>
                    </p>
                    <div className="space-y-1">
                      {selectedLanguages.map((code) => {
                        const hasExisting =
                          draft?.translations && draft.translations[code];
                        return (
                          <div
                            key={code}
                            className="flex items-center justify-between"
                          >
                            <span className="text-blue-700">
                              {(supportedLanguages &&
                                supportedLanguages[code]) ||
                                code}{" "}
                              ({code.toUpperCase()})
                            </span>
                            {hasExisting ? (
                              <span className="text-xs text-yellow-600 font-medium">
                                Will Update Existing
                              </span>
                            ) : (
                              <span className="text-xs text-green-600 font-medium">
                                New Translation
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isTranslating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleTranslate}
            disabled={isTranslating || selectedLanguages.length === 0}
          >
            {isTranslating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Translating...
              </>
            ) : (
              <>
                <Languages className="w-4 h-4 mr-2" />
                Translate ({selectedLanguages.length})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
