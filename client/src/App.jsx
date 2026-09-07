import { useState } from 'react';
import CampaignList from './components/CampaignList';
import CampaignDetail from './components/CampaignDetail';
import CreateCampaign from './components/CreateCampaign';

export default function App() {
  const [view, setView] = useState('list'); // 'list' | 'create' | 'detail'
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCampaignClick = (id) => {
    setSelectedCampaignId(id);
    setView('detail');
  };

  const handleBack = () => {
    setView('list');
    setSelectedCampaignId(null);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>📞 Phony AI</h1>
          <p className="subtitle">Bulk IVR Order Status Updates</p>
        </div>
        {view === 'list' && (
          <button className="btn btn-primary" onClick={() => setView('create')}>
            + New Campaign
          </button>
        )}
        {view !== 'list' && (
          <button className="btn btn-secondary" onClick={handleBack}>
            ← Back to Campaigns
          </button>
        )}
      </header>

      {view === 'list' && (
        <CampaignList key={refreshKey} onCampaignClick={handleCampaignClick} />
      )}
      {view === 'create' && (
        <CreateCampaign onCreated={(id) => { setSelectedCampaignId(id); setView('detail'); }} />
      )}
      {view === 'detail' && selectedCampaignId && (
        <CampaignDetail campaignId={selectedCampaignId} />
      )}
    </div>
  );
}