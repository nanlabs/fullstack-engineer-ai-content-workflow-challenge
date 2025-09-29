import { useState, useEffect } from 'react';
import { ContentResponseDto, TranslationResponseDto, TranslationStatus } from '@/types';
import { apiClient } from '@/lib/api-client';
import { GlobeAltIcon, EyeIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface TranslationsViewModalProps {
  content: ContentResponseDto;
  isOpen: boolean;
  onClose: () => void;
}

export default function TranslationsViewModal({ content, isOpen, onClose }: TranslationsViewModalProps) {
  const [translations, setTranslations] = useState<TranslationResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTranslation, setSelectedTranslation] = useState<TranslationResponseDto | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (isOpen && content.id) {
      loadTranslations();
    }
  }, [isOpen, content.id]);

  const loadTranslations = async () => {
    try {
      setIsLoading(true);
      setError('');
      const translationsData = await apiClient.getContentTranslations(content.id);
      setTranslations(translationsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load translations');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeClass = (status: TranslationStatus) => {
    const baseClass = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (status) {
      case TranslationStatus.PENDING:
        return `${baseClass} bg-yellow-100 text-yellow-800`;
      case TranslationStatus.COMPLETED:
        return `${baseClass} bg-green-100 text-green-800`;
      case TranslationStatus.FAILED:
        return `${baseClass} bg-red-100 text-red-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  };

  const handleViewTranslation = (translation: TranslationResponseDto) => {
    setSelectedTranslation(translation);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setSelectedTranslation(null);
    setShowDetails(false);
  };

  const handleClose = () => {
    setTranslations([]);
    setSelectedTranslation(null);
    setShowDetails(false);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <GlobeAltIcon className="h-6 w-6 text-purple-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              Translations for "{content.title}"
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

        {/* Original Content */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium text-gray-900">Original Content</h3>
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
              {content.language.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {content.content || 'No content available'}
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <>
            {/* Translations List */}
            {translations.length === 0 ? (
              <div className="text-center py-12">
                <GlobeAltIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No translations yet
                </h3>
                <p className="text-gray-600">
                  Create your first translation using the translate button on the content card.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {translations.map((translation) => (
                  <div
                    key={translation.id}
                    className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-gray-900">
                          {translation.language}
                        </h3>
                        <span className={getStatusBadgeClass(translation.status)}>
                          {translation.status}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewTranslation(translation)}
                          className="text-purple-600 hover:text-purple-700"
                          title="View Translation"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {translation.content}
                    </p>
                    
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>
                        Created {new Date(translation.createdAt).toLocaleDateString()}
                      </span>
                      {translation.updatedAt && (
                        <span>
                          Updated {new Date(translation.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Translation Details Modal */}
      {showDetails && selectedTranslation && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedTranslation.language} Translation
              </h3>
              <button
                onClick={handleCloseDetails}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <span className={getStatusBadgeClass(selectedTranslation.status)}>
                  {selectedTranslation.status}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Translated Content
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {selectedTranslation.content}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Created:</span>
                  <p className="text-gray-600">
                    {new Date(selectedTranslation.createdAt).toLocaleString()}
                  </p>
                </div>
                {selectedTranslation.updatedAt && (
                  <div>
                    <span className="font-medium text-gray-700">Updated:</span>
                    <p className="text-gray-600">
                      {new Date(selectedTranslation.updatedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCloseDetails}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
