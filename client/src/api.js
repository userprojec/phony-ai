const API = '/api';

export async function fetchCampaigns() {
  const res = await fetch(`${API}/campaigns`);
  if (!res.ok) throw new Error('Failed to fetch campaigns');
  return res.json();
}

export async function fetchCampaign(id) {
  const res = await fetch(`${API}/campaigns/${id}`);
  if (!res.ok) throw new Error('Failed to fetch campaign');
  return res.json();
}

export async function fetchCalls(campaignId) {
  const res = await fetch(`${API}/campaigns/${campaignId}/calls`);
  if (!res.ok) throw new Error('Failed to fetch calls');
  return res.json();
}

export async function uploadCampaign(name, file) {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('file', file);
  const res = await fetch(`${API}/campaigns`, { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

export async function startCampaign(id) {
  const res = await fetch(`${API}/campaigns/${id}/start`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Start failed');
  }
  return res.json();
}