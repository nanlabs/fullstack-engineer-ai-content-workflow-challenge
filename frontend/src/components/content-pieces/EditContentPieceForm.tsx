"use client";

import React, { useState } from "react";
import { ContentPiece } from "@/types";

interface EditContentPieceFormProps {
  contentPiece: ContentPiece;
  onSubmit: (data: {
    title: string;
    description?: string;
    contentType: string;
    language?: string;
  }) => void;
  onCancel: () => void;
}

export const EditContentPieceForm: React.FC<EditContentPieceFormProps> = ({
  contentPiece,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    title: contentPiece.title,
    description: contentPiece.description || "",
    contentType: contentPiece.contentType,
    language: contentPiece.language,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">
        Edit Content Piece
      </h4>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter content piece title"
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
            placeholder="Enter description (optional)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="contentType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Content Type *
            </label>
            <select
              id="contentType"
              name="contentType"
              value={formData.contentType}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="headline">Headline</option>
              <option value="description">Description</option>
              <option value="translation">Translation</option>
              <option value="tagline">Tagline</option>
              <option value="call-to-action">Call to Action</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="language"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Language
            </label>
            <select
              id="language"
              name="language"
              value={formData.language}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
            </select>
          </div>
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
            Update Content Piece
          </button>
        </div>
      </form>
    </div>
  );
};
