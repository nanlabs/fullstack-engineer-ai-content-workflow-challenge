import { fetchProviderSettings } from "@/lib/api";
import { ProviderSettingsPage } from "@/components/provider-settings-page";
import { StitchShell } from "@/components/stitch-shell";

export default async function SettingsPage() {
  const settings = await fetchProviderSettings();

  return (
    <StitchShell activeHref="/settings" pageTitle="Campaign Manager">
      <main className="dashboard-layout">
        <ProviderSettingsPage initialSettings={settings} />
      </main>
    </StitchShell>
  );
}
