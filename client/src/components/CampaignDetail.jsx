import { useState, useEffect, useCallback } from 'react';
import { fetchCampaign, fetchCalls, startCampaign } from '../api';

export default function CampaignDetail({ campaignId }) {
  const [campaign, setCampaign] = useState(null);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [camp, callList] = await Promise.all([
        fetchCampaign(campaignId),
        fetchCalls(campaignId),
      ]);
      setCampaign(camp);
      setCalls(callList);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 5 seconds if there are pending/calling calls
  useEffect(() => {
    const hasActive = calls.some(c => c.call_status === 'pending' || c.call_status === 'calling');
    if (!hasActive) return;
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [calls, loadData]);

  async function handleStart() {
    setStarting(true);
    setError('');
    try {
      await startCampaign(campaignId);
      loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  }

  if (loading) return <div className="loading">Loading campaign...</div>;
  if (!campaign) return <div className="empty">Campaign not found</div>;

  const pendingCount = calls.filter(c => c.call_status === 'pending').length;
  const canStart = pendingCount > 0;

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>{campaign.name}</h2>
            <p style={{ color: '#888', fontSize: 13 }}>
              Created {new Date(campaign.created_at).toLocaleString()} · {calls.length} calls
            </p>
          </div>
          {canStart && (
            <button
              className="btn btn-primary"
              onClick={handleStart}
              disabled={starting}
            >
              {starting ? 'Starting...' : `Start ${pendingCount} Calls`}
            </button>
          )}
        </div>
        {error && <p style={{ color: '#e74c3c', marginTop: 12, fontSize: 13 }}>{error}</p>}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>Call Records</h3>
          <button className="btn btn-secondary" onClick={loadData} style={{ fontSize: 12 }}>
            ↻ Refresh
          </button>
        </div>

        {calls.length === 0 ? (
          <div className="empty">No calls in this campaign</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Order ID</th>
                <th>Status</th>
                <th>Response</th>
                <th>Transcript</th>
              </tr>
            </thead>
            <tbody>
              {calls.map(call => (
                <tr key={call.id}>
                  <td>{call.customer_name}</td>
                  <td>{call.phone}</td>
                  <td>{call.order_id}</td>
                  <td>
                    <span className={`status status-${call.call_status}`}>
                      {call.call_status}
                    </span>
                  </td>
                  <td>{call.customer_response || '—'}</td>
                  <td>
                    <div className="transcript">
                      {call.response_transcript || '—'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}