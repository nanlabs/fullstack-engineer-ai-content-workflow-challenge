export function DashboardAiBanner() {
  return (
    <section className="dashboard-ai-banner">
      <div>
        <h3>Optimización AI Detectada</h3>
        <p>
          Hemos analizado tus campañas recientes. Varias piezas activas podrían beneficiarse de una re-edición tonal para ajustarse mejor a la audiencia objetivo.
        </p>
        <button type="button" className="banner-button">Ver sugerencias AI</button>
      </div>
      <div className="dashboard-ai-visual" aria-hidden="true">
        <div className="dashboard-ai-visual-card">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    </section>
  );
}
