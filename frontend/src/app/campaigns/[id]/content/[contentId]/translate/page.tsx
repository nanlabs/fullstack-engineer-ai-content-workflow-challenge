'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { ContentResponseDto, TranslationResponseDto } from '@/types';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeftIcon, 
  GlobeAltIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const SUPPORTED_LANGUAGES = [
  { code: 'Spanish', name: 'Spanish (Español)' },
  { code: 'French', name: 'French (Français)' },
  { code: 'German', name: 'German (Deutsch)' },
  { code: 'Italian', name: 'Italian (Italiano)' },
  { code: 'Portuguese', name: 'Portuguese (Português)' },
  { code: 'Russian', name: 'Russian (Русский)' },
  { code: 'Japanese', name: 'Japanese (日本語)' },
  { code: 'Korean', name: 'Korean (한국어)' },
  { code: 'Chinese', name: 'Chinese (中文)' },
  { code: 'Arabic', name: 'Arabic (العربية)' },
  { code: 'Hindi', name: 'Hindi (हिन्दी)' },
  { code: 'Dutch', name: 'Dutch (Nederlands)' },
  { code: 'English', name: 'English' }
];

export default function CreateTranslationPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.contentId as string;
  const campaignId = params.id as string;
  
  const [content, setContent] = useState<ContentResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [context, setContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadContent();
  }, [contentId]);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      setError('');
      const contentData = await apiClient.getContentById(contentId);
      setContent(contentData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedLanguage) {
      toast.error('Please select a language');
      return;
    }

    if (!content) {
      toast.error('Content not loaded');
      return;
    }

    setIsGenerating(true);
    
    try {
      const translationData = {
        language: selectedLanguage,
        context: context.trim() || undefined,
        aiModelUsed: 'gpt-3.5-turbo'
      };

      await apiClient.generateAITranslation(content.id, translationData);
      
      toast.success('Translation generated successfully!');
      router.push(`/campaigns/${campaignId}/content/${contentId}/translations`);
    } catch (error: any) {
      console.error('Translation generation error:', error);
      toast.error(error.response?.data?.message || 'Failed to generate translation');
    } finally {
      setIsGenerating(false);
    }
  };

  const mapLanguageCodeToName = (code: string): string => {
    const mapping: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'nl': 'Dutch'
    };
    return mapping[code.toLowerCase()] || code;
  };

  const getTypeLabel = (type: string) => {
    return type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!content) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900">Content not found</h2>
              <Link href={`/campaigns/${campaignId}`} className="text-purple-600 hover:text-purple-500 mt-4 inline-block">
                Back to Campaign
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const currentLanguageName = mapLanguageCodeToName(content.language);
  const availableLanguages = SUPPORTED_LANGUAGES.filter(lang => lang.code !== currentLanguageName);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <Link
                  href={`/campaigns/${campaignId}/content/${contentId}/translations`}
                  className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
                >
                  <ArrowLeftIcon className="h-5 w-5 mr-1" />
                  Back to Translations
                </Link>
              </div>
              
              <div className="flex items-center">
                <GlobeAltIcon className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Create Translation</h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Translate "{content.title}" with AI
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original Content */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Original Content</h2>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    {content.language.toUpperCase()}
                  </span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <p className="text-sm text-gray-900">{content.title}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <p className="text-sm text-gray-600">{getTypeLabel(content.type)}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {content.content || 'No content available'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Translation Form */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">Translation Settings</h2>
                
                <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="space-y-6">
                  {/* Language Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Language *
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      required
                    >
                      <option value="">Choose a language...</option>
                      {availableLanguages.map((language) => (
                        <option key={language.code} value={language.code}>
                          {language.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Context Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Translation Context (Optional)
                    </label>
                    <textarea
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder={`Provide specific context for ${selectedLanguage || 'the translation'} (e.g., "Argentinian Spanish", "Canadian French", "Formal tone for business", etc.)`}
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3">
                    <Link
                      href={`/campaigns/${campaignId}/content/${contentId}/translations`}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      disabled={isGenerating || !selectedLanguage}
                      className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md disabled:opacity-50 flex items-center"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="h-4 w-4 mr-2" />
                          Generate Translation
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
