"use client";

import React, { useState, useEffect, useCallback } from "react";
import { campaignApi } from "@/lib/api/client";
import { Campaign } from "@/types";
import { ContentPiecesList } from "@/components/content-pieces/ContentPiecesList";
import { CampaignForm } from "./CampaignForm";
import { useToast } from "@/components/ui/ToastProvider";
import { OPERATION_MESSAGES } from "@/lib/api/errorHandler";

export const CampaignDashboard: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const response = await campaignApi.getAll();

      if (response.success && response.data) {
        setCampaigns(response.data as Campaign[]);
        setError(null);
      } else {
        setError(response.error?.message || "Failed to load campaigns");
        addToast({
          type: "error",
          title: "Error",
          message:
            response.error?.message || OPERATION_MESSAGES.LOAD_CAMPAIGNS.error,
        });
      }
    } catch (err) {
      const errorMessage = "Failed to load campaigns";
      setError(errorMessage);
      addToast({
        type: "error",
        title: "Error",
        message: errorMessage,
      });
      console.error("Error loading campaigns:", err);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const handleCreateCampaign = async (data: {
    name: string;
    description?: string;
  }) => {
    try {
      const response = await campaignApi.create(data);

      if (response.success) {
        setShowCreateForm(false);
        loadCampaigns();
        addToast({
          type: "success",
          title: "Success",
          message: OPERATION_MESSAGES.CREATE_CAMPAIGN.success,
        });
      } else {
        addToast({
          type: "error",
          title: "Error",
          message:
            response.error?.message || OPERATION_MESSAGES.CREATE_CAMPAIGN.error,
        });
      }
    } catch (err) {
      addToast({
        type: "error",
        title: "Error",
        message: OPERATION_MESSAGES.CREATE_CAMPAIGN.error,
      });
      console.error("Error creating campaign:", err);
    }
  };

  const handleUpdateCampaign = async (data: {
    name: string;
    description?: string;
  }) => {
    if (!editingCampaign) return;

    try {
      const response = await campaignApi.update(editingCampaign.id, data);

      if (response.success) {
        setEditingCampaign(null);
        loadCampaigns();

        // Update selected campaign if it's the one being edited
        if (selectedCampaign && selectedCampaign.id === editingCampaign.id) {
          setSelectedCampaign({ ...selectedCampaign, ...data });
        }

        addToast({
          type: "success",
          title: "Success",
          message: OPERATION_MESSAGES.UPDATE_CAMPAIGN.success,
        });
      } else {
        addToast({
          type: "error",
          title: "Error",
          message:
            response.error?.message || OPERATION_MESSAGES.UPDATE_CAMPAIGN.error,
        });
      }
    } catch (err) {
      addToast({
        type: "error",
        title: "Error",
        message: OPERATION_MESSAGES.UPDATE_CAMPAIGN.error,
      });
      console.error("Error updating campaign:", err);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this campaign? This will also delete all its content pieces."
      )
    ) {
      return;
    }

    try {
      const response = await campaignApi.delete(campaignId);

      if (response.success) {
        loadCampaigns();

        // Clear selected campaign if it was deleted
        if (selectedCampaign && selectedCampaign.id === campaignId) {
          setSelectedCampaign(null);
        }

        addToast({
          type: "success",
          title: "Success",
          message: OPERATION_MESSAGES.DELETE_CAMPAIGN.success,
        });
      } else {
        addToast({
          type: "error",
          title: "Error",
          message:
            response.error?.message || OPERATION_MESSAGES.DELETE_CAMPAIGN.error,
        });
      }
    } catch (err) {
      addToast({
        type: "error",
        title: "Error",
        message: OPERATION_MESSAGES.DELETE_CAMPAIGN.error,
      });
      console.error("Error deleting campaign:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading campaigns...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error}</div>
        <button
          onClick={loadCampaigns}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <div>
        <div className="flex flex-col items-start mb-6 justify-start">
          <button
            onClick={() => setShowCreateForm(false)}
            className="text-blue-600 hover:text-blue-800 mr-4"
          >
            ← Back to Campaigns
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            Create New Campaign
          </h2>
        </div>

        <CampaignForm
          onSubmit={handleCreateCampaign}
          onCancel={() => setShowCreateForm(false)}
        />
      </div>
    );
  }

  if (editingCampaign) {
    return (
      <div>
        <div className="flex flex-col items-start mb-6 justify-start">
          <button
            onClick={() => setEditingCampaign(null)}
            className="text-blue-600 hover:text-blue-800 mr-4"
          >
            ← Back to Campaigns
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Edit Campaign</h2>
        </div>

        <CampaignForm
          campaign={editingCampaign}
          onSubmit={handleUpdateCampaign}
          onCancel={() => setEditingCampaign(null)}
        />
      </div>
    );
  }

  if (selectedCampaign) {
    return (
      <div>
        <div className="flex flex-col items-start justify-between mb-6">
          <div className="flex justify-between w-full items-start gap-2 border-b border-gray-200 pb-2">
            <button
              onClick={() => setSelectedCampaign(null)}
              className="text-blue-600 hover:text-blue-800 mr-4"
            >
              ← Back to Campaigns
            </button>
            <div className="flex space-x-2">
              <button
                onClick={() => setEditingCampaign(selectedCampaign)}
                className="text-blue-600 hover:text-blue-800 text-sm ml-2 mr-2 border border-blue-300 rounded-md px-2 py-1 hover:bg-blue-100 transition-colors hover:border-blue-400 cursor-pointer"
              >
                Edit Campaign
              </button>
              <button
                onClick={() => handleDeleteCampaign(selectedCampaign.id)}
                className="text-red-600 hover:text-red-800 text-sm ml-2 mr-2 border border-red-300 rounded-md px-2 py-1 hover:bg-red-100 transition-colors hover:border-red-400 cursor-pointer"
              >
                Delete Campaign
              </button>
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedCampaign.name}
            </h2>
            {selectedCampaign.description && (
              <p className="text-gray-600">{selectedCampaign.description}</p>
            )}
          </div>
        </div>

        <ContentPiecesList
          campaign={selectedCampaign}
          onRefresh={loadCampaigns}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Campaigns</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Create Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No campaigns yet</div>
          <div className="text-gray-400 text-sm mt-2">
            Create your first campaign to get started
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white rounded-lg shadow-md p-6 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {campaign.name}
                </h3>
                {campaign.description && (
                  <p className="text-gray-600 mb-4">{campaign.description}</p>
                )}
                <div className="text-sm text-gray-500 mb-4">
                  Created: {new Date(campaign.createdAt).toLocaleDateString()}
                  {campaign.contentPieces &&
                    campaign.contentPieces.length > 0 && (
                      <span className="ml-2 text-blue-600">
                        • {campaign.contentPieces.length} content piece
                        {campaign.contentPieces.length !== 1 ? "s" : ""}
                      </span>
                    )}
                </div>
              </div>
              <div>
                <hr className="my-2 border-gray-200 " />
                <div className="flex space-x-2 justify-end pt-2">
                  <button
                    onClick={() => setSelectedCampaign(campaign)}
                    className="text-blue-600 hover:text-blue-800 text-sm ml-2 mr-2 border border-blue-300 rounded-md px-2 py-1 hover:bg-blue-100 transition-colors hover:border-blue-400 cursor-pointer"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => setEditingCampaign(campaign)}
                    className="text-gray-600 hover:text-gray-800 text-sm ml-2 mr-2 border border-gray-300 rounded-md px-2 py-1 hover:bg-gray-100 transition-colors hover:border-gray-400 cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCampaign(campaign.id)}
                    className="text-red-600 hover:text-red-800 text-sm ml-2 mr-2 border border-red-300 rounded-md px-2 py-1 hover:bg-red-100 transition-colors hover:border-red-400 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
