'use client';

import { useState } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface InlineEditorProps {
  value: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  saveText?: string;
  cancelText?: string;
}

export default function InlineEditor({
  value,
  onSave,
  onCancel,
  placeholder,
  rows = 4,
  className = '',
  saveText = 'Save',
  cancelText = 'Cancel'
}: InlineEditorProps) {
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onSave(editValue);
  };

  const handleCancel = () => {
    setEditValue(value);
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <textarea
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-vertical"
        rows={rows}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus
      />
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
          className="inline-flex items-center px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
        >
          <CheckIcon className="h-4 w-4 mr-1" />
          {saveText}
        </button>
      </div>
    </div>
  );
}
