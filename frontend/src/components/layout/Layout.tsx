"use client";

import type React from "react";
import { ConnectionStatus } from "@/components/websocket/ConnectionStatus";
import { LanguageProvider } from "@/components/translation/LanguageProvider";

interface LayoutProps {
  children: React.ReactNode;
}

const LayoutContent: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              ACME AI Workflow
            </h1>
            <div className="flex items-center space-x-4">
              <ConnectionStatus />
              <div className="text-sm text-gray-500">
                AI-Powered Content Creation
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <LanguageProvider>
      <LayoutContent>{children}</LayoutContent>
    </LanguageProvider>
  );
};
