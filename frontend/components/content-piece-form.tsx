"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";

export function ContentPieceForm({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [sourceText, setSourceText] = useState("");
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
          source_text: sourceText,
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
        <p>Creá una pieza simple con texto base. El draft, la traducción y la metadata suceden después.</p>
      </div>
      <label>
        <span>Texto base</span>
        <textarea
          rows={4}
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
          placeholder="Escribí el contenido inicial para esta campaña..."
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
