'use client';

import { useState } from 'react';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface StatusOption {
  value: string;
  label: string;
  color?: string;
}

interface StatusSelectorProps {
  currentStatus: string;
  options: StatusOption[];
  onSave: (status: string) => void;
  onCancel: () => void;
  className?: string;
  saveText?: string;
  cancelText?: string;
}

export default function StatusSelector({
  currentStatus,
  options,
  onSave,
  onCancel,
  className = '',
  saveText = 'Update Status',
  cancelText = 'Cancel'
}: StatusSelectorProps) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);

  const handleSave = () => {
    onSave(selectedStatus);
  };

  const handleCancel = () => {
    setSelectedStatus(currentStatus);
    onCancel();
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Change Status
        </label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end space-x-2">
        <button
          onClick={handleCancel}
          className="inline-flex items-center px-3 py-1 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md"
        >
          <XMarkIcon className="h-4 w-4 mr-1" />
          {cancelText}
        </button>
        <button
          onClick={handleSave}
          className="inline-flex items-center px-3 py-1 text-sm text-white bg-yellow-600 hover:bg-yellow-700 rounded-md"
        >
          <CheckCircleIcon className="h-4 w-4 mr-1" />
          {saveText}
        </button>
      </div>
    </div>
  );
}
