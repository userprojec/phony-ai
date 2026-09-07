import { useState, useEffect } from 'react';
import { fetchCampaigns } from '../api';

export default function CampaignList({ onCampaignClick }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    try {
      setLoading(true);
      const data = await fetchCampaigns();
      setCampaigns(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">Loading campaigns...</div>;

  if (campaigns.length === 0) {
    return (
      <div className="card empty">
        <p>No campaigns yet. Click "+ New Campaign" to upload a CSV and get started.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Created</th>
            <th>Total</th>
            <th>Completed</th>
            <th>Failed</th>
            <th>Pending</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map(c => (
            <tr key={c.id} onClick={() => onCampaignClick(c.id)} style={{ cursor: 'pointer' }}>
              <td><strong>{c.name}</strong></td>
              <td>{new Date(c.created_at).toLocaleString()}</td>
              <td>{c.total_calls}</td>
              <td><span className="status status-completed">{c.completed_calls}</span></td>
              <td><span className="status status-failed">{c.failed_calls}</span></td>
              <td><span className="status status-pending">{c.pending_calls}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}