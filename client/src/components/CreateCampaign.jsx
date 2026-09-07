import { useState, useRef } from 'react';
import { uploadCampaign } from '../api';

export default function CreateCampaign({ onCreated }) {
  const [campaignName, setCampaignName] = useState('');
  const [file, setFile] = useState(null);
  const [validation, setValidation] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef();

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (f && f.name.endsWith('.csv')) {
      setFile(f);
      setError('');
      setValidation(null);
    } else {
      setFile(null);
      setError('Please select a .csv file');
    }
  }

  async function handleUpload() {
    if (!file) { setError('Please select a CSV file'); return; }
    setUploading(true);
    setError('');
    try {
      const result = await uploadCampaign(campaignName || 'Untitled Campaign', file);
      setValidation(result);
      if (result.valid_rows > 0) {
        // Don't auto-navigate — let user see validation first
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  function handleStartCampaign() {
    if (validation?.campaign_id) {
      onCreated(validation.campaign_id);
    }
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: 20 }}>New Campaign</h2>

      <div className="form-group">
        <label>Campaign Name (optional)</label>
        <input
          type="text"
          placeholder="e.g. August Order Status Updates"
          value={campaignName}
          onChange={e => setCampaignName(e.target.value)}
        />
      </div>

      <div
        className="upload-zone"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
        />
        {file ? (
          <p><strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)</p>
        ) : (
          <>
            <p style={{ fontSize: 32 }}>📄</p>
            <p>Click to upload a CSV file</p>
            <p style={{ fontSize: 12, color: '#aaa' }}>
              Required columns: name, phone, order_id, order_status
            </p>
          </>
        )}
      </div>

      {error && <p style={{ color: '#e74c3c', marginTop: 12, fontSize: 13 }}>{error}</p>}

      <div style={{ marginTop: 16 }}>
        <button
          className="btn btn-primary"
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? 'Validating...' : 'Validate & Create Campaign'}
        </button>
      </div>

      {validation && (
        <div className="validation-summary">
          <p className="validation-ok">✓ {validation.valid_rows} valid rows</p>
          {validation.invalid_rows > 0 && (
            <div className="validation-errors">
              <p>⚠ {validation.invalid_rows} invalid rows:</p>
              <ul>
                {validation.invalid_details.map((item, i) => (
                  <li key={i}>
                    Row {item.row}: {item.errors.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {validation.valid_rows > 0 && (
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={handleStartCampaign}>
                Start Campaign — {validation.valid_rows} calls
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}