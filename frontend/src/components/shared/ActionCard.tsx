'use client';

import { ReactNode, useState } from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';

export interface ActionButton {
  icon: ReactNode;
  onClick: () => void;
  title: string;
  className?: string;
}

interface ActionCardProps {
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    className: string;
  };
  content: ReactNode;
  expandedContent?: ReactNode;
  actions: ActionButton[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
}

export default function ActionCard({
  title,
  subtitle,
  badge,
  content,
  expandedContent,
  actions,
  isExpanded = false,
  onToggleExpand,
  className = ''
}: ActionCardProps) {
  return (
    <div className={`bg-white shadow rounded-lg transition-all ${
      isExpanded ? 'ring-2 ring-purple-500 ring-opacity-50' : ''
    } ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {title}
              </h3>
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
              )}
            </div>
            {badge && (
              <span className={badge.className}>
                {badge.text}
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            {expandedContent && onToggleExpand && (
              <button
                onClick={onToggleExpand}
                className={`text-purple-600 hover:text-purple-700 ${
                  isExpanded ? 'bg-purple-50 p-1 rounded' : ''
                }`}
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                <EyeIcon className="h-5 w-5" />
              </button>
            )}
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={action.className || 'text-gray-600 hover:text-gray-700'}
                title={action.title}
              >
                {action.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {content}
          
          {/* Expanded Content */}
          {isExpanded && expandedContent && (
            <div className="border-t pt-4">
              {expandedContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
