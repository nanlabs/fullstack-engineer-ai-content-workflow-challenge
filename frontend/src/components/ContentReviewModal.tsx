'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { ContentResponseDto, ContentStatus, UpdateContentDto, RegenerateAIContentDto } from '@/types';
import { CheckIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ContentReviewModalProps {
  content: ContentResponseDto;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedContent: ContentResponseDto) => void;
}

export default function ContentReviewModal({ 
  content, 
  isOpen, 
  onClose, 
  onUpdated 
}: ContentReviewModalProps) {
  const [editedContent, setEditedContent] = useState('');
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState('');

  // Update state when content changes
  useEffect(() => {
    if (content && isOpen) {
      setEditedContent(content.content || '');
      setRejectionFeedback('');
      setShowRejectForm(false);
      setError('');
    }
  }, [content, isOpen]);

  const handleApprove = async () => {
    try {
      setIsUpdating(true);
      setError('');
      
      const updateData: UpdateContentDto = {
        content: editedContent,
        status: ContentStatus.APPROVED
      };

      const updatedContent = await apiClient.updateContent(content.id, updateData);
      onUpdated(updatedContent);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve content');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionFeedback.trim()) return;

    try {
      setIsUpdating(true);
      setError('');
      
      const updateData: UpdateContentDto = {
        status: ContentStatus.REJECTED
      };

      const updatedContent = await apiClient.updateContent(content.id, updateData);
      onUpdated(updatedContent);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject content');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!rejectionFeedback.trim()) return;

    try {
      setIsRegenerating(true);
      setError('');
      
      const regenerateData: RegenerateAIContentDto = {
        feedback: rejectionFeedback.trim()
      };

      const updatedContent = await apiClient.regenerateAIContent(content.id, regenerateData);
      onUpdated(updatedContent);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to regenerate content');
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!isOpen || !content) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-[700px] shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            Review AI Generated Content
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">{content.title}</h4>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
              {content.status.replace('_', ' ')}
            </span>
          </div>
          <div className="text-sm text-gray-600 mb-2">
            Type: {content.type.replace(/_/g, ' ')} • Language: {content.language.toUpperCase()}
          </div>
          {content.aiModelUsed && (
            <div className="text-sm text-gray-600">
              <strong>Model:</strong> {content.aiModelUsed}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Generated Content
          </label>
          <textarea
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            placeholder="No content generated"
          />
          <p className="mt-2 text-sm text-gray-500">
            You can edit the content before approving it.
          </p>
        </div>

        {!showRejectForm ? (
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isUpdating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
            >
              Cancel
            </button>
            
            <button
              onClick={() => setShowRejectForm(true)}
              disabled={isUpdating}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 flex items-center"
            >
              <XMarkIcon className="h-4 w-4 mr-2" />
              Reject
            </button>
            
            <button
              onClick={handleApprove}
              disabled={isUpdating || !editedContent.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 flex items-center"
            >
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Approving...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Approve & Save
                </>
              )}
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feedback for AI (Required for rejection/regeneration)
              </label>
              <textarea
                rows={3}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Explain what needs to be improved or changed..."
                value={rejectionFeedback}
                onChange={(e) => setRejectionFeedback(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRejectForm(false)}
                disabled={isUpdating || isRegenerating}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
              >
                Cancel
              </button>
              
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating || isUpdating || !rejectionFeedback.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md disabled:opacity-50 flex items-center"
              >
                {isRegenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Regenerating...
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    Regenerate with Feedback
                  </>
                )}
              </button>
              
              <button
                onClick={handleReject}
                disabled={isUpdating || isRegenerating || !rejectionFeedback.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 flex items-center"
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XMarkIcon className="h-4 w-4 mr-2" />
                    Reject Content
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
