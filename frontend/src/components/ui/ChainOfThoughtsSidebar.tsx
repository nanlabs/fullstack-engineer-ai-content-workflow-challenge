"use client";

import { Check, X, AlertCircle } from "lucide-react";
import React, { useState, useEffect } from "react";

interface ChainOfThoughtsSidebarProps {
  isVisible: boolean;
  currentStep: string;
  message: string;
  progress: number;
  onComplete?: () => void;
  onClose?: () => void;
}

interface ThoughtStep {
  id: string;
  label: string;
  icon: string;
  description: string;
}

const THOUGHT_STEPS: Record<string, ThoughtStep> = {
  analyzing: {
    id: "analyzing",
    label: "Analyzing",
    icon: "🔍",
    description: "Understanding your request",
  },
  documents: {
    id: "documents",
    label: "Documents",
    icon: "📄",
    description: "Reviewing uploaded files",
  },
  orchestrator: {
    id: "orchestrator",
    label: "Planning",
    icon: "🧠",
    description: "Determining approach",
  },
  research: {
    id: "research",
    label: "Research",
    icon: "🌐",
    description: "Gathering information",
  },
  generating: {
    id: "generating",
    label: "Generating",
    icon: "✨",
    description: "Creating content",
  },
  completed: {
    id: "completed",
    label: "Complete",
    icon: "✅",
    description: "Content ready",
  },
  error: {
    id: "error",
    label: "Error",
    icon: "❌",
    description: "Something went wrong",
  },
};

export const ChainOfThoughtsSidebar: React.FC<ChainOfThoughtsSidebarProps> = ({
  isVisible,
  currentStep,
  message,
  progress,
  onComplete,
  onClose,
}) => {
  const [displayedSteps, setDisplayedSteps] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setDisplayedSteps([]);
      setHasError(false);
      return;
    }

    // Handle error state
    if (currentStep === "error") {
      setHasError(true);
      // Stop all animations when error occurs
      setIsAnimating(false);
      return;
    }

    // Add current step to displayed steps (but not for error)
    if (currentStep && currentStep !== "error") {
      setDisplayedSteps((prev) => {
        if (!prev.includes(currentStep)) {
          setIsAnimating(true);
          setTimeout(() => setIsAnimating(false), 500);
          return [...prev, currentStep];
        }
        return prev;
      });
    }

    // Auto-hide after completion
    if (currentStep === "completed" && onComplete) {
      setTimeout(() => {
        onComplete();
      }, 2000); // Show completion for 2 seconds
    }
  }, [isVisible, currentStep, onComplete]);

  if (!isVisible) return null;

  const currentStepData = THOUGHT_STEPS[currentStep] || THOUGHT_STEPS.analyzing;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-40 overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-lg font-semibold ${
              hasError ? 'text-red-900' : 'text-gray-900'
            }`}>
              {hasError ? 'AI Generation Failed' : 'AI is thinking...'}
            </h3>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>
          <p className={`text-sm ${
            hasError ? 'text-red-600' : 'text-gray-600'
          }`}>
            {message}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{hasError ? '0%' : `${progress}%`}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ease-out ${
                hasError ? 'bg-red-500' : 'bg-blue-600'
              }`}
              style={{ width: hasError ? '0%' : `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {Object.values(THOUGHT_STEPS).map((step) => {
            const isActive = displayedSteps.includes(step.id);
            const isCurrent = currentStep === step.id;
            const isCompleted = displayedSteps.includes(step.id) && !isCurrent && !hasError;
            const isError = hasError && step.id === "error";

            return (
              <div
                key={step.id}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 ${
                  isError
                    ? "bg-red-50 border border-red-200"
                    : isCurrent && !hasError
                    ? "bg-blue-50 border border-blue-200"
                    : isCompleted
                    ? "bg-green-50 border border-green-200"
                    : "bg-gray-50 border border-gray-200"
                } ${isAnimating && isCurrent && !hasError ? "animate-pulse" : ""}`}
              >
                {/* Icon */}
                <div
                  className={`text-xl transition-all duration-300 ${
                    isCurrent && !hasError ? "animate-bounce" : ""
                  }`}
                >
                  {step.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4
                      className={`font-medium text-sm ${
                        isError
                          ? "text-red-900"
                          : isCurrent && !hasError
                          ? "text-blue-900"
                          : isCompleted
                          ? "text-green-900"
                          : "text-gray-700"
                      }`}
                    >
                      {step.label}
                    </h4>
                    {isCurrent && !hasError && (
                      <div className="flex space-x-1">
                        <div
                          className="w-1 h-1 bg-blue-600 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <div
                          className="w-1 h-1 bg-blue-600 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <div
                          className="w-1 h-1 bg-blue-600 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    )}
                  </div>
                  <p
                    className={`text-xs ${
                      isError
                        ? "text-red-700"
                        : isCurrent && !hasError
                        ? "text-blue-700"
                        : isCompleted
                        ? "text-green-700"
                        : "text-gray-500"
                    }`}
                  >
                    {step.description}
                  </p>
                </div>

                {/* Status Indicator */}
                <div className="flex-shrink-0">
                  {isCompleted && (
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {isCurrent && !hasError && (
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    </div>
                  )}
                  {isError && (
                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          {hasError ? (
            <div className="space-y-3">
              <p className="text-xs text-red-600 font-medium">
                Generation failed. Please try again.
              </p>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              This may take a few moments...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
