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
      const campaign = await apiRequest<{ id: string }>("/campaigns", {
        method: "POST",
        body: JSON.stringify({ name, description: description || null }),
      });
      setName("");
      setDescription("");
      router.push(`/campaigns/${campaign.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo crear la campaña");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="panel form-panel" onSubmit={handleSubmit}>
      <div className="panel-header">
        <p className="eyebrow">Campaign Genesis</p>
        <h2>Crear campaña editorial</h2>
        <p>Definí el brief principal y llevá la nueva campaña directo al workbench operativo.</p>
      </div>
      <div className="onboarding-notes">
        <div>
          <strong>1. Nombrá la campaña</strong>
          <p>Usá la referencia comercial o editorial que el equipo va a reconocer al instante.</p>
        </div>
        <div>
          <strong>2. Cargá el brief</strong>
          <p>Resumí objetivo, tono o contexto antes de crear la primera pieza de contenido.</p>
        </div>
        <div>
          <strong>3. Abrí el workbench</strong>
          <p>Después del alta, sumá headlines, descriptions y CTAs dentro del flujo editorial.</p>
        </div>
      </div>
      <label>
        <span>Nombre de la campaña</span>
        <input value={name} onChange={(event) => setName(event.target.value)} required />
      </label>
      <label>
        <span>Brief de campaña</span>
        <textarea
          rows={5}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Lanzamiento de temporada, paid media en español, ajuste editorial para homepage..."
        />
      </label>
      {error ? <p className="error-text">{error}</p> : null}
      <button type="submit" disabled={submitting}>
        {submitting ? "Creando..." : "Crear campaña"}
      </button>
    </form>
  );
}
