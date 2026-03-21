import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import CampaignDetail from './pages/CampaignDetail';
import ContentDetail from './pages/ContentDetail';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white border-b shadow-sm">
            <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
              <a href="/" className="font-bold text-lg text-gray-800">
                ACME Content Workflow
              </a>
              <span className="text-xs text-gray-400">AI-Powered</span>
            </div>
          </header>
          <main className="py-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/campaigns/:id" element={<CampaignDetail />} />
              <Route path="/content/:id" element={<ContentDetail />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
