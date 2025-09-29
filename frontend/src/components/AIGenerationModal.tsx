'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { ContentResponseDto, GenerateAIContentDto } from '@/types';
import { SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface AIGenerationModalProps {
  content: ContentResponseDto;
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (updatedContent: ContentResponseDto) => void;
}

export default function AIGenerationModal({ 
  content, 
  isOpen, 
  onClose, 
  onGenerated 
}: AIGenerationModalProps) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('gpt-3.5-turbo');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    try {
      setIsGenerating(true);
      setError('');
      
      const generateData: GenerateAIContentDto = {
        prompt: prompt.trim(),
        model
      };

      const updatedContent = await apiClient.generateAIContent(content.id, generateData);
      onGenerated(updatedContent);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate AI content');
    } finally {
      setIsGenerating(false);
    }
  };

  const getContentTypePromptSuggestion = () => {
    const suggestions: Record<string, string> = {
      'SOCIAL_POST': 'Create an engaging social media post about',
      'EMAIL_SUBJECT': 'Write a compelling email subject line for',
      'EMAIL_BODY': 'Write a professional email body for',
      'PRODUCT_DESCRIPTION': 'Create a detailed product description for',
      'BLOG_POST': 'Write a blog post about',
      'AD_COPY': 'Create persuasive advertising copy for',
      'AD_HEADLINE': 'Write an attention-grabbing headline for'
    };
    return suggestions[content.type] || 'Generate content for';
  };

  if (!isOpen || !content) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <SparklesIcon className="h-6 w-6 text-purple-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              Generate AI Content
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">{content.title}</h4>
          <div className="text-sm text-gray-600">
            Type: {content.type.replace(/_/g, ' ')} • Language: {content.language.toUpperCase()}
          </div>
        </div>

        <form onSubmit={handleGenerate}>
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Model
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="gpt-4">GPT-4</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt *
            </label>
            <textarea
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder={`${getContentTypePromptSuggestion()} your product/service/topic...`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <p className="mt-2 text-sm text-gray-500">
              Be specific about your requirements, target audience, tone, and key points to include.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md disabled:opacity-50 flex items-center"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  Generate Content
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
