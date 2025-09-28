"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateContentPieceFormProps {
  onSubmit: (data: {
    title: string;
    description?: string;
    contentType: string;
    language?: string;
  }) => void;
  onCancel: () => void;
  defaultLanguage?: string;
}

export const CreateContentPieceForm: React.FC<CreateContentPieceFormProps> = ({
  onSubmit,
  onCancel,
  defaultLanguage = "en",
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    contentType: "headline",
    language: defaultLanguage,
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

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm w-full min-w-6xl max-w-6xl">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">
        Create Content Piece
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
            <Select
              value={formData.contentType}
              onValueChange={(value) =>
                handleSelectChange("contentType", value)
              }
            >
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="headline">Headline</SelectItem>
                <SelectItem value="description">Description</SelectItem>
                <SelectItem value="translation">Translation</SelectItem>
                <SelectItem value="tagline">Tagline</SelectItem>
                <SelectItem value="call-to-action">Call to Action</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label
              htmlFor="language"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Language
            </label>
            <Select
              value={formData.language}
              onValueChange={(value) => handleSelectChange("language", value)}
            >
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="it">Italian</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="default">
            Create Content Piece
          </Button>
        </div>
      </form>
    </div>
  );
};
