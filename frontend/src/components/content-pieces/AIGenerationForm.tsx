"use client";

import React, { useState } from "react";
import { ContentPiece } from "@/types";

interface AIGenerationFormProps {
  contentPiece: ContentPiece;
  onSubmit: (data: {
    contentPieceId: string;
    prompt: string;
    contentType?: string;
    language?: string;
  }) => void;
  onCancel: () => void;
}

export const AIGenerationForm: React.FC<AIGenerationFormProps> = ({
  contentPiece,
  onSubmit,
  onCancel,
}) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [contentType, setContentType] = useState(contentPiece.contentType);
  const [language, setLanguage] = useState(contentPiece.language);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      onSubmit({
        contentPieceId: contentPiece.id,
        prompt: prompt.trim(),
        contentType:
          contentType !== contentPiece.contentType ? contentType : undefined,
        language: language !== contentPiece.language ? language : undefined,
      });
      setPrompt("");
    } finally {
      setIsGenerating(false);
    }
  };

  const getDefaultPrompts = () => {
    const prompts = {
      headline: [
        "Create a catchy headline for a marketing campaign",
        "Generate a compelling headline that grabs attention",
        "Write a professional headline for this content",
      ],
      description: [
        "Write a detailed product description",
        "Create an engaging description that explains the benefits",
        "Generate a compelling product description",
      ],
      translation: [
        "Translate this content to Spanish",
        "Convert this to French for international markets",
        "Localize this content for German audiences",
      ],
      tagline: [
        "Create a memorable tagline",
        "Generate a short, punchy tagline",
        "Write a brand tagline that resonates",
      ],
      "call-to-action": [
        "Create a compelling call-to-action",
        "Generate an action-oriented CTA",
        "Write a persuasive call-to-action button text",
      ],
    };

    return (
      prompts[contentType as keyof typeof prompts] || [
        "Generate content for this piece",
        "Create engaging content",
        "Write compelling copy",
      ]
    );
  };

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">
        Generate AI Draft
      </h4>

      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <p className="text-sm text-gray-600 mb-1">
          <strong>Content Piece:</strong> {contentPiece.title}
        </p>
        <p className="text-sm text-gray-500">
          <strong>Type:</strong> {contentType} • <strong>Language:</strong>{" "}
          {language.toUpperCase()}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="prompt"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            AI Prompt *
          </label>
          <textarea
            id="prompt"
            name="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe what you want the AI to generate..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="contentType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Content Type
            </label>
            <select
              id="contentType"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="headline">Headline</option>
              <option value="description">Description</option>
              <option value="tagline">Tagline</option>
              <option value="call-to-action">Call to Action</option>
              <option value="translation">Translation</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="language"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Language
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Prompts
          </label>
          <div className="space-y-2">
            {getDefaultPrompts().map((defaultPrompt, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setPrompt(defaultPrompt)}
                className="block w-full text-left px-3 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md border"
              >
                {defaultPrompt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            disabled={isGenerating}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? "Generating..." : "Generate Draft"}
          </button>
        </div>
      </form>
    </div>
  );
};
