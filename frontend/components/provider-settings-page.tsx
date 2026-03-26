"use client";

import { useState } from "react";

import { ProviderSettings } from "@/lib/types";
import { ProviderSettingsModal } from "@/components/provider-settings-modal";

export function ProviderSettingsPage({ initialSettings }: { initialSettings: ProviderSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <section className="dashboard-empty provider-settings-page">
        <div className="provider-settings-page-header">
          <div>
            <h2>Settings</h2>
            <p>Manage the global AI provider for drafts, translations, and metadata extraction.</p>
          </div>
          <button type="button" onClick={() => setIsModalOpen(true)}>
            Configure provider
          </button>
        </div>
        <div className="provider-settings-summary provider-settings-summary-page">
          <div>
            <span className="eyebrow">Current provider</span>
            <strong>{settings.provider ?? "Not configured"}</strong>
          </div>
          <div>
            <span className="eyebrow">Status</span>
            <strong>{settings.configured ? "Configured" : "Missing"}</strong>
          </div>
          <div>
            <span className="eyebrow">Source</span>
            <strong>{settings.source}</strong>
          </div>
          <div>
            <span className="eyebrow">API key</span>
            <strong>{settings.has_api_key ? "Stored" : "Missing"}</strong>
          </div>
        </div>
      </section>
      <ProviderSettingsModal
        open={isModalOpen}
        settings={settings}
        onClose={() => setIsModalOpen(false)}
        onSaved={setSettings}
      />
    </>
  );
}
