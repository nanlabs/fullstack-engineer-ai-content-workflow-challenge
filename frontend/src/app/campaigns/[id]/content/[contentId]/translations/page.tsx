'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { 
  ContentResponseDto, 
  TranslationResponseDto, 
  TranslationStatus 
} from '@/types';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import ActionCard, { ActionButton } from '@/components/shared/ActionCard';
import ConfirmModal from '@/components/shared/ConfirmModal';
import InlineEditor from '@/components/shared/InlineEditor';
import StatusSelector from '@/components/shared/StatusSelector';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  GlobeAltIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

export default function ContentTranslationsPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.contentId as string;
  const campaignId = params.id as string;
  
  const [content, setContent] = useState<ContentResponseDto | null>(null);
  const [translations, setTranslations] = useState<TranslationResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingTranslation, setEditingTranslation] = useState<TranslationResponseDto | null>(null);
  const [editContent, setEditContent] = useState('');
  const [regeneratingTranslation, setRegeneratingTranslation] = useState<TranslationResponseDto | null>(null);
  const [feedback, setFeedback] = useState('');
  const [changingStatus, setChangingStatus] = useState<TranslationResponseDto | null>(null);
  const [newStatus, setNewStatus] = useState<TranslationStatus>(TranslationStatus.PENDING);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, translation: TranslationResponseDto | null}>({
    isOpen: false,
    translation: null
  });
  const [expandedTranslation, setExpandedTranslation] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [contentId]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Load both content details and translations
      const [contentData, translationsData] = await Promise.all([
        apiClient.getContentById(contentId),
        apiClient.getContentTranslations(contentId)
      ]);
      
      setContent(contentData);
      setTranslations(translationsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load translations');
    } finally {
      setIsLoading(false);
    }
  }, [contentId]);

  // Setup real-time updates for translations
  useRealTimeUpdates({
    onTranslationUpdate: loadData,
    onContentUpdate: loadData,
    contentId: contentId,
    enabled: true,
  });

  const getStatusBadgeClass = (status: TranslationStatus) => {
    const baseClass = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (status) {
      case TranslationStatus.PENDING:
        return `${baseClass} bg-yellow-100 text-yellow-800`;
      case TranslationStatus.COMPLETED:
        return `${baseClass} bg-green-100 text-green-800`;
      case TranslationStatus.FAILED:
        return `${baseClass} bg-red-100 text-red-800`;
      case TranslationStatus.REVIEWED:
        return `${baseClass} bg-blue-100 text-blue-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  };

  const getTypeLabel = (type: string) => {
    return type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleEditTranslation = (translation: TranslationResponseDto) => {
    setEditingTranslation(translation);
    setEditContent(translation.content);
    // Close other modes if open
    setRegeneratingTranslation(null);
    setFeedback('');
    setChangingStatus(null);
  };

  const handleSaveEdit = async () => {
    if (!editingTranslation) return;

    try {
      const updatedTranslation = await apiClient.updateTranslation(editingTranslation.id, {
        content: editContent,
      });

      setTranslations(prev => prev.map(t => 
        t.id === editingTranslation.id ? updatedTranslation : t
      ));

      setEditingTranslation(null);
      setEditContent('');
      toast.success('Translation updated successfully');
    } catch (error: any) {
      console.error('Failed to update translation:', error);
      toast.error(error.response?.data?.message || 'Failed to update translation');
    }
  };

  const handleCancelEdit = () => {
    setEditingTranslation(null);
    setEditContent('');
  };

  const handleDeleteTranslation = (translation: TranslationResponseDto) => {
    setDeleteModal({ isOpen: true, translation });
  };

  const confirmDeleteTranslation = async () => {
    if (!deleteModal.translation) return;

    try {
      await apiClient.deleteTranslation(deleteModal.translation.id);
      setTranslations(prev => prev.filter(t => t.id !== deleteModal.translation!.id));
      toast.success('Translation deleted successfully');
      setDeleteModal({ isOpen: false, translation: null });
    } catch (error: any) {
      console.error('Failed to delete translation:', error);
      toast.error(error.response?.data?.message || 'Failed to delete translation');
    }
  };

  const handleRegenerateTranslation = (translation: TranslationResponseDto) => {
    setRegeneratingTranslation(translation);
    setFeedback('');
    // Close other modes if open
    setEditingTranslation(null);
    setEditContent('');
    setChangingStatus(null);
  };

  const handleSaveRegenerate = async () => {
    if (!regeneratingTranslation || !feedback.trim()) {
      toast.error('Please provide feedback for regeneration');
      return;
    }

    try {
      const regeneratedTranslation = await apiClient.regenerateTranslation(regeneratingTranslation.id, {
        feedback: feedback.trim(),
        model: 'gpt-3.5-turbo',
      });

      setTranslations(prev => prev.map(t => 
        t.id === regeneratingTranslation.id ? regeneratedTranslation : t
      ));

      setRegeneratingTranslation(null);
      setFeedback('');
      toast.success('Translation regenerated successfully');
    } catch (error: any) {
      console.error('Failed to regenerate translation:', error);
      toast.error(error.response?.data?.message || 'Failed to regenerate translation');
    }
  };

  const handleCancelRegenerate = () => {
    setRegeneratingTranslation(null);
    setFeedback('');
  };

  const handleChangeStatus = (translation: TranslationResponseDto) => {
    setChangingStatus(translation);
    setNewStatus(translation.status);
    // Close other modes if open
    setEditingTranslation(null);
    setEditContent('');
    setRegeneratingTranslation(null);
    setFeedback('');
  };

  const handleSaveStatus = async () => {
    if (!changingStatus) return;

    try {
      const updatedTranslation = await apiClient.updateTranslation(changingStatus.id, {
        status: newStatus,
      });

      setTranslations(prev => prev.map(t => 
        t.id === changingStatus.id ? updatedTranslation : t
      ));

      setChangingStatus(null);
      toast.success('Translation status updated successfully');
    } catch (error: any) {
      console.error('Failed to update translation status:', error);
      toast.error(error.response?.data?.message || 'Failed to update translation status');
    }
  };

  const handleCancelStatusChange = () => {
    setChangingStatus(null);
  };

  const getStatusOptions = () => [
    { value: TranslationStatus.PENDING, label: 'Pending' },
    { value: TranslationStatus.COMPLETED, label: 'Completed' },
    { value: TranslationStatus.REVIEWED, label: 'Reviewed' },
    { value: TranslationStatus.FAILED, label: 'Failed' },
  ];

  const getTranslationActions = (translation: TranslationResponseDto): ActionButton[] => [
    {
      icon: <PencilIcon className="h-5 w-5" />,
      onClick: () => handleEditTranslation(translation),
      title: 'Edit translation',
      className: 'text-blue-600 hover:text-blue-700'
    },
    {
      icon: <CheckCircleIcon className="h-5 w-5" />,
      onClick: () => handleChangeStatus(translation),
      title: 'Change status',
      className: 'text-yellow-600 hover:text-yellow-700'
    },
    {
      icon: <ArrowPathIcon className="h-5 w-5" />,
      onClick: () => handleRegenerateTranslation(translation),
      title: 'Regenerate with AI',
      className: 'text-green-600 hover:text-green-700'
    },
    {
      icon: <TrashIcon className="h-5 w-5" />,
      onClick: () => handleDeleteTranslation(translation),
      title: 'Delete translation',
      className: 'text-red-600 hover:text-red-700'
    }
  ];

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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
              <Link href={`/campaigns/${campaignId}`} className="text-indigo-600 hover:text-indigo-500 mt-4 inline-block">
                Back to Campaign
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <Link
                  href={`/campaigns/${campaignId}`}
                  className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
                >
                  <ArrowLeftIcon className="h-5 w-5 mr-1" />
                  Back to Campaign
                </Link>
              </div>
              
              <div className="flex items-center justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Content Translations</h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Manage translations for "{content.title}"
                  </p>
                </div>
              </div>
            
            </div>                <button
                  onClick={() => router.push(`/campaigns/${campaignId}/content/${contentId}/translate`)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  New Translation
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Original Content */}
              <div className="lg:col-span-1">
                <div className="bg-white shadow rounded-lg p-6 sticky top-6">
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
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                          {content.content || 'No content available'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Translations List */}
              <div className="lg:col-span-2">
                {translations.length === 0 ? (
                  <div className="bg-white shadow rounded-lg p-12 text-center">
                    <GlobeAltIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No translations yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Create your first translation to see it here.
                    </p>
                    <button
                      onClick={() => router.push(`/campaigns/${campaignId}/content/${contentId}/translate`)}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create Translation
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {translations.map((translation) => {
                      const isExpanded = expandedTranslation === translation.id;
                      
                      return (
                        <ActionCard
                          key={translation.id}
                          title={translation.language}
                          badge={{
                            text: translation.status,
                            className: getStatusBadgeClass(translation.status)
                          }}
                          actions={getTranslationActions(translation)}
                          isExpanded={isExpanded}
                          onToggleExpand={() => setExpandedTranslation(isExpanded ? null : translation.id)}
                          content={
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Translated Content
                              </label>
                              {editingTranslation?.id === translation.id ? (
                                <InlineEditor
                                  value={editContent}
                                  onSave={handleSaveEdit}
                                  onCancel={handleCancelEdit}
                                  rows={8}
                                />
                              ) : changingStatus?.id === translation.id ? (
                                <div className="space-y-3">
                                  <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                      {translation.content}
                                    </p>
                                  </div>
                                  <StatusSelector
                                    currentStatus={translation.status}
                                    options={getStatusOptions()}
                                    onSave={handleSaveStatus}
                                    onCancel={handleCancelStatusChange}
                                  />
                                </div>
                              ) : regeneratingTranslation?.id === translation.id ? (
                                <div className="space-y-3">
                                  <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                      {translation.content}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Feedback for AI (required)
                                    </label>
                                    <textarea
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-vertical"
                                      rows={4}
                                      value={feedback}
                                      onChange={(e) => setFeedback(e.target.value)}
                                      placeholder="Describe what you want to improve in this translation (e.g., 'Make it more formal', 'Use colloquial expressions for young people', 'Fix grammar issues', etc.)"
                                    />
                                  </div>
                                  <div className="flex justify-end space-x-2">
                                    <button
                                      onClick={handleCancelRegenerate}
                                      className="px-3 py-1 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={handleSaveRegenerate}
                                      disabled={!feedback.trim()}
                                      className="px-3 py-1 text-sm text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 flex items-center"
                                    >
                                      <ArrowPathIcon className="h-4 w-4 mr-1" />
                                      Regenerate
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-3 bg-gray-50 rounded-lg">
                                  <p className={`text-sm text-gray-900 whitespace-pre-wrap ${
                                    isExpanded ? '' : 'line-clamp-3'
                                  }`}>
                                    {translation.content}
                                  </p>
                                </div>
                              )}
                            </div>
                          }
                          expandedContent={
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Created:</span>
                                <p className="text-gray-600">
                                  {new Date(translation.createdAt).toLocaleString()}
                                </p>
                              </div>
                              {translation.updatedAt && (
                                <div>
                                  <span className="font-medium text-gray-700">Updated:</span>
                                  <p className="text-gray-600">
                                    {new Date(translation.updatedAt).toLocaleString()}
                                  </p>
                                </div>
                              )}
                            </div>
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, translation: null })}
          onConfirm={confirmDeleteTranslation}
          title="Delete Translation"
          message={`Are you sure you want to delete this ${deleteModal.translation?.language} translation? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="error"
        />
      </div>
    </ProtectedRoute>
  );
}
