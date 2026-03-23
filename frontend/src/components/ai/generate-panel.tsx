'use client';

import { useState } from 'react';
import { Sparkles, GitCompare, Zap } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { AIModel, GenerateDraftData, CompareModelsData, RunChainData } from '@/types';

type GenerateMode = 'single' | 'compare' | 'chain';

interface GeneratePanelProps {
  onGenerate: (data: GenerateDraftData) => Promise<void>;
  onCompare: (data?: CompareModelsData) => Promise<void>;
  onRunChain: (data: RunChainData) => Promise<void>;
  isGenerating?: boolean;
  isComparing?: boolean;
  isRunningChain?: boolean;
}

export function GeneratePanel({
  onGenerate,
  onCompare,
  onRunChain,
  isGenerating,
  isComparing,
  isRunningChain,
}: GeneratePanelProps) {
  const [mode, setMode] = useState<GenerateMode>('single');
  const [model, setModel] = useState<AIModel>('CLAUDE_3_5_SONNET');
  const [prompt, setPrompt] = useState('');
  const [chainLang, setChainLang] = useState('es');

  const isLoading = isGenerating || isComparing || isRunningChain;

  async function handleGenerate() {
    await onGenerate({ model, prompt: prompt.trim() || undefined });
  }

  async function handleCompare() {
    await onCompare({ prompt: prompt.trim() || undefined });
  }

  async function handleChain() {
    await onRunChain({ targetLanguage: chainLang, model });
  }

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
          {(['single', 'compare', 'chain'] as GenerateMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              disabled={isLoading}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all ${
                mode === m
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m === 'single' ? 'Single' : m === 'compare' ? 'Compare' : 'Chain ✦'}
            </button>
          ))}
        </div>

        {/* Mode-specific content */}
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
            <span className="font-medium text-purple-700">Claude 3.5 Sonnet</span> and one
            from <span className="font-medium text-teal-700">GPT-4o</span> — so you can
            compare outputs side by side.
          </div>
        )}

        {mode === 'chain' && (
          <div className="space-y-3">
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-xs text-indigo-700">
              <span className="font-semibold">LangChain pipeline</span> — runs 3 sequential
              steps: generate draft → translate → strategic summary. Powered by LangChain
              RunnableSequence.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="chain-model">Model</Label>
                <Select
                  id="chain-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value as AIModel)}
                  disabled={isLoading}
                >
                  <option value="CLAUDE_3_5_SONNET">Claude 3.5 Sonnet</option>
                  <option value="GPT_4O">GPT-4o</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chain-lang">Target Language</Label>
                <Select
                  id="chain-lang"
                  value={chainLang}
                  onChange={(e) => setChainLang(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="es">Spanish</option>
                  <option value="pt">Portuguese</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="ja">Japanese</option>
                  <option value="zh">Chinese</option>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Custom prompt — not for chain mode */}
        {mode !== 'chain' && (
          <div className="space-y-1.5">
            <Label htmlFor="custom-prompt">
              Custom Prompt{' '}
              <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <Textarea
              id="custom-prompt"
              placeholder="Specific instructions, e.g. 'Make it more playful and target Gen Z'…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              disabled={isLoading}
              className="resize-none"
            />
          </div>
        )}

        {/* Action button */}
        {mode === 'single' && (
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
        )}
        {mode === 'compare' && (
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
        {mode === 'chain' && (
          <Button
            onClick={handleChain}
            isLoading={isRunningChain}
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            size="sm"
          >
            <Zap className="h-3.5 w-3.5" />
            Run LangChain Pipeline
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
