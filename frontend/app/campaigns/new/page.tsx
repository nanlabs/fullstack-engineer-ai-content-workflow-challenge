import Link from "next/link";

import { CampaignForm } from "@/components/campaign-form";
import { StitchShell } from "@/components/stitch-shell";

export default function NewCampaignPage() {
  return (
    <StitchShell activeHref="/campaigns/new" pageTitle="Campaign Manager">
      <main className="onboarding-layout">
        <Link href="/" className="back-link">
          ← Volver al dashboard
        </Link>
        <section className="onboarding-hero">
          <div>
            <p className="eyebrow">Campaign Genesis</p>
            <h2>Nueva Campaña</h2>
            <p>Definí el brief editorial y abrí una campaña lista para entrar al workbench con el lenguaje visual de ACME Media.</p>
          </div>
          <div className="onboarding-metrics">
            <span>Flujo</span>
            <strong>01</strong>
          </div>
        </section>
        <section className="onboarding-grid">
          <article className="onboarding-copy-card">
            <h3>Cómo debería avanzar este flujo</h3>
            <ol>
              <li>Nombrar la campaña con una referencia editorial clara.</li>
              <li>Describir el objetivo o brief operativo.</li>
              <li>Crear la campaña y pasar directo al workbench.</li>
            </ol>
          </article>
          <CampaignForm />
        </section>
      </main>
    </StitchShell>
  );
}
