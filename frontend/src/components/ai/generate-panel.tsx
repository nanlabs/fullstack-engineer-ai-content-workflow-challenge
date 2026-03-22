'use client';

import { useState } from 'react';
import { Sparkles, GitCompare } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { AIModel, GenerateDraftData, CompareModelsData } from '@/types';

type GenerateMode = 'single' | 'compare';

interface GeneratePanelProps {
  onGenerate: (data: GenerateDraftData) => Promise<void>;
  onCompare: (data?: CompareModelsData) => Promise<void>;
  isGenerating?: boolean;
  isComparing?: boolean;
}

export function GeneratePanel({
  onGenerate,
  onCompare,
  isGenerating,
  isComparing,
}: GeneratePanelProps) {
  const [mode, setMode] = useState<GenerateMode>('single');
  const [model, setModel] = useState<AIModel>('CLAUDE_3_5_SONNET');
  const [prompt, setPrompt] = useState('');

  async function handleGenerate() {
    await onGenerate({
      model,
      prompt: prompt.trim() || undefined,
    });
  }

  async function handleCompare() {
    await onCompare({ prompt: prompt.trim() || undefined });
  }

  const isLoading = isGenerating || isComparing;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-gray-900">AI Generation</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode toggle */}
        <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
          <button
            type="button"
            onClick={() => setMode('single')}
            disabled={isLoading}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              mode === 'single'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Single Model
          </button>
          <button
            type="button"
            onClick={() => setMode('compare')}
            disabled={isLoading}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              mode === 'compare'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Compare Models
          </button>
        </div>

        {/* Model selector — only in single mode */}
        {mode === 'single' && (
          <div className="space-y-1.5">
            <Label htmlFor="ai-model">Model</Label>
            <Select
              id="ai-model"
              value={model}
              onChange={(e) => setModel(e.target.value as AIModel)}
              disabled={isLoading}
            >
              <option value="CLAUDE_3_5_SONNET">Claude 3.5 Sonnet</option>
              <option value="GPT_4O">GPT-4o</option>
            </Select>
          </div>
        )}

        {mode === 'compare' && (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4 py-3 text-xs text-gray-500">
            Generates two drafts simultaneously — one from{' '}
            <span className="font-medium text-purple-700">Claude 3.5 Sonnet</span> and
            one from <span className="font-medium text-teal-700">GPT-4o</span> — so
            you can compare outputs side by side.
          </div>
        )}

        {/* Custom prompt */}
        <div className="space-y-1.5">
          <Label htmlFor="custom-prompt">
            Custom Prompt{' '}
            <span className="font-normal text-gray-400">(optional)</span>
          </Label>
          <Textarea
            id="custom-prompt"
            placeholder="Specific instructions for the AI, e.g. 'Make it more playful and target Gen Z'…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            disabled={isLoading}
            className="resize-none"
          />
        </div>

        {/* Action buttons */}
        {mode === 'single' ? (
          <Button
            onClick={handleGenerate}
            isLoading={isGenerating}
            disabled={isLoading}
            className="w-full"
            size="sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate Draft
          </Button>
        ) : (
          <Button
            onClick={handleCompare}
            isLoading={isComparing}
            disabled={isLoading}
            className="w-full"
            size="sm"
          >
            <GitCompare className="h-3.5 w-3.5" />
            Compare Both Models
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
