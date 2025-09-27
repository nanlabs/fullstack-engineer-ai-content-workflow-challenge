"use client";

import React, { useState, useEffect, useCallback } from "react";
import { translationApi } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";
import { SupportedLanguages } from "@/types";

interface LanguageSettingsProps {
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
}

export const LanguageSettings: React.FC<LanguageSettingsProps> = ({
  currentLanguage,
  onLanguageChange,
}) => {
  const [supportedLanguages, setSupportedLanguages] =
    useState<SupportedLanguages>({});
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const loadSupportedLanguages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await translationApi.getSupportedLanguages();

      if (response.success && response.data) {
        // The API returns { success: true, data: { es: "Spanish", en: "English", ... } }
        // So we need to access response.data.data to get the actual languages object
        const languages = response.data.data || response.data;
        setSupportedLanguages(languages as SupportedLanguages);
      } else {
        addToast({
          type: "error",
          title: "Error",
          message: "Failed to load supported languages",
        });
      }
    } catch (error) {
      console.error("LanguageSettings - Error:", error);
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to load supported languages",
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Load supported languages on component mount
  useEffect(() => {
    loadSupportedLanguages();
  }, [loadSupportedLanguages]);

  const handleLanguageSelect = (languageCode: string) => {
    onLanguageChange(languageCode);
    setIsOpen(false);
    addToast({
      type: "success",
      title: "Language Updated",
      message: `Default language set to ${supportedLanguages[languageCode]}`,
    });
  };

  const getCurrentLanguageName = () => {
    return supportedLanguages[currentLanguage] || currentLanguage.toUpperCase();
  };

  return (
    <div className="relative">
      {/* Language Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <svg
          className="w-4 h-4"
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
        <span>{loading ? "Loading..." : getCurrentLanguageName()}</span>
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Language Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b">
              Select Language
            </div>

            {Object.entries(supportedLanguages).map(([code, name]) => (
              <button
                key={code}
                onClick={() => handleLanguageSelect(code)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${
                  code === currentLanguage
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700"
                }`}
              >
                <span>{name}</span>
                <span className="text-xs text-gray-500">
                  ({code.toUpperCase()})
                </span>
                {code === currentLanguage && (
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
};
