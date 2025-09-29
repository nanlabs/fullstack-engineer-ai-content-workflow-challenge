import { useState } from 'react';
import { ContentResponseDto, TranslationResponseDto } from '@/types';
import { apiClient } from '@/lib/api-client';
import { GlobeAltIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface TranslationModalProps {
  content: ContentResponseDto;
  isOpen: boolean;
  onClose: () => void;
  onTranslated: (translation: TranslationResponseDto) => void;
}

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

export default function TranslationModal({ content, isOpen, onClose, onTranslated }: TranslationModalProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [context, setContext] = useState('');
  const [model, setModel] = useState('gpt-3.5-turbo');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!selectedLanguage) {
      setError('Please select a language');
      return;
    }

    try {
      setIsGenerating(true);
      setError('');
      
      // Create translation request with contentPieceId in the data
      const translationData = {
        contentPieceId: content.id,
        language: selectedLanguage,
        content: context ? `${context}\n\n${content.content || ''}` : (content.content || '')
      };
      
      const translation = await apiClient.createContentTranslation(content.id, translationData);

      onTranslated(translation);
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate translation');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setSelectedLanguage('');
    setContext('');
    setModel('gpt-3.5-turbo');
    setError('');
    onClose();
  };

  // Map common language codes to full names for filtering
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

  // Filter out the current content language
  const currentLanguageName = mapLanguageCodeToName(content.language);
  const availableLanguages = SUPPORTED_LANGUAGES.filter(lang => lang.code !== currentLanguageName);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <GlobeAltIcon className="h-6 w-6 text-purple-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              Translate Content with AI
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Content Preview */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium text-gray-900">{content.title}</h3>
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
              {content.language.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-gray-600 line-clamp-3">
            {content.content || 'No content available'}
          </p>
        </div>

        {/* Language Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select target language:
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
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
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Translation Context (Optional)
          </label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder={`Provide specific context for ${selectedLanguage || 'the translation'} (e.g., "Argentinian Spanish", "Canadian French", "Formal tone for business", etc.)`}
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isGenerating}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
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
      </div>
    </div>
  );
}
