"use client";

import React, { useState } from "react";
import { Campaign } from "@/types";

interface CampaignFormProps {
  campaign?: Campaign;
  onSubmit: (data: { name: string; description?: string }) => void;
  onCancel: () => void;
}

export const CampaignForm: React.FC<CampaignFormProps> = ({
  campaign,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: campaign?.name || "",
    description: campaign?.description || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">
        {campaign ? "Edit Campaign" : "Create Campaign"}
      </h4>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Campaign Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter campaign name"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter campaign description (optional)"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {campaign ? "Update Campaign" : "Create Campaign"}
          </button>
        </div>
      </form>
    </div>
  );
};
