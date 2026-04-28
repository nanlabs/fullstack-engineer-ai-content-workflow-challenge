import { Outlet } from "react-router";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { SseProvider, useSseContext } from "@/lib/sse-context";

function AppShellInner() {
  const { connected } = useSseContext();
  return (
    <div className="bg-background min-h-screen">
      <Header sseConnected={connected} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AppShell() {
  return (
    <SseProvider>
      <AppShellInner />
    </SseProvider>
  );
}
