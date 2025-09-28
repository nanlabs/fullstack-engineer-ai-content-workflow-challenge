"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { campaignApi } from "@/lib/api/client";
import type { Campaign } from "@/types";
import { ContentPiecesList } from "@/components/content-pieces/ContentPiecesList";
import { CampaignForm } from "./CampaignForm";
import { DocumentManagement } from "@/components/documents/DocumentManagement";
import { useToast } from "@/components/ui/ToastProvider";
import { OPERATION_MESSAGES } from "@/lib/api/errorHandler";
import { Button } from "@/components/ui/button";

export const CampaignDashboard: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [activeTab, setActiveTab] = useState<"content" | "documents">(
    "content"
  );
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
        <div className="flex flex-col items-start mb-6 justify-start w-full min-w-6xl max-w-6xl">
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
        <div className="flex flex-col items-start mb-6 justify-start w-full min-w-6xl max-w-6xl">
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
      <div className="flex flex-col items-start justify-between mb-6 w-full min-w-6xl max-w-6xl">
        <div className="flex justify-between w-full items-start gap-2 border-b border-gray-200 pb-2">
          <button
            onClick={() => {
              setSelectedCampaign(null);
              setActiveTab("content"); // Reset tab when going back
            }}
            className="text-blue-600 hover:text-blue-800 mr-4"
          >
            ← Back to Campaigns
          </button>
          <div className="flex space-x-2">
            <Button
              onClick={() => setEditingCampaign(selectedCampaign)}
              variant="outline"
              size="sm"
            >
              Edit Campaign
            </Button>
            <Button
              onClick={() => handleDeleteCampaign(selectedCampaign.id)}
              variant="destructive"
              size="sm"
            >
              Delete Campaign
            </Button>
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

        {/* Tab Navigation */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("content")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "content"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Content Pieces
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "documents"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Documents
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6 w-full min-w-6xl max-w-6xl">
          {activeTab === "content" ? (
            <ContentPiecesList
              campaign={selectedCampaign}
              onRefresh={loadCampaigns}
            />
          ) : (
            <DocumentManagement campaignId={selectedCampaign.id} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Campaigns</h2>
        <Button onClick={() => setShowCreateForm(true)} variant="default">
          Create New Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No campaigns yet</div>
          <div className="text-gray-400 text-sm mt-2">
            <Button
              variant="outline"
              className="p-2"
              onClick={() => setShowCreateForm(true)}
            >
              Create your first campaign to get started
            </Button>
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
                  <Button
                    onClick={() => setSelectedCampaign(campaign)}
                    variant="default"
                    size="sm"
                  >
                    View Details
                  </Button>
                  <Button
                    onClick={() => setEditingCampaign(campaign)}
                    variant="outline"
                    size="sm"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDeleteCampaign(campaign.id)}
                    variant="destructive"
                    size="sm"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
