import { createBrowserRouter, RouterProvider, Navigate } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/query-client";
import { AppShell } from "@/components/layout/app-shell";
import CampaignsListPage from "@/pages/campaigns-list";
import CampaignDetailPage from "@/pages/campaign-detail";
import ContentPieceDetailPage from "@/pages/content-piece-detail";
import NotFoundPage from "@/pages/not-found";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/campaigns" /> },
      { path: "campaigns", element: <CampaignsListPage /> },
      { path: "campaigns/:id", element: <CampaignDetailPage /> },
      { path: "content-pieces/:id", element: <ContentPieceDetailPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
