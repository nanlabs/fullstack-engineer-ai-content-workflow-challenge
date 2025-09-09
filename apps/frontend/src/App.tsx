import { Toaster } from '@/components/ui/sonner';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CampaignProvider } from '@/context/CampaignContext';
import { GenerationConfigProvider } from './context/GenerationConfigContext';
import CampaignIndex from '@/pages/CampaignIndex';
import ContentIndex from '@/pages/ContentIndex';
import NotFound from '@/pages/NotFound';
import CampaignCreate from './pages/CampaignCreate';

function App() {
  return (
    <GenerationConfigProvider>
      <CampaignProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Campaign Index Page */}
              <Route path="/" element={<CampaignIndex />} />
              <Route path="/campaigns/" element={<CampaignIndex />} />

              {/* Campaign Create Page */}
              <Route path="/campaigns/new" element={<CampaignCreate />} />

              {/* Content Index Page for a specific campaign */}
              <Route path="/campaigns/:campaignId/contents/" element={<ContentIndex />} />

              {/* 404 Page */}
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </div>
        </Router>
      </CampaignProvider>
    </GenerationConfigProvider>
  );
}

export default App;
