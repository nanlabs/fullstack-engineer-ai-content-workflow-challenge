'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { 
  CampaignResponseDto, 
  ContentResponseDto, 
  ContentType, 
  ContentStatus, 
  CreateContentDto,
  TranslationResponseDto
} from '@/types';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import AIGenerationModal from '@/components/AIGenerationModal';
import ContentReviewModal from '@/components/ContentReviewModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import ActionCard, { ActionButton } from '@/components/shared/ActionCard';
import ConfirmModal from '@/components/shared/ConfirmModal';
import StatusSelector from '@/components/shared/StatusSelector';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { 
  PlusIcon, 
  ArrowLeftIcon, 
  SparklesIcon,
  EyeIcon,
  CheckCircleIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.id as string;
  
  const [campaign, setCampaign] = useState<CampaignResponseDto | null>(null);
  const [contents, setContents] = useState<ContentResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Modal states
  const [aiGenerationModal, setAiGenerationModal] = useState<{
    isOpen: boolean;
    content: ContentResponseDto | null;
  }>({ isOpen: false, content: null });
  
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    content: ContentResponseDto | null;
  }>({ isOpen: false, content: null });
  
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    content: ContentResponseDto | null;
  }>({ isOpen: false, content: null });
  
  const [deleteContentModal, setDeleteContentModal] = useState<{
    isOpen: boolean;
    content: ContentResponseDto | null;
    isDeleting: boolean;
  }>({ isOpen: false, content: null, isDeleting: false });
  
  const [translationModal, setTranslationModal] = useState<{
    isOpen: boolean;
    content: ContentResponseDto | null;
  }>({ isOpen: false, content: null });
  
  const [isUpdating, setIsUpdating] = useState(false);
  
  // New state for shared components
  const [changingStatus, setChangingStatus] = useState<ContentResponseDto | null>(null);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, content: ContentResponseDto | null}>({
    isOpen: false,
    content: null
  });
  const [expandedContent, setExpandedContent] = useState<string | null>(null);
  
  const [newContent, setNewContent] = useState<CreateContentDto>({
    title: '',
    type: ContentType.SOCIAL_POST,
    content: '',
    language: 'en'
  });

  const [editContent, setEditContent] = useState({
    title: '',
    content: ''
  });

  const loadCampaignData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [campaignData, contentsData] = await Promise.all([
        apiClient.getCampaign(campaignId),
        apiClient.getCampaignContent(campaignId)
      ]);
      setCampaign(campaignData);
      setContents(contentsData);
    } catch (err: any) {
      setError('Failed to load campaign data');
      console.error('Error loading campaign:', err);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  // Setup real-time updates for this campaign and its content
  useRealTimeUpdates({
    onCampaignUpdate: loadCampaignData,
    onContentUpdate: loadCampaignData,
    campaignId: campaignId,
    enabled: true,
  });

  useEffect(() => {
    loadCampaignData();
  }, [campaignId]);

  const handleCreateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.title.trim()) return;

    try {
      setIsCreating(true);
      const created = await apiClient.createCampaignContent(campaignId, newContent);
      setContents(prev => [created, ...prev]);
      setNewContent({
        title: '',
        type: ContentType.SOCIAL_POST,
        content: '',
        language: 'en'
      });
      setShowCreateModal(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create content');
    } finally {
      setIsCreating(false);
    }
  };

  const handleContentUpdated = (updatedContent: ContentResponseDto) => {
    setContents(prev => 
      prev.map(content => 
        content.id === updatedContent.id ? updatedContent : content
      )
    );
  };

  const openAIGenerationModal = (content: ContentResponseDto) => {
    setAiGenerationModal({ isOpen: true, content });
  };

  const openReviewModal = (content: ContentResponseDto) => {
    setReviewModal({ isOpen: true, content });
  };

  const openEditModal = (content: ContentResponseDto) => {
    setEditContent({
      title: content.title,
      content: content.content || ''
    });
    setEditModal({ isOpen: true, content });
  };

  const handleUpdateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContent.title.trim() || !editModal.content) return;

    try {
      setIsUpdating(true);
      const updated = await apiClient.updateContent(editModal.content.id, {
        title: editContent.title,
        content: editContent.content
      });
      setContents(prev => prev.map(c => c.id === updated.id ? updated : c));
      setEditModal({ isOpen: false, content: null });
      setEditContent({ title: '', content: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update content');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteContent = async (content: ContentResponseDto) => {
    setDeleteContentModal({ isOpen: true, content, isDeleting: false });
  };

  const confirmDeleteContent = async () => {
    if (!deleteContentModal.content) return;

    try {
      setDeleteContentModal(prev => ({ ...prev, isDeleting: true }));
      await apiClient.deleteContent(deleteContentModal.content.id);
      setContents(prev => prev.filter(c => c.id !== deleteContentModal.content!.id));
      setDeleteContentModal({ isOpen: false, content: null, isDeleting: false });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete content');
      setDeleteContentModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const cancelDeleteContent = () => {
    setDeleteContentModal({ isOpen: false, content: null, isDeleting: false });
  };

  const openTranslationModal = (content: ContentResponseDto) => {
    setTranslationModal({ isOpen: true, content });
  };

  const handleTranslationGenerated = (translation: TranslationResponseDto) => {
    // We could update the content to show it has new translations
    // For now, we'll just close the modal
    setTranslationModal({ isOpen: false, content: null });
  };

  const getStatusBadgeClass = (status: ContentStatus) => {
    const baseClass = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case ContentStatus.DRAFT:
        return `${baseClass} bg-gray-100 text-gray-800`;
      case ContentStatus.AI_GENERATED:
        return `${baseClass} bg-yellow-100 text-yellow-800`;
      case ContentStatus.APPROVED:
        return `${baseClass} bg-green-100 text-green-800`;
      case ContentStatus.REJECTED:
        return `${baseClass} bg-red-100 text-red-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  };

  const getTypeLabel = (type: ContentType) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  // New functions for shared components
  const handleChangeContentStatus = (content: ContentResponseDto) => {
    setChangingStatus(content);
  };

  const handleSaveStatus = async (newStatus: string) => {
    if (!changingStatus) return;

    try {
      const updated = await apiClient.updateContent(changingStatus.id, {
        status: newStatus as ContentStatus
      });
      setContents(prev => prev.map(c => c.id === updated.id ? updated : c));
      setChangingStatus(null);
      toast.success('Content status updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update content status');
      toast.error(err.response?.data?.message || 'Failed to update content status');
    }
  };

  const handleCancelStatusChange = () => {
    setChangingStatus(null);
  };

  const handleDeleteContentNew = (content: ContentResponseDto) => {
    setDeleteModal({ isOpen: true, content });
  };

  const confirmDeleteContentNew = async () => {
    if (!deleteModal.content) return;

    try {
      await apiClient.deleteContent(deleteModal.content.id);
      setContents(prev => prev.filter(c => c.id !== deleteModal.content!.id));
      setDeleteModal({ isOpen: false, content: null });
      toast.success('Content deleted successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete content');
      toast.error(err.response?.data?.message || 'Failed to delete content');
    }
  };

  const getContentStatusOptions = () => [
    { value: ContentStatus.DRAFT, label: 'Draft' },
    { value: ContentStatus.AI_GENERATED, label: 'AI Generated' },
    { value: ContentStatus.APPROVED, label: 'Approved' },
    { value: ContentStatus.REJECTED, label: 'Rejected' }
  ];

  const getContentActions = (content: ContentResponseDto): ActionButton[] => {
    const actions: ActionButton[] = [];

    // Single edit action for both title and content
    actions.push({
      icon: <PencilIcon className="h-4 w-4" />,
      onClick: () => openEditModal(content),
      title: 'Edit content',
      className: 'text-blue-600 hover:text-blue-700'
    });

    // Change status action
    actions.push({
      icon: <CheckCircleIcon className="h-5 w-5" />,
      onClick: () => handleChangeContentStatus(content),
      title: 'Change status',
      className: 'text-yellow-600 hover:text-yellow-700'
    });

    // AI Generation action (if no content or draft)
    if (!content.content || content.status === ContentStatus.DRAFT) {
      actions.push({
        icon: <SparklesIcon className="h-4 w-4" />,
        onClick: () => openAIGenerationModal(content),
        title: 'Generate with AI',
        className: 'text-purple-600 hover:text-purple-700'
      });
    }

    // Delete action
    actions.push({
      icon: <TrashIcon className="h-4 w-4" />,
      onClick: () => handleDeleteContentNew(content),
      title: 'Delete content',
      className: 'text-red-600 hover:text-red-700'
    });

    return actions;
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!campaign) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900">Campaign not found</h2>
              <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-500 mt-4 inline-block">
                Back to Dashboard
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
                  href="/dashboard"
                  className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
                >
                  <ArrowLeftIcon className="h-5 w-5 mr-1" />
                  Back to Campaigns
                </Link>
              </div>
              
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
                  {campaign.description && (
                    <p className="mt-1 text-sm text-gray-600">{campaign.description}</p>
                  )}
                  <div className="mt-2 flex items-center space-x-4">
                    <span className={getStatusBadgeClass(campaign.status as any)}>
                      {campaign.status}
                    </span>
                    <span className="text-sm text-gray-500">
                      {contents.length} content pieces
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  New Content
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
                <button onClick={() => setError('')} className="float-right font-bold">×</button>
              </div>
            )}

            {/* Content Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {contents.map((content) => {
                const isExpanded = expandedContent === content.id;
                
                return (
                  <ActionCard
                    key={content.id}
                    title={content.title}
                    subtitle={`${getTypeLabel(content.type)} • ${content.language.toUpperCase()}`}
                    badge={{
                      text: content.status.replace('_', ' '),
                      className: getStatusBadgeClass(content.status)
                    }}
                    actions={getContentActions(content)}
                    isExpanded={isExpanded}
                    onToggleExpand={() => setExpandedContent(isExpanded ? null : content.id)}
                    content={
                      <div className="space-y-4">
                        {/* Title */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                          <p className="text-sm text-gray-900">{content.title}</p>
                        </div>

                        {/* Content */}
                        {content.content && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className={`text-sm text-gray-900 whitespace-pre-wrap ${
                                isExpanded ? '' : 'line-clamp-3'
                              }`}>
                                {content.content}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Status Selector */}
                        {changingStatus?.id === content.id && (
                          <StatusSelector
                            currentStatus={content.status}
                            options={getContentStatusOptions()}
                            onSave={handleSaveStatus}
                            onCancel={handleCancelStatusChange}
                          />
                        )}

                        {/* Action Buttons for specific statuses */}
                        <div className="space-y-2">
                          {content.status === ContentStatus.DRAFT && (
                            <button 
                              onClick={() => openAIGenerationModal(content)}
                              className="w-full flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                            >
                              <SparklesIcon className="h-4 w-4 mr-2" />
                              Generate with AI
                            </button>
                          )}
                          
                          {content.status === ContentStatus.AI_GENERATED && (
                            <button 
                              onClick={() => openReviewModal(content)}
                              className="w-full flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                              <EyeIcon className="h-4 w-4 mr-2" />
                              Review Content
                            </button>
                          )}

                          {content.content && (
                            <Link
                              href={`/campaigns/${campaign?.id}/content/${content.id}/translations`}
                              className="w-full flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100"
                            >
                              <GlobeAltIcon className="h-4 w-4 mr-2" />
                              View Translations ({content.translations?.length || 0})
                            </Link>
                          )}
                        </div>
                      </div>
                    }
                    expandedContent={
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Created:</span>
                          <p className="text-gray-600">
                            {new Date(content.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">AI Generated:</span>
                          <p className="text-gray-600">
                            {content.aiGenerated ? 'Yes' : 'No'}
                          </p>
                        </div>
                        {content.tokensUsed && (
                          <div>
                            <span className="font-medium text-gray-700">Tokens Used:</span>
                            <p className="text-gray-600">{content.tokensUsed}</p>
                          </div>
                        )}
                        {content.aiModelUsed && (
                          <div>
                            <span className="font-medium text-gray-700">AI Model:</span>
                            <p className="text-gray-600">{content.aiModelUsed}</p>
                          </div>
                        )}
                      </div>
                    }
                  />
                );
              })}

              {contents.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No content yet</h3>
                  <p className="text-gray-600 mb-6">Create your first content piece to get started.</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Create Content Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Content</h3>
                <form onSubmit={handleCreateContent}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter content title"
                      value={newContent.title}
                      onChange={(e) => setNewContent(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type *
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={newContent.type}
                      onChange={(e) => setNewContent(prev => ({ ...prev, type: e.target.value as ContentType }))}
                    >
                      {Object.values(ContentType).map((type) => (
                        <option key={type} value={type}>
                          {getTypeLabel(type)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={newContent.language}
                      onChange={(e) => setNewContent(prev => ({ ...prev, language: e.target.value }))}
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="it">Italian</option>
                      <option value="pt">Portuguese</option>
                    </select>
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content (Optional)
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter initial content or leave empty to generate with AI"
                      value={newContent.content}
                      onChange={(e) => setNewContent(prev => ({ ...prev, content: e.target.value }))}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
                    >
                      {isCreating ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* AI Generation Modal */}
        {aiGenerationModal.isOpen && aiGenerationModal.content && (
          <AIGenerationModal
            content={aiGenerationModal.content}
            isOpen={aiGenerationModal.isOpen}
            onClose={() => setAiGenerationModal({ isOpen: false, content: null })}
            onGenerated={handleContentUpdated}
          />
        )}

        {/* Content Review Modal */}
        {reviewModal.isOpen && reviewModal.content && (
          <ContentReviewModal
            content={reviewModal.content}
            isOpen={reviewModal.isOpen}
            onClose={() => setReviewModal({ isOpen: false, content: null })}
            onUpdated={handleContentUpdated}
          />
        )}

        {/* Content Edit Modal */}
        {editModal.isOpen && editModal.content && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Edit Content</h2>
                <button
                  onClick={() => {
                    setEditModal({ isOpen: false, content: null });
                    setEditContent({ title: '', content: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleUpdateContent}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter content title"
                    value={editContent.title}
                    onChange={(e) => setEditContent(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter your content here"
                    value={editContent.content}
                    onChange={(e) => setEditContent(prev => ({ ...prev, content: e.target.value }))}
                  />
                </div>
                
                <div className="text-sm text-gray-600 mb-4">
                  <strong>Type:</strong> {getTypeLabel(editModal.content.type)} • 
                  <strong>Language:</strong> {editModal.content.language.toUpperCase()}
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditModal({ isOpen: false, content: null });
                      setEditContent({ title: '', content: '' });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
                  >
                    {isUpdating ? 'Updating...' : 'Update Content'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Content Confirmation Modal */}
        <ConfirmationModal
          isOpen={deleteContentModal.isOpen}
          title="Delete Content"
          message={`Are you sure you want to delete "${deleteContentModal.content?.title}"? This action cannot be undone.`}
          confirmLabel="Delete Content"
          cancelLabel="Cancel"
          onConfirm={confirmDeleteContent}
          onCancel={cancelDeleteContent}
          isLoading={deleteContentModal.isDeleting}
          type="danger"
        />

        {/* New Delete Content Modal using shared component */}
        <ConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, content: null })}
          onConfirm={confirmDeleteContentNew}
          title="Delete Content"
          message={`Are you sure you want to delete "${deleteModal.content?.title}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="error"
        />
      </div>
    </ProtectedRoute>
  );
}
