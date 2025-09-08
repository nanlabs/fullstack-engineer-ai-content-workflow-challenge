import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CampaignProvider } from '@/context/CampaignContext';
import CampaignIndex from '@/pages/CampaignIndex';
import ContentIndex from '@/pages/ContentIndex';
import NotFound from '@/pages/NotFound';
import CampaignEdit from './pages/CampaignEdit';

function App() {
  return (
    <CampaignProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Campaign Index Page */}
            <Route path="/" element={<CampaignIndex />} />
            <Route path="/campaigns/" element={<CampaignIndex />} />

            {/* Campaign Edit Page */}
            <Route path="/campaigns/:campaignId/edit" element={<CampaignEdit />} />

            {/* Content Index Page for a specific campaign */}
            <Route path="/campaigns/:campaignId/contents/" element={<ContentIndex />} />

            {/* 404 Page */}
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
    </CampaignProvider>
  );
}

export default App;
