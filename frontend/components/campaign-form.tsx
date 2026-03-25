"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";

export function CampaignForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest("/campaigns", {
        method: "POST",
        body: JSON.stringify({ name, description: description || null }),
      });
      setName("");
      setDescription("");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="panel form-panel" onSubmit={handleSubmit}>
      <div className="panel-header">
        <p className="eyebrow">Campaign Genesis</p>
        <h2>Create the next editorial brief</h2>
        <p>Start with the campaign frame. The workbench will handle pieces, AI suggestions, and review after this step.</p>
      </div>
      <div className="onboarding-notes">
        <div>
          <strong>1. Name the campaign</strong>
          <p>Use the commercial or editorial theme the team will recognize immediately.</p>
        </div>
        <div>
          <strong>2. Add the brief</strong>
          <p>Capture the goal, tone, or launch context before the first content piece is created.</p>
        </div>
        <div>
          <strong>3. Build the queue</strong>
          <p>Once saved, add headlines, descriptions, and CTAs into the campaign workbench.</p>
        </div>
      </div>
      <label>
        <span>Campaign name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} required />
      </label>
      <label>
        <span>Campaign brief</span>
        <textarea
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Spring launch, editorial landing page, Spanish localization for paid media..."
        />
      </label>
      {error ? <p className="error-text">{error}</p> : null}
      <button type="submit" disabled={submitting}>
        {submitting ? "Creating..." : "Create campaign brief"}
      </button>
    </form>
  );
}
