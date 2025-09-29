"use client";

import type React from "react";
import { DollarSign, TrendingUp, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CostDisplayProps {
  cost: number;
  type?: 'draft' | 'content-piece' | 'campaign' | 'global';
  showIcon?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CostDisplay: React.FC<CostDisplayProps> = ({
  cost,
  type = 'draft',
  showIcon = true,
  showLabel = true,
  size = 'md',
  className = "",
}) => {
  const formatCost = (cost: number): string => {
    if (cost === 0) return "$0.00";
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    if (cost < 1) return `$${cost.toFixed(3)}`;
    return `$${cost.toFixed(2)}`;
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'draft':
        return 'Draft Cost';
      case 'content-piece':
        return 'Content Piece Cost';
      case 'campaign':
        return 'Campaign Cost';
      case 'global':
        return 'Total Cost';
      default:
        return 'Cost';
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'draft':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'content-piece':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'campaign':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'global':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSizeClasses = (size: string): string => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-lg';
      default:
        return 'text-sm';
    }
  };

  const getIconSize = (size: string): string => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3';
      case 'lg':
        return 'w-5 h-5';
      default:
        return 'w-4 h-4';
    }
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {showIcon && (
        <DollarSign className={`${getIconSize(size)} text-gray-600`} />
      )}
      
      <span className={`${getSizeClasses(size)} font-medium text-gray-900`}>
        {formatCost(cost)}
      </span>
      
      {showLabel && (
        <Badge className={`${getTypeColor(type)} text-xs`}>
          {getTypeLabel(type)}
        </Badge>
      )}
    </div>
  );
};

interface CostSummaryProps {
  draftCount: number;
  totalCost: number;
  averageCost: number;
  costByModel?: Record<string, number>;
  className?: string;
}

export const CostSummary: React.FC<CostSummaryProps> = ({
  draftCount,
  totalCost,
  averageCost,
  costByModel = {},
  className = "",
}) => {
  const formatCost = (cost: number): string => {
    if (cost === 0) return "$0.00";
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    if (cost < 1) return `$${cost.toFixed(3)}`;
    return `$${cost.toFixed(2)}`;
  };

  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <div className="flex items-center space-x-2 mb-3">
        <Calculator className="w-4 h-4 text-gray-600" />
        <h4 className="text-sm font-semibold text-gray-900">Cost Summary</h4>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="text-xs text-gray-500">Total Drafts</div>
          <div className="text-lg font-semibold text-gray-900">{draftCount}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Total Cost</div>
          <div className="text-lg font-semibold text-gray-900">{formatCost(totalCost)}</div>
        </div>
      </div>
      
      <div className="mb-3">
        <div className="text-xs text-gray-500">Average Cost per Draft</div>
        <div className="text-sm font-medium text-gray-900">{formatCost(averageCost)}</div>
      </div>
      
      {Object.keys(costByModel).length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-2">Cost by Model</div>
          <div className="space-y-1">
            {Object.entries(costByModel).map(([model, cost]) => (
              <div key={model} className="flex justify-between items-center text-xs">
                <span className="text-gray-600">{model}</span>
                <span className="font-medium text-gray-900">{formatCost(cost)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface CostTrendProps {
  currentCost: number;
  previousCost?: number;
  className?: string;
}

export const CostTrend: React.FC<CostTrendProps> = ({
  currentCost,
  previousCost,
  className = "",
}) => {
  if (!previousCost) return null;

  const change = currentCost - previousCost;
  const changePercent = previousCost > 0 ? (change / previousCost) * 100 : 0;
  const isIncrease = change > 0;
  const isDecrease = change < 0;

  const formatCost = (cost: number): string => {
    if (cost === 0) return "$0.00";
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    if (cost < 1) return `$${cost.toFixed(3)}`;
    return `$${cost.toFixed(2)}`;
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <TrendingUp 
        className={`w-4 h-4 ${
          isIncrease ? 'text-red-500' : 
          isDecrease ? 'text-green-500' : 
          'text-gray-400'
        }`} 
      />
      <span className={`text-xs font-medium ${
        isIncrease ? 'text-red-600' : 
        isDecrease ? 'text-green-600' : 
        'text-gray-600'
      }`}>
        {isIncrease ? '+' : ''}{formatCost(change)} ({isIncrease ? '+' : ''}{changePercent.toFixed(1)}%)
      </span>
    </div>
  );
};
