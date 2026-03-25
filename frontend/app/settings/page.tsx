import { StitchShell } from "@/components/stitch-shell";

export default function SettingsPage() {
  return (
    <StitchShell activeHref="/settings" pageTitle="Campaign Manager">
      <main className="dashboard-layout">
        <section className="dashboard-empty">
          <h2>Settings</h2>
          <p>Esta vista queda como placeholder visual dentro de la shell de Stitch. La configuración detallada sigue fuera del scope actual.</p>
        </section>
      </main>
    </StitchShell>
  );
}
