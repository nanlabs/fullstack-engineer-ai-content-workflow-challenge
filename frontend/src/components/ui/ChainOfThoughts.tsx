"use client";

import React, { useState, useEffect } from "react";

interface ChainOfThoughtsProps {
  isVisible: boolean;
  currentStep: string;
  message: string;
  progress: number;
  onComplete?: () => void;
}

interface ThoughtStep {
  id: string;
  label: string;
  icon: string;
  description: string;
}

const THOUGHT_STEPS: Record<string, ThoughtStep> = {
  analyzing: {
    id: 'analyzing',
    label: 'Analyzing',
    icon: '🔍',
    description: 'Understanding your request'
  },
  documents: {
    id: 'documents',
    label: 'Documents',
    icon: '📄',
    description: 'Reviewing uploaded files'
  },
  orchestrator: {
    id: 'orchestrator',
    label: 'Planning',
    icon: '🧠',
    description: 'Determining approach'
  },
  research: {
    id: 'research',
    label: 'Research',
    icon: '🌐',
    description: 'Gathering information'
  },
  generating: {
    id: 'generating',
    label: 'Generating',
    icon: '✨',
    description: 'Creating content'
  },
  completed: {
    id: 'completed',
    label: 'Complete',
    icon: '✅',
    description: 'Content ready'
  },
  error: {
    id: 'error',
    label: 'Error',
    icon: '❌',
    description: 'Something went wrong'
  }
};

export const ChainOfThoughts: React.FC<ChainOfThoughtsProps> = ({
  isVisible,
  currentStep,
  message,
  progress,
  onComplete
}) => {
  const [displayedSteps, setDisplayedSteps] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setDisplayedSteps([]);
      return;
    }

    // Add current step to displayed steps
    if (currentStep && !displayedSteps.includes(currentStep)) {
      setIsAnimating(true);
      setDisplayedSteps(prev => [...prev, currentStep]);
      
      // Stop animation after a short delay
      setTimeout(() => setIsAnimating(false), 500);
    }

    // Auto-hide after completion
    if (currentStep === 'completed' && onComplete) {
      setTimeout(() => {
        onComplete();
      }, 3000); // Show completion for 3 seconds
    }
  }, [isVisible, currentStep, displayedSteps, onComplete]);

  if (!isVisible) return null;

  const currentStepData = THOUGHT_STEPS[currentStep] || THOUGHT_STEPS.analyzing;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            AI is thinking...
          </h3>
          <p className="text-sm text-gray-600">
            {message}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {Object.values(THOUGHT_STEPS).map((step, index) => {
            const isActive = displayedSteps.includes(step.id);
            const isCurrent = currentStep === step.id;
            const isCompleted = displayedSteps.includes(step.id) && !isCurrent;

            return (
              <div
                key={step.id}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 ${
                  isCurrent 
                    ? 'bg-blue-50 border border-blue-200' 
                    : isCompleted 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-gray-50 border border-gray-200'
                } ${isAnimating && isCurrent ? 'animate-pulse' : ''}`}
              >
                {/* Icon */}
                <div className={`text-2xl transition-all duration-300 ${
                  isCurrent ? 'animate-bounce' : ''
                }`}>
                  {step.icon}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className={`font-medium ${
                      isCurrent ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-700'
                    }`}>
                      {step.label}
                    </h4>
                    {isCurrent && (
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                  <p className={`text-xs ${
                    isCurrent ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-gray-500'
                  }`}>
                    {step.description}
                  </p>
                </div>

                {/* Status Indicator */}
                <div className="flex-shrink-0">
                  {isCompleted && (
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            This may take a few moments...
          </p>
        </div>
      </div>
    </div>
  );
};
