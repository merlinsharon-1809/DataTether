import React, { useState } from 'react';
import {
  HardDrive,
  Bot,
  Shield,
  CheckCircle2,
  Info,
  Save,
  RotateCcw
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [minioEndpoint, setMinioEndpoint] = useState('http://localhost:9000');
  const [minioBucket, setMinioBucket] = useState('datatether-local-lake');
  const [enforceConsentChecks, setEnforceConsentChecks] = useState(true);
  const [strictKAnonymity, setStrictKAnonymity] = useState(true);
  const [kThreshold, setKThreshold] = useState('5');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-heading)' }}>
              System Connections & Governance Rulesets
            </h2>
            <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
              CONFIG REPOSITORY
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Manage storage clusters, AI service integrations, classification parameters, and automated policy gates.
          </p>
        </div>

        {savedSuccess && (
          <div className="badge badge-green" style={{ fontSize: '12px', padding: '6px 12px' }}>
            <CheckCircle2 size={13} /> Settings saved to local state
          </div>
        )}
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Section 1: Storage Connections */}
        <div className="terminal-card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <HardDrive size={14} style={{ color: 'var(--accent-cyan)' }} />
                <span>Storage System Connections</span>
              </div>
              <div className="card-subtitle">Local MinIO cluster and cloud storage endpoints</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Local MinIO */}
            <div style={{ padding: '14px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-active)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-bright)', fontSize: '13px' }}>
                    Local MinIO S3-Compatible Storage
                  </span>
                  <span className="badge badge-green" style={{ fontSize: '9.5px' }}>CONNECTED</span>
                  <span className="badge badge-neutral" style={{ fontSize: '9.5px' }}>LOCAL DEV MOCK</span>
                </div>
              </div>

              <div className="grid-2" style={{ marginTop: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Endpoint URL</label>
                  <input
                    type="text"
                    className="input-field"
                    value={minioEndpoint}
                    onChange={(e) => setMinioEndpoint(e.target.value)}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Default Bucket</label>
                  <input
                    type="text"
                    className="input-field"
                    value={minioBucket}
                    onChange={(e) => setMinioBucket(e.target.value)}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.4' }}>
                <em>Note: Acts as a local development connection placeholder until the Python FastAPI backend and local MinIO Docker container are spun up.</em>
              </div>
            </div>

            {/* AWS S3 Disconnected */}
            <div style={{ padding: '14px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', opacity: 0.85 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-bright)', fontSize: '13px' }}>
                    AWS S3 Corporate Data Lake
                  </span>
                  <span className="badge badge-neutral" style={{ fontSize: '9.5px' }}>NOT CONNECTED</span>
                </div>
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '6px' }}>
                Production cloud connection is disabled in local development mode. No credentials or IAM roles configured.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: AI Configuration (Meta Muse Spark) */}
        <div className="terminal-card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Bot size={14} style={{ color: 'var(--accent-cyan)' }} />
                <span>Meta AI Integration (Meta Muse Spark)</span>
              </div>
              <div className="card-subtitle">AI reasoning engine for evidence synthesis and risk explanation</div>
            </div>
            <span className="badge badge-amber">API ACCESS PENDING</span>
          </div>

          <div style={{ padding: '14px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Info size={14} style={{ color: 'var(--accent-amber)' }} />
              <strong style={{ fontSize: '13px', color: 'var(--accent-amber)' }}>
                Not connected — API access pending.
              </strong>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-bright)', lineHeight: '1.5' }}>
              The platform is currently operating in <strong>Demonstration / Heuristic Mode</strong> using synthetic mock investigation results. When Meta Muse Spark API keys are provided by the hackathon committee, reasoning chains will execute live against the endpoint.
            </p>
          </div>
        </div>

        {/* Section 3: Governance Policy Rulesets */}
        <div className="terminal-card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Shield size={14} style={{ color: 'var(--accent-cyan)' }} />
                <span>Automated Governance Rulesets</span>
              </div>
              <div className="card-subtitle">Policy enforcement gates executed during data combination and usage</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12.5px', color: 'var(--text-bright)' }}>
              <input
                type="checkbox"
                checked={enforceConsentChecks}
                onChange={(e) => setEnforceConsentChecks(e.target.checked)}
                style={{ accentColor: 'var(--accent-cyan)' }}
              />
              <span><strong>Enforce Strict Negative Covenant Matching:</strong> Automatically block operations where target purpose matches a restricted purpose in the Data Passport.</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12.5px', color: 'var(--text-bright)' }}>
              <input
                type="checkbox"
                checked={strictKAnonymity}
                onChange={(e) => setStrictKAnonymity(e.target.checked)}
                style={{ accentColor: 'var(--accent-cyan)' }}
              />
              <span><strong>Require Quasi-Identifier Anonymization:</strong> Mandate minimum k-anonymity for multi-source combinations containing location or demographic attributes.</span>
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
              <span className="input-label">Minimum k-anonymity threshold:</span>
              <input
                type="number"
                className="input-field"
                value={kThreshold}
                onChange={(e) => setKThreshold(e.target.value)}
                style={{ width: '80px', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" className="btn btn-primary">
            <Save size={13} />
            <span>Save Configuration</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setMinioEndpoint('http://localhost:9000');
              setMinioBucket('datatether-local-lake');
              setEnforceConsentChecks(true);
              setStrictKAnonymity(true);
              setKThreshold('5');
            }}
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>
        </div>
      </form>
    </div>
  );
};
