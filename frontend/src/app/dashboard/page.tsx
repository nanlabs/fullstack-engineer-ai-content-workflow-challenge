'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { CampaignResponseDto, CampaignStatus, CreateCampaignDto } from '@/types';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
import Link from 'next/link';
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<CampaignResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignResponseDto | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    campaign: CampaignResponseDto | null;
    isDeleting: boolean;
  }>({ isOpen: false, campaign: null, isDeleting: false });
  const [newCampaign, setNewCampaign] = useState<CreateCampaignDto>({
    name: '',
    description: ''
  });
  const [editCampaign, setEditCampaign] = useState({
    name: '',
    description: '',
    status: CampaignStatus.DRAFT
  });

  const loadCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getCampaigns();
      setCampaigns(data);
    } catch (err: any) {
      setError('Failed to load campaigns');
      console.error('Error loading campaigns:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Setup real-time updates for campaigns
  useRealTimeUpdates({
    onCampaignUpdate: loadCampaigns,
    enabled: true,
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.name.trim()) return;

    try {
      setIsCreating(true);
      const created = await apiClient.createCampaign(newCampaign);
      setCampaigns(prev => [created, ...prev]);
      setNewCampaign({ name: '', description: '' });
      setShowCreateModal(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create campaign');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCampaign = async (campaign: CampaignResponseDto) => {
    setDeleteModal({ isOpen: true, campaign, isDeleting: false });
  };

  const confirmDeleteCampaign = async () => {
    if (!deleteModal.campaign) return;

    try {
      setDeleteModal(prev => ({ ...prev, isDeleting: true }));
      await apiClient.deleteCampaign(deleteModal.campaign.id);
      setCampaigns(prev => prev.filter(c => c.id !== deleteModal.campaign!.id));
      setDeleteModal({ isOpen: false, campaign: null, isDeleting: false });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete campaign');
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const cancelDeleteCampaign = () => {
    setDeleteModal({ isOpen: false, campaign: null, isDeleting: false });
  };

  const handleEditCampaign = (campaign: CampaignResponseDto) => {
    setEditingCampaign(campaign);
    setEditCampaign({
      name: campaign.name,
      description: campaign.description || '',
      status: campaign.status
    });
    setShowEditModal(true);
  };

  const handleUpdateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCampaign.name.trim() || !editingCampaign) return;

    try {
      setIsUpdating(true);
      const updated = await apiClient.updateCampaign(editingCampaign.id, {
        name: editCampaign.name,
        description: editCampaign.description,
        status: editCampaign.status
      });
      setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
      setEditCampaign({ name: '', description: '', status: CampaignStatus.DRAFT });
      setShowEditModal(false);
      setEditingCampaign(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update campaign');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadgeClass = (status: CampaignStatus) => {
    const baseClass = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case CampaignStatus.DRAFT:
        return `${baseClass} bg-gray-100 text-gray-800`;
      case CampaignStatus.ACTIVE:
        return `${baseClass} bg-green-100 text-green-800`;
      case CampaignStatus.COMPLETED:
        return `${baseClass} bg-blue-100 text-blue-800`;
      case CampaignStatus.ARCHIVED:
        return `${baseClass} bg-red-100 text-red-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage your AI content creation campaigns
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                New Campaign
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
                <button
                  onClick={() => setError('')}
                  className="float-right font-bold"
                >
                  ×
                </button>
              </div>
            )}

            {/* Loading State */}
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              /* Campaigns Grid */
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <span className={getStatusBadgeClass(campaign.status)}>
                        {campaign.status}
                      </span>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleEditCampaign(campaign)}
                          className="text-gray-600 hover:text-indigo-600 transition-colors"
                          title="Edit Campaign"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(campaign)}
                          className="text-gray-600 hover:text-red-600 transition-colors"
                          title="Delete Campaign"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {campaign.name}
                    </h3>
                    
                    <div className="flex-1">
                      {campaign.description && (
                        <p className="text-sm text-gray-600 mb-4">
                          {campaign.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
                      <span>
                        {campaign.contentPieces?.length || 0} content pieces
                      </span>
                      <span>
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Action Buttons - Always at bottom */}
                    <div className="flex space-x-2 mt-auto">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-center px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
                      >
                        <EyeIcon className="h-4 w-4 mr-2" />
                        View Campaign
                      </Link>
                    </div>
                  </div>
                </div>
              ))}                {campaigns.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No campaigns yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Create your first campaign to start generating AI content.
                    </p>

                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Create Campaign Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Create New Campaign
                </h3>
                <form onSubmit={handleCreateCampaign}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter campaign name"
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter campaign description (optional)"
                      value={newCampaign.description}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
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

        {/* Edit Campaign Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Edit Campaign</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCampaign(null);
                    setEditCampaign({ name: '', description: '', status: CampaignStatus.DRAFT });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleUpdateCampaign}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter campaign name"
                    value={editCampaign.name}
                    onChange={(e) => setEditCampaign(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter campaign description (optional)"
                    value={editCampaign.description}
                    onChange={(e) => setEditCampaign(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={editCampaign.status}
                    onChange={(e) => setEditCampaign(prev => ({ ...prev, status: e.target.value as CampaignStatus }))}
                  >
                    <option value={CampaignStatus.DRAFT}>Draft</option>
                    <option value={CampaignStatus.ACTIVE}>Active</option>
                    <option value={CampaignStatus.COMPLETED}>Completed</option>
                    <option value={CampaignStatus.ARCHIVED}>Archived</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingCampaign(null);
                      setEditCampaign({ name: '', description: '', status: CampaignStatus.DRAFT });
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
                    {isUpdating ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={deleteModal.isOpen}
          title="Delete Campaign"
          message={`Are you sure you want to delete "${deleteModal.campaign?.name}"? This action cannot be undone and will remove all associated content.`}
          confirmLabel="Delete Campaign"
          cancelLabel="Cancel"
          onConfirm={confirmDeleteCampaign}
          onCancel={cancelDeleteCampaign}
          isLoading={deleteModal.isDeleting}
          type="danger"
        />
      </div>
    </ProtectedRoute>
  );
}
