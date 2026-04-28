import { Outlet } from "react-router";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

export function AppShell() {
  return (
    <div className="bg-background min-h-screen">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
