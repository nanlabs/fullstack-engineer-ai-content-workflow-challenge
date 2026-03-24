"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";

export function ContentPieceForm({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [type, setType] = useState("headline");
  const [sourceText, setSourceText] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest(`/campaigns/${campaignId}/content-pieces`, {
        method: "POST",
        body: JSON.stringify({
          type,
          source_text: sourceText,
          source_language: sourceLanguage,
          target_language: targetLanguage || null,
        }),
      });
      setSourceText("");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create content piece");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="panel form-panel" onSubmit={handleSubmit}>
      <div className="panel-header">
        <h2>Add content piece</h2>
        <p>Create one content unit at a time to keep the review flow explicit.</p>
      </div>
      <div className="grid-two">
        <label>
          <span>Type</span>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="headline">Headline</option>
            <option value="description">Description</option>
            <option value="cta">CTA</option>
          </select>
        </label>
        <label>
          <span>Source language</span>
          <input value={sourceLanguage} onChange={(event) => setSourceLanguage(event.target.value)} required />
        </label>
      </div>
      <label>
        <span>Target language</span>
        <input value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)} />
      </label>
      <label>
        <span>Source text</span>
        <textarea
          rows={4}
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
          required
        />
      </label>
      {error ? <p className="error-text">{error}</p> : null}
      <button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Add content piece"}
      </button>
    </form>
  );
}
