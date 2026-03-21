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
        <div className="min-h-screen flex flex-col pt-16">
          <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-zinc-200 z-50">
            <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <a href="/" className="flex items-center gap-2 font-semibold text-zinc-900 tracking-tight">
                  <svg viewBox="0 0 76 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="#000000"/></svg>
                  <span>ACME</span>
                </a>
                <span className="text-zinc-300">/</span>
                <span className="text-sm text-zinc-600 font-medium">Content Workflow</span>
              </div>
              <span className="bg-zinc-100 text-zinc-600 border border-zinc-200 px-2 py-0.5 rounded-full text-[11px] font-medium tracking-wide">BETA</span>
            </div>
          </header>
          <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
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
