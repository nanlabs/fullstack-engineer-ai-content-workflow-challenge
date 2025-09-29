"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info, Zap, DollarSign, Brain } from "lucide-react";
import { aiGenerationApi } from "@/lib/api/client";
import { Badge } from "../ui/badge";

export interface AIModel {
  name: string;
  provider: string;
  inputCostPer1K: number;
  outputCostPer1K: number;
  displayName: string;
  description?: string;
}

interface ModelSelectorProps {
  value?: string;
  onValueChange: (modelName: string) => void;
  disabled?: boolean;
  showCostInfo?: boolean;
  className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onValueChange,
  disabled = false,
  showCostInfo = true,
  className = "",
}) => {
  // Initialize with default models to prevent errors
  const [models, setModels] = useState<AIModel[]>(() => [
    {
      name: 'gpt-3.5-turbo',
      provider: 'openai',
      inputCostPer1K: 0.0015,
      outputCostPer1K: 0.002,
      displayName: 'GPT-3.5 Turbo',
      description: 'Fast and cost-effective for most tasks'
    }
  ]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);

  const loadModels = useCallback(async () => {
    try {
      setLoading(true);
      const response = await aiGenerationApi.getAvailableModels();
      
      if (response.success && response.data && Array.isArray(response.data)) {
        setModels(response.data as AIModel[]);
        
        // Set default model if none selected
        if (!value && response.data.length > 0) {
          const defaultModel = response.data[0];
          onValueChange(defaultModel.name);
        }
      } else {
        // Fallback to default models if API fails
        console.warn('API failed to load models, using fallback models');
        setModels(getDefaultModels());
        
        // Set default model if none selected
        if (!value) {
          onValueChange('gpt-3.5-turbo');
        }
      }
    } catch (error) {
      console.error('Error loading AI models:', error);
      // Fallback to default models
      setModels(getDefaultModels());
      
      // Set default model if none selected
      if (!value) {
        onValueChange('gpt-3.5-turbo');
      }
    } finally {
      setLoading(false);
    }
  }, [value, onValueChange]);

  const getDefaultModels = (): AIModel[] => {
    return [
      {
        name: 'gpt-3.5-turbo',
        provider: 'openai',
        inputCostPer1K: 0.0015,
        outputCostPer1K: 0.002,
        displayName: 'GPT-3.5 Turbo',
        description: 'Fast and cost-effective for most tasks'
      },
      {
        name: 'gpt-4',
        provider: 'openai',
        inputCostPer1K: 0.03,
        outputCostPer1K: 0.06,
        displayName: 'GPT-4',
        description: 'Most capable model for complex tasks'
      },
      {
        name: 'gpt-4-turbo',
        provider: 'openai',
        inputCostPer1K: 0.01,
        outputCostPer1K: 0.03,
        displayName: 'GPT-4 Turbo',
        description: 'Balanced performance and cost'
      },
      {
        name: 'claude-3-haiku',
        provider: 'anthropic',
        inputCostPer1K: 0.00025,
        outputCostPer1K: 0.00125,
        displayName: 'Claude 3 Haiku',
        description: 'Fast and efficient for simple tasks'
      },
      {
        name: 'claude-3-sonnet',
        provider: 'anthropic',
        inputCostPer1K: 0.003,
        outputCostPer1K: 0.015,
        displayName: 'Claude 3 Sonnet',
        description: 'Balanced performance for most tasks'
      },
      {
        name: 'claude-3-opus',
        provider: 'anthropic',
        inputCostPer1K: 0.015,
        outputCostPer1K: 0.075,
        displayName: 'Claude 3 Opus',
        description: 'Most capable for complex reasoning'
      }
    ];
  };

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    if (value && models.length > 0) {
      const model = models.find(m => m.name === value);
      setSelectedModel(model || null);
    }
  }, [value, models]);

  const handleModelChange = (modelName: string) => {
    const model = models.find(m => m.name === modelName);
    setSelectedModel(model || null);
    onValueChange(modelName);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'openai':
        return <Brain className="w-4 h-4" />;
      case 'anthropic':
        return <Zap className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'openai':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'anthropic':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="block text-sm font-medium text-gray-700">
          AI Model
        </label>
        <div className="w-full h-10 bg-gray-200 rounded-md animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        AI Model
      </label>
      
      <Select 
        value={value} 
        onValueChange={handleModelChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full cursor-pointer">
          <SelectValue placeholder="Select AI model">
            {selectedModel && (
              <div className="flex items-center space-x-2">
                {getProviderIcon(selectedModel.provider)}
                <span>{selectedModel.displayName}</span>
                <Badge className={`text-xs ${getProviderColor(selectedModel.provider)}`}>
                  {selectedModel.provider}
                </Badge>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Array.isArray(models) && models.length > 0 ? models.map((model) => (
            <SelectItem key={model.name} value={model.name}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  {getProviderIcon(model.provider)}
                  <div>
                    <div className="font-medium">{model.displayName}</div>
                    {model.description && (
                      <div className="text-xs text-gray-500">{model.description}</div>
                    )}
                  </div>
                </div>
                <Badge className={`ml-2 ${getProviderColor(model.provider)}`}>
                  {model.provider}
                </Badge>
              </div>
            </SelectItem>
          )) : (
            <SelectItem value="gpt-3.5-turbo" disabled>
              <div className="text-sm text-gray-500">No models available</div>
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {showCostInfo && selectedModel && (
        <div className="mt-3 p-3 bg-gray-50 rounded-md">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Cost Information</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
            <div>
              <span className="font-medium">Input:</span> {formatCost(selectedModel.inputCostPer1K)}/1K tokens
            </div>
            <div>
              <span className="font-medium">Output:</span> {formatCost(selectedModel.outputCostPer1K)}/1K tokens
            </div>
          </div>
          {selectedModel.description && (
            <div className="mt-2 text-xs text-gray-500">
              {selectedModel.description}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center space-x-1 text-xs text-gray-500">
        <Info className="w-3 h-3" />
        <span>
          Higher-cost models typically provide better quality and more accurate results.
        </span>
      </div>
    </div>
  );
};
