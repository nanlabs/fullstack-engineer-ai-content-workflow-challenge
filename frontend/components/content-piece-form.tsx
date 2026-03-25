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
      setError(submitError instanceof Error ? submitError.message : "No se pudo crear la pieza");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="panel form-panel" onSubmit={handleSubmit}>
      <div className="panel-header">
        <h2>Nueva pieza</h2>
        <p>Creá una unidad editorial por vez para mantener explícito el flujo de revisión.</p>
      </div>
      <div className="grid-two">
        <label>
          <span>Tipo</span>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="headline">Headline</option>
            <option value="description">Description</option>
            <option value="cta">CTA</option>
          </select>
        </label>
        <label>
          <span>Idioma fuente</span>
          <input value={sourceLanguage} onChange={(event) => setSourceLanguage(event.target.value)} required />
        </label>
      </div>
      <label>
        <span>Idioma objetivo</span>
        <input value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)} />
      </label>
      <label>
        <span>Texto fuente</span>
        <textarea
          rows={4}
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
          required
        />
      </label>
      {error ? <p className="error-text">{error}</p> : null}
      <button type="submit" disabled={submitting}>
        {submitting ? "Guardando..." : "Agregar pieza"}
      </button>
    </form>
  );
}
