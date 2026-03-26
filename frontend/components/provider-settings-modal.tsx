"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";
import { ProviderName, ProviderSettings } from "@/lib/types";

export function ProviderSettingsModal({
  open,
  blocking = false,
  settings,
  onClose,
  onSaved,
}: {
  open: boolean;
  blocking?: boolean;
  settings: ProviderSettings;
  onClose: () => void;
  onSaved: (settings: ProviderSettings) => void;
}) {
  const [provider, setProvider] = useState<ProviderName>(settings.provider ?? "gemini");
  const [apiKey, setApiKey] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setProvider(settings.provider ?? "gemini");
    setApiKey("");
    setError(null);
  }, [open, settings]);

  if (!open) {
    return null;
  }

  async function handleSubmit() {
    setPending(true);
    setError(null);
    try {
      const updated = await apiRequest<ProviderSettings>("/settings/ai-provider", {
        method: "PUT",
        body: JSON.stringify({
          provider,
          api_key: apiKey,
        }),
      });
      setApiKey("");
      onSaved(updated);
      onClose();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to save provider settings");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card provider-settings-modal" role="dialog" aria-modal="true" aria-labelledby="provider-settings-title">
        <div className="modal-header">
          <div>
            <p className="eyebrow">AI Provider</p>
            <h4 id="provider-settings-title">Provider configuration</h4>
          </div>
          {!blocking ? (
            <button type="button" className="stitch-icon-button" onClick={onClose}>
              ×
            </button>
          ) : null}
        </div>
        <p className="muted">
          Configure the global AI provider used by the app. The API key is encrypted at rest and is never returned after it is saved.
        </p>
        <section className="provider-settings-summary">
          <div>
            <span className="eyebrow">Current provider</span>
            <strong>{settings.provider ?? "Not configured"}</strong>
          </div>
          <div>
            <span className="eyebrow">Source</span>
            <strong>{settings.source}</strong>
          </div>
          <div>
            <span className="eyebrow">API key</span>
            <strong>{settings.has_api_key ? "Stored" : "Missing"}</strong>
          </div>
        </section>
        {settings.source === "environment" ? (
          <p className="muted">
            Saving here will override the environment-backed provider for the app.
          </p>
        ) : null}
        <div className="action-grid">
          <label>
            <span>Provider</span>
            <select value={provider} onChange={(event) => setProvider(event.target.value as ProviderName)}>
              <option value="gemini">Gemini</option>
              <option value="openai">OpenAI</option>
            </select>
          </label>
          <label>
            <span>API key</span>
            <input
              type="password"
              value={apiKey}
              placeholder="Enter a new API key"
              onChange={(event) => setApiKey(event.target.value)}
              autoComplete="off"
            />
          </label>
        </div>
        <p className="muted">
          Leave the field blank only if you are keeping the same provider and existing stored key.
        </p>
        {error ? <p className="error-text">{error}</p> : null}
        <div className="button-row">
          {!blocking ? (
            <button type="button" className="button-secondary" onClick={onClose}>
              Cancel
            </button>
          ) : null}
          <button type="button" disabled={pending} onClick={handleSubmit}>
            {pending ? "Saving..." : "Save provider settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
